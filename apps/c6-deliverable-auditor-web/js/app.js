/*! app.js — 界面编排：把「清单 → 文件清单 → 规则审计 → AI 诊断」串成一条可复跑的流水线。
 * 只依赖 audit-core.js（离线、确定性）；AI 部分在 app-ai.js，未配置 key 时自动降级为提示而不是假结果。
 * 文件内容从不离开浏览器：这里只读 File 的 name / webkitRelativePath / size。
 */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var LS_KEY = 'c6-auditor-cfg-v1';
  var C6APP = { state: { inventory: [], report: null, source: '', cfg: null, chat: [] }, $: $ };

  var VERDICT_LABEL = { PASS: '命中', PASS_FUZZY: '模糊命中', EMPTY: '空文件', MISSING: '未找到' };

  function humanBytes(n) {
    if (n === -1 || n === undefined || n === null) { return '读取失败'; }
    if (n < 1024) { return n + ' B'; }
    if (n < 1048576) { return (n / 1024).toFixed(1) + ' KB'; }
    return (n / 1048576).toFixed(2) + ' MB';
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) { e.className = cls; }
    if (text !== undefined && text !== null) { e.textContent = String(text); }
    return e;
  }
  function banner(text, kind) {
    var b = $('banner');
    b.hidden = false;
    b.className = 'banner' + (kind ? ' ' + kind : '');
    $('banner-text').textContent = text;
  }
  function status(id, text, kind) {
    var s = $(id);
    if (!s) { return; }
    s.textContent = text || '';
    s.className = 'status' + (kind ? ' ' + kind : '');
  }
  function download(name, text, mime) {
    var blob = new Blob([text], { type: (mime || 'text/plain') + ';charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    var ta = el('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } finally { ta.remove(); }
    return Promise.resolve();
  }

  /* ---------- 文件清单来源 ---------- */
  function dedupe(list) {
    var seen = {}, out = [];
    list.forEach(function (it) {
      var k = it.rel;
      if (!seen[k]) { seen[k] = 1; out.push(it); }
    });
    out.sort(function (a, b) { return a.rel < b.rel ? -1 : (a.rel > b.rel ? 1 : 0); });
    return out;
  }
  function fromFileList(list) {
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var f = list[i];
      var rel = f.webkitRelativePath || f.name;
      if (!rel) { continue; }
      out.push({ rel: rel, size: typeof f.size === 'number' ? f.size : -1 });
    }
    return dedupe(out);
  }
  /* 拖拽目录：webkitGetAsEntry 递归；Chrome/Edge 支持。 */
  function readEntry(entry, prefix, out) {
    return new Promise(function (resolve) {
      if (!entry) { return resolve(); }
      if (entry.isFile) {
        entry.file(function (f) { out.push({ rel: prefix + entry.name, size: f.size }); resolve(); },
                   function () { resolve(); });
      } else if (entry.isDirectory) {
        var reader = entry.createReader(), acc = [];
        var batch = function () {
          reader.readEntries(function (ents) {
            if (!ents.length) {
              Promise.all(acc.map(function (e) { return readEntry(e, prefix + entry.name + '/', out); }))
                .then(function () { resolve(); });
              return;
            }
            acc = acc.concat([].slice.call(ents));
            batch();
          }, function () { resolve(); });
        };
        batch();
      } else { resolve(); }
    });
  }
  function fromDataTransfer(dt) {
    var out = [], jobs = [];
    if (dt.items && dt.items.length && dt.items[0].webkitGetAsEntry) {
      for (var i = 0; i < dt.items.length; i++) {
        var e = dt.items[i].webkitGetAsEntry();
        if (e) { jobs.push(readEntry(e, '', out)); }
      }
    } else if (dt.files) {
      return Promise.resolve(fromFileList(dt.files));
    }
    return Promise.all(jobs).then(function () { return dedupe(out); });
  }

  function setInventory(list, source) {
    C6APP.state.inventory = list;
    C6APP.state.source = source || '';
    var box = $('inventory-box'), tb = $('inventory-body');
    tb.textContent = '';
    var shown = Math.min(list.length, 500);
    for (var i = 0; i < shown; i++) {
      var tr = el('tr');
      tr.appendChild(el('td', null, list[i].rel));
      tr.appendChild(el('td', 'num', humanBytes(list[i].size)));
      tb.appendChild(tr);
    }
    if (list.length > shown) {
      var tr2 = el('tr');
      tr2.appendChild(el('td', null, '（其余 ' + (list.length - shown) + ' 行未显示，导出 JSON 可见全部）'));
      tr2.appendChild(el('td', 'num', ''));
      tb.appendChild(tr2);
    }
    box.hidden = list.length === 0;
    $('inventory-count').textContent = String(list.length);
    var empty = list.filter(function (x) { return x.size === 0; }).length;
    $('inventory-info').textContent = '已载入 ' + list.length + ' 个文件'
      + (source ? '（来源：' + source + '）' : '')
      + (empty ? '；其中 ' + empty + ' 个是 0 字节空文件' : '') + '。';
    runAudit();
  }

  /* ---------- 审计与渲染 ---------- */
  function runAudit() {
    if (!C6APP.state.inventory.length) {
      status('audit-status', '请先在②选择交付物，或点「载入内置样例」', 'bad');
      return null;
    }
    var spec = $('spec').value || '';
    var minBytes = Math.max(1, Number($('min-bytes').value) || 1);
    var r = AuditCore.audit(C6APP.state.inventory, spec, minBytes, C6APP.state.source || '（浏览器选择）');
    C6APP.state.report = r;
    $('report-md').value = AuditCore.renderMarkdown(r);
    $('md-box').hidden = false;
    renderReport(r);
    return r;
  }

  function renderReport(r) {
    var sum = $('audit-summary');
    sum.textContent = '';
    sum.className = 'summary ' + (r.ready ? 'ready' : 'notready');
    sum.appendChild(el('div', null, r.ready
      ? '✅ 结论：READY —— ' + r.required + ' 项要求全部命中且非空，可以提交。'
      : '⛔ 结论：NOT READY —— ' + (r.required - r.passed) + ' 项要求未达标，现在提交会被扣分。'));
    var m = el('div', 'metrics');
    m.appendChild(el('div', null, '')).innerHTML = '';
    var items = [['通过', r.passed + ' / ' + r.required], ['文件数', String(r.file_count)],
                 ['空文件阈值', r.min_bytes + ' B'], ['风险项', String(r.risks.length)]];
    m.textContent = '';
    items.forEach(function (kv) {
      var d = el('div');
      d.appendChild(el('b', null, kv[1]));
      d.appendChild(el('div', 'tiny', kv[0]));
      m.appendChild(d);
    });
    sum.appendChild(m);

    var tb = $('verdict-body');
    tb.textContent = '';
    r.requirements.forEach(function (q, i) {
      var tr = el('tr');
      tr.appendChild(el('td', 'num', String(i + 1)));
      tr.appendChild(el('td', null, q.requirement));
      var vd = el('td');
      vd.appendChild(el('span', 'verdict v-' + q.verdict, VERDICT_LABEL[q.verdict] || q.verdict));
      tr.appendChild(vd);
      var names = el('td');
      if (!q.matches.length) { names.textContent = '—'; }
      else {
        q.matches.forEach(function (mm, k) {
          if (k) { names.appendChild(document.createElement('br')); }
          names.appendChild(el('code', null, mm.rel));
          if (mm.match === 'fuzzy') { names.appendChild(el('span', 'tiny', '（模糊）')); }
        });
      }
      tr.appendChild(names);
      var sz = el('td', 'num');
      if (!q.matches.length) { sz.textContent = '—'; }
      else { sz.innerHTML = q.matches.map(function (mm) { return String(mm.size); }).join('<br>'); }
      tr.appendChild(sz);
      tb.appendChild(tr);
    });

    var rb = $('risk-box'), rl = $('risk-list');
    rl.textContent = '';
    rb.hidden = r.risks.length === 0;
    r.risks.forEach(function (x) {
      var li = el('li', x.level || 'info');
      li.appendChild(el('code', null, x.file));
      li.appendChild(el('span', null, ' — ' + x.note));
      rl.appendChild(li);
    });
    status('audit-status', r.ready ? 'READY（退出码 0）' : 'NOT READY（退出码 1）', r.ready ? 'good' : 'bad');
  }

  /* ---------- 设置（Provider / 模型 / Key：只在 localStorage） ---------- */
  function loadCfg() {
    var raw = null;
    try { raw = JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch (e) { raw = null; }
    var pid = (raw && raw.provider) || 'demo';
    var p = AIClient.PROVIDERS[pid] ? pid : 'demo';
    var cfg = raw || {};
    cfg.provider = p;
    cfg.baseUrl = cfg.baseUrl || AIClient.PROVIDERS[p].defaultBase;
    cfg.model = cfg.model || AIClient.PROVIDERS[p].defaultModel;
    cfg.key = cfg.key || '';
    C6APP.state.cfg = cfg;
    return cfg;
  }
  function saveCfg(cfg) {
    C6APP.state.cfg = cfg;
    try { localStorage.setItem(LS_KEY, JSON.stringify(cfg)); } catch (e) { /* 隐私模式：只影响本机持久化 */ }
  }
  function fillProviderSelect() {
    var sel = $('provider');
    sel.textContent = '';
    Object.keys(AIClient.PROVIDERS).forEach(function (k) {
      var o = el('option', null, AIClient.PROVIDERS[k].label);
      o.value = k;
      sel.appendChild(o);
    });
  }
  function syncCfgToForm() {
    var cfg = C6APP.state.cfg;
    $('provider').value = cfg.provider;
    $('base-url').value = cfg.baseUrl;
    $('model').value = cfg.model;
    $('key').value = cfg.key;
    var p = AIClient.PROVIDERS[cfg.provider];
    $('provider-note').textContent = p.needsKey
      ? '该服务需要自备 API Key。Key 仅保存在本机浏览器 localStorage，页面源码与仓库里都没有任何密钥。'
      : '该服务为免密演示端点，可能限流或不可用；生产使用请换成自备 Key 的服务。';
  }
  function readFormCfg() {
    return { provider: $('provider').value, baseUrl: $('base-url').value.trim(),
             model: $('model').value.trim(), key: $('key').value };
  }

  /* ---------- 内置样例（离线可演示：不调用 AI） ---------- */
  function loadSample() {
    var s = window.SAMPLE_DATA;
    if (!s) { banner('未找到内置样例文件 sample/sample-data.js', 'warn'); return; }
    $('spec').value = s.spec;
    $('challenge-text').value = s.challenge_text || '';
    setInventory(s.inventory.slice(), s.label || '内置样例');
    banner('已载入内置样例：这是一个「故意做坏」的交付目录（含 0 字节文件、放错层级的文件、临时文件），'
      + '目的是让你看到工具真的会报错，而不是永远 READY。换成你自己的文件夹再跑一次即可。', 'ok');
  }

  C6APP.$ = $; C6APP.banner = banner; C6APP.status = status; C6APP.download = download;
  C6APP.copyText = copyText; C6APP.runAudit = runAudit; C6APP.loadSample = loadSample;
  C6APP.humanBytes = humanBytes; C6APP.loadCfg = loadCfg; C6APP.saveCfg = saveCfg;
  C6APP.syncCfgToForm = syncCfgToForm; C6APP.readFormCfg = readFormCfg;
  window.C6APP = C6APP;

  /* ---------- 事件绑定 ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    fillProviderSelect();
    syncCfgToForm();

    $('btn-folder').addEventListener('click', function () { $('folder-input').click(); });
    $('btn-files').addEventListener('click', function () { $('files-input').click(); });
    $('folder-input').addEventListener('change', function (e) {
      setInventory(fromFileList(e.target.files), '文件夹选择（' + (e.target.files[0] && e.target.files[0].webkitRelativePath || '').split('/')[0] + '）');
    });
    $('files-input').addEventListener('change', function (e) { setInventory(fromFileList(e.target.files), '多文件选择'); });

    var dz = $('dropzone');
    ['dragenter', 'dragover'].forEach(function (ev) {
      dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add('over'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove('over'); });
    });
    dz.addEventListener('drop', function (e) {
      fromDataTransfer(e.dataTransfer).then(function (list) {
        if (!list.length) { banner('拖入的内容里没有可读文件（目录拖拽需要 Chrome/Edge）。', 'warn'); return; }
        setInventory(list, '拖拽载入');
      });
    });

    $('btn-sample').addEventListener('click', loadSample);
    $('btn-run').addEventListener('click', runAudit);
    $('spec').addEventListener('change', runAudit);
    $('min-bytes').addEventListener('change', runAudit);

    $('btn-json').addEventListener('click', function () {
      var r = C6APP.state.report;
      if (!r) { status('audit-status', '还没有报告可导出', 'bad'); return; }
      download('c6-audit-report.json', JSON.stringify(r, null, 2) + '\n', 'application/json');
    });
    $('btn-md').addEventListener('click', function () {
      if (!C6APP.state.report) { status('audit-status', '还没有报告可导出', 'bad'); return; }
      download('c6-audit-report.md', $('report-md').value + '\n', 'text/markdown');
    });
    $('btn-copy').addEventListener('click', function () {
      if (!C6APP.state.report) { status('audit-status', '还没有报告可复制', 'bad'); return; }
      copyText($('report-md').value).then(function () { status('audit-status', '报告已复制到剪贴板', 'good'); });
    });

    $('provider').addEventListener('change', function () {
      var p = AIClient.PROVIDERS[$('provider').value];
      $('base-url').value = p.defaultBase;
      $('model').value = p.defaultModel;
      $('provider-note').textContent = p.needsKey ? '该服务需要自备 API Key（只存本机浏览器）。' : '该服务为免密演示端点，可能限流。';
    });
    $('btn-save').addEventListener('click', function () {
      saveCfg(readFormCfg());
      status('ai-status', '设置已保存在本机浏览器', 'good');
    });
    $('btn-clear').addEventListener('click', function () {
      try { localStorage.removeItem(LS_KEY); } catch (e) { /* 忽略 */ }
      syncCfgToForm();
      status('ai-status', '本机设置已清除（含 API Key）', 'good');
    });

    if (/\bsample=1\b/.test(location.search)) { loadSample(); }
    if (window.C6APP.initAI) { window.C6APP.initAI(); }
  });
})();
