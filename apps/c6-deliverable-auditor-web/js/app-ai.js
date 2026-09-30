/*! app-ai.js — AI 侧功能：清单生成、诊断与整改计划、多轮追问、连接自检。
 * 分工：确定性判定（audit-core.js）负责「有没有、空不空」；AI 只负责规则做不到的事，
 * 即读懂平台要求原文、把报告翻译成整改顺序。AI 失败时只显示错误，绝不回填假结论。
 */
(function () {
  'use strict';
  var A = window.C6APP;
  if (!A) { return; }
  var $ = A.$;

  function cfg() { return A.state.cfg; }
  function needsKey(c) { var p = AIClient.PROVIDERS[c.provider]; return !!(p && p.needsKey && !c.key); }
  function block(title, body) {
    var d = document.createElement('div');
    d.className = 'block';
    var h = document.createElement('h4');
    h.textContent = title;
    d.appendChild(h);
    if (typeof body === 'string') {
      var p = document.createElement('p');
      p.textContent = body;
      d.appendChild(p);
    } else if (body) { d.appendChild(body); }
    return d;
  }
  function list(items, cls) {
    var ul = document.createElement('ul');
    ul.className = cls || 'risks';
    (items || []).forEach(function (t) {
      var li = document.createElement('li');
      li.textContent = typeof t === 'string' ? t : JSON.stringify(t);
      ul.appendChild(li);
    });
    return ul;
  }
  function pre(text) {
    var e = document.createElement('pre');
    e.textContent = text;
    return e;
  }
  function reportBrief() {
    var r = A.state.report;
    if (!r) { return null; }
    return { dir: r.dir, spec: r.spec, ready: r.ready, passed: r.passed + '/' + r.required,
             file_count: r.file_count, requirements: r.requirements, risks: r.risks };
  }

  function renderDiag(obj, raw) {
    var out = $('diag-out');
    out.textContent = '';
    if (!obj) {
      out.appendChild(block('模型未返回可解析的 JSON，以下为原文（未改动）', pre(raw || '（空响应）')));
      return;
    }
    if (obj.verdict) { out.appendChild(block('结论', String(obj.verdict))); }
    if (obj.blockers && obj.blockers.length) {
      var d = document.createElement('div');
      obj.blockers.forEach(function (b) {
        var t = [b.requirement, '判定：' + (b.verdict || '?'), b.why, '怎么改：' + (b.fix || '')].join(' · ');
        d.appendChild(block('必须修：' + (b.requirement || ''), t));
      });
      out.appendChild(d);
    } else {
      out.appendChild(block('必须修的问题', '报告里没有 MISSING/EMPTY，规则层面可以提交。'));
    }
    if (obj.riskNotes && obj.riskNotes.length) {
      out.appendChild(block('仍可能被扣分的地方',
        list(obj.riskNotes.map(function (x) { return (x.file ? x.file + ' — ' : '') + (x.advice || ''); }))));
    }
    if (obj.commands && obj.commands.length) { out.appendChild(block('复跑命令', list(obj.commands))); }
    if (obj.checklist && obj.checklist.length) { out.appendChild(block('提交前自检清单', list(obj.checklist))); }
  }

  function pushChat(who, text) {
    A.state.chat.push({ role: who === 'me' ? 'user' : 'assistant', text: text });
    var box = $('chat-out');
    var t = document.createElement('div');
    t.className = 'turn' + (who === 'me' ? ' me' : '');
    t.textContent = (who === 'me' ? '我：' : 'AI：') + text;
    box.appendChild(t);
    box.scrollTop = box.scrollHeight;
  }

  function guard(statusId) {
    var c = cfg();
    if (needsKey(c)) {
      A.status(statusId, '当前模型服务需要 API Key：请到「设置」填写后再试（规则审计不受影响）', 'bad');
      return null;
    }
    return c;
  }

  function genSpec() {
    var c = guard('gen-status');
    if (!c) { return; }
    var text = $('challenge-text').value;
    if (!text.trim()) { A.status('gen-status', '请先粘贴挑战要求原文', 'bad'); return; }
    var names = A.state.inventory.map(function (x) { return x.rel; });
    A.status('gen-status', '调用模型中…', '');
    A.state.aiCalls = (A.state.aiCalls || 0) + 1;
    AIClient.chat(c.provider, c, AIClient.specMessages(text, names), AIClient.SYSTEM_PLAN)
      .then(function (res) {
        var obj = AIClient.extractJson(res.text);
        if (obj && obj.spec) {
          $('spec').value = obj.spec;
          A.status('gen-status', '已生成清单：' + obj.spec, 'good');
          if (obj.reasons && obj.reasons.length) {
            var notes = obj.reasons.map(function (x) { return x.pattern + '：' + x.why; })
              .concat(obj.notes || []).join('；');
            A.banner('AI 生成的清单理由：' + notes + '（清单是否合适由你判断，工具只负责判定命中）', 'ok');
          }
          A.runAudit();
        } else {
          A.status('gen-status', '模型没有返回结构化清单，原文见下方', 'bad');
          $('diag-out').textContent = '';
          $('diag-out').appendChild(block('模型原文（未解析）', pre(res.text || '（空）')));
        }
      })
      .catch(function (e) { A.status('gen-status', '调用失败：' + e.message, 'bad'); });
  }

  function diagnose() {
    var c = guard('diag-status');
    if (!c) { return; }
    var r = A.state.report;
    if (!r) { A.status('diag-status', '请先完成③的本地规则审计', 'bad'); return; }
    A.status('diag-status', '调用模型中…', '');
    A.state.aiCalls = (A.state.aiCalls || 0) + 1;
    AIClient.chat(c.provider, c, AIClient.diagnoseMessages(r), AIClient.SYSTEM_DIAGNOSE)
      .then(function (res) {
        var obj = AIClient.extractJson(res.text);
        renderDiag(obj, res.text);
        A.state.chat.push({ role: 'user', text: AIClient.diagnoseMessages(r)[0].content });
        A.state.chat.push({ role: 'assistant', text: res.text || '' });
        $('followup-box').hidden = false;
        A.status('diag-status', obj ? '已生成诊断' : '模型返回非 JSON，已按原文展示', obj ? 'good' : 'bad');
      })
      .catch(function (e) { A.status('diag-status', '调用失败：' + e.message, 'bad'); });
  }

  function followup() {
    var c = guard('diag-status');
    if (!c) { return; }
    var q = $('followup-q').value.trim();
    if (!q) { return; }
    $('followup-q').value = '';
    pushChat('me', q);
    var brief = reportBrief();
    var msgs = [{ role: 'user', content: '审计报告 JSON：\n' + JSON.stringify(brief, null, 2) }]
      .concat(A.state.chat.filter(function (t) { return t.role !== 'system'; })
        .map(function (t) { return { role: t.role, content: t.text }; }));
    A.status('diag-status', '调用模型中…', '');
    A.state.aiCalls = (A.state.aiCalls || 0) + 1;
    AIClient.chat(c.provider, c, msgs, AIClient.SYSTEM_DIAGNOSE)
      .then(function (res) {
        pushChat('ai', res.text || '（空响应）');
        A.status('diag-status', '已回复', 'good');
      })
      .catch(function (e) { A.status('diag-status', '调用失败：' + e.message, 'bad'); });
  }

  function probe() {
    var c = cfg();
    A.status('ai-status', '正在真实调用一次…', '');
    A.state.aiCalls = (A.state.aiCalls || 0) + 1;
    AIClient.probe(c.provider, c).then(function (r) {
      if (r.ok) { A.status('ai-status', '连通正常，模型回复：' + (r.sample || '（空）'), 'good'); }
      else { A.status('ai-status', '不通：' + r.error, 'bad'); }
    });
  }

  window.C6APP.initAI = function () {
    $('gen-spec').addEventListener('click', genSpec);
    $('btn-diagnose').addEventListener('click', diagnose);
    $('btn-followup').addEventListener('click', followup);
    $('btn-probe').addEventListener('click', probe);
    $('followup-q').addEventListener('keydown', function (e) { if (e.key === 'Enter') { followup(); } });
  };
})();
