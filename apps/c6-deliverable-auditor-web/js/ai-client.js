/*! ai-client.js — 模型接入层（可替换适配器 + 结构化输出解析 + 三条业务提示词）
 *
 * 安全约束：API Key 只从 localStorage 取、只在 fetch 头里用，绝不写进源码、绝不进仓库。
 * 这是静态前端，浏览器直连模型厂商；README 里如实写明「key 存在本机浏览器」这一限制。
 * 说明：Anthropic 的浏览器直连需要 anthropic-dangerous-direct-browser-access 头（官方约定）。
 */
(function (global, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { global.AIClient = factory(); }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function trimSlash(s) { return String(s || '').replace(/\/+$/, ''); }

  var PROVIDERS = {
    openai: {
      label: 'OpenAI 兼容（OpenAI / DeepSeek / 智谱 / 通义 / 本地 vLLM 等）',
      needsKey: true,
      defaultBase: 'https://api.openai.com/v1',
      defaultModel: 'gpt-4o-mini',
      build: function (cfg, messages, system) {
        return {
          url: trimSlash(cfg.baseUrl) + '/chat/completions',
          init: {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + cfg.key },
            body: JSON.stringify({
              model: cfg.model,
              messages: [{ role: 'system', content: system }].concat(messages),
              temperature: 0.2
            })
          }
        };
      },
      parse: function (json) {
        var c = json && json.choices && json.choices[0];
        return (c && c.message && c.message.content) || '';
      }
    },
    anthropic: {
      label: 'Anthropic Claude',
      needsKey: true,
      defaultBase: 'https://api.anthropic.com/v1',
      defaultModel: 'claude-3-5-haiku-latest',
      build: function (cfg, messages, system) {
        return {
          url: trimSlash(cfg.baseUrl) + '/messages',
          init: {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': cfg.key,
              'anthropic-version': '2023-06-01',
              'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify({
              model: cfg.model,
              max_tokens: 2048,
              system: system,
              messages: messages
            })
          }
        };
      },
      parse: function (json) {
        var parts = (json && json.content) || [];
        return parts.map(function (p) { return p.text || ''; }).join('');
      }
    },
    demo: {
      label: '免密公共演示端点（可能限流，仅用于试用）',
      needsKey: false,
      defaultBase: 'https://text.pollinations.ai',
      defaultModel: 'openai',
      build: function (cfg, messages, system) {
        return {
          url: 'https://text.pollinations.ai/openai',
          init: {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: cfg.model || 'openai',
              messages: [{ role: 'system', content: system }].concat(messages),
              temperature: 0.2
            })
          }
        };
      },
      parse: function (json) {
        var c = json && json.choices && json.choices[0];
        return (c && c.message && c.message.content) || '';
      }
    }
  };

  /* 真实调用。任何失败都原样抛出，UI 层只展示、不伪造结果。 */
  function chat(providerId, cfg, messages, system, fetchImpl) {
    var p = PROVIDERS[providerId];
    if (!p) { return Promise.reject(new Error('未知的模型服务：' + providerId)); }
    if (p.needsKey && !cfg.key) { return Promise.reject(new Error('该服务需要 API Key，请先在「设置」里填写')); }
    var req = p.build(cfg, messages, system);
    var f = fetchImpl || (typeof fetch !== 'undefined' ? fetch : null);
    if (!f) { return Promise.reject(new Error('当前环境没有 fetch')); }
    return f(req.url, req.init).then(function (res) {
      return res.text().then(function (text) {
        if (!res.ok) {
          throw new Error('HTTP ' + res.status + '：' + text.slice(0, 400));
        }
        var json;
        try { json = JSON.parse(text); } catch (e) { json = null; }
        if (!json) { return { text: text, raw: text }; }
        return { text: p.parse(json), raw: text };
      });
    });
  }

  /* 模型常把 JSON 裹在 ```json 里，或前后带解释；这里做一次宽容提取，失败返回 null。 */
  function extractJson(text) {
    if (!text) { return null; }
    var fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    var cand = fenced ? fenced[1] : text;
    try { return JSON.parse(cand.trim()); } catch (e) { /* 继续尝试括号扫描 */ }
    var start = -1, depth = 0, inStr = false, esc = false;
    for (var i = 0; i < cand.length; i++) {
      var ch = cand.charAt(i);
      if (inStr) {
        if (esc) { esc = false; }
        else if (ch === '\\') { esc = true; }
        else if (ch === '"') { inStr = false; }
        continue;
      }
      if (ch === '"') { inStr = true; continue; }
      if (ch === '{' || ch === '[') { if (start < 0) { start = i; } depth++; }
      else if (ch === '}' || ch === ']') {
        depth--;
        if (depth === 0 && start >= 0) {
          try { return JSON.parse(cand.slice(start, i + 1)); } catch (e) { start = -1; depth = 0; }
        }
      }
    }
    return null;
  }

  var SYSTEM_PLAN = [
    '你是挑战平台的交付物清单专家。平台把「要求清单」写成逗号分隔的通配模式串，',
    '例如 *app链接*,*demo*,*repo链接*,*AI日志* 。',
    '规则：模式串大小写不敏感；含 * 或 ? 时按通配匹配文件名，未命中则用去掉通配后的子串做模糊匹配；',
    '命中文件若全是空文件则判 EMPTY，完全没有命中文件则判 MISSING。',
    '你的任务：读用户的挑战要求原文与（可选的）已准备文件名，产出可直接填入平台的清单串。',
    '只输出 JSON，不要解释文字，结构：{"spec":"...","reasons":[{"pattern":"...","why":"..."}],"notes":["..."]}',
    'notes 里指明容易被判 MISSING 的命名风险（如中文关键词 vs 英文文件名、把交付物放进子目录）。'
  ].join('\n');

  var SYSTEM_DIAGNOSE = [
    '你是交付物提交前的审查员，读者是即将提交作业的学生。',
    '输入是本地规则内核给出的确定性审计报告（PASS/PASS_FUZZY/EMPTY/MISSING 与风险项），',
    '你的价值在于「解读与整改」，不要重算命中结果，也不要编造报告里没有的文件。',
    '只输出 JSON，结构：',
    '{"verdict":"一句话结论","blockers":[{"requirement":"...","verdict":"...","why":"...","fix":"..."}],',
    '"riskNotes":[{"file":"...","advice":"..."}],"commands":["可直接粘贴的复跑命令"],',
    '"checklist":["提交前自检项"]}',
    '若报告已 READY，blockers 给空数组，把重点放在「提交后仍可能被扣分的地方」。'
  ].join('\n');

  function specMessages(challengeText, fileNames) {
    var listing = (fileNames && fileNames.length)
      ? '已准备的文件名（前 %d 个）：\n'.replace('%d', Math.min(fileNames.length, 80)) + fileNames.slice(0, 80).join('\n')
      : '（暂无已准备文件清单）';
    return [{ role: 'user', content: '挑战要求原文：\n' + (challengeText || '（未提供）') + '\n\n' + listing }];
  }

  function diagnoseMessages(report) {
    var brief = {
      dir: report.dir,
      spec: report.spec,
      ready: report.ready,
      passed: report.passed + '/' + report.required,
      file_count: report.file_count,
      requirements: report.requirements,
      risks: report.risks
    };
    return [{ role: 'user', content: '审计报告 JSON：\n' + JSON.stringify(brief, null, 2) }];
  }

  /* 连接自检：真发一次最小请求，成功/失败都如实上报，不做假绿。 */
  function probe(providerId, cfg, fetchImpl) {
    return chat(providerId, cfg, [{ role: 'user', content: '只回复两个字：可用' }], '你是连通性自检端点。', fetchImpl)
      .then(function (r) { return { ok: true, sample: (r.text || '').trim().slice(0, 40) }; })
      .catch(function (e) { return { ok: false, error: e.message }; });
  }

  return {
    PROVIDERS: PROVIDERS,
    chat: chat,
    probe: probe,
    extractJson: extractJson,
    specMessages: specMessages,
    diagnoseMessages: diagnoseMessages,
    SYSTEM_PLAN: SYSTEM_PLAN,
    SYSTEM_DIAGNOSE: SYSTEM_DIAGNOSE
  };
});
