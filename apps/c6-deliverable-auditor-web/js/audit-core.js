/*! audit-core.js — 交付物审计器的判定内核（skills/challenge-deliverable-auditor/scripts/audit.py 的 JS 移植）
 *
 * 设计要点：内核不碰文件系统，只吃「文件清单」(inventory)。浏览器里清单来自
 * <input webkitdirectory> 或拖拽（File/FileSystemEntry），Node 里清单来自 fs 扫描，
 * 两者共用同一套判定规则 —— 这样「规则内核」不必为浏览器重写一遍，也让
 * 浏览器结果与命令行结果可被逐字段比对（见 tests/parity）。
 *
 * 规则来源：references/spec-format.md。纯函数、无网络、无第三方依赖。
 * 结论语义（与 Python 版一致）：ready = 既无 MISSING 也无 EMPTY；PASS_FUZZY 计入满足。
 * 许可证：MIT（见仓库根 LICENSE）。
 */
(function (global, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { global.AuditCore = factory(); }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SKIP_DIRS = ['.git', '.github', '.idea', '.vscode', '__pycache__', 'node_modules', '.parts', '.texparse'];
  var TEMP_PREFIX = ['~$', '.~', '._'];
  var TEMP_SUFFIX = ['.tmp', '.bak', '.swp', '.crdownload', '.part'];
  var PLACEHOLDER = ['untitled', '新建文本文档', '无标题', '新建 文本文档'];
  var FULLWIDTH = /[\uFF01-\uFF5E]/;

  function norm(text) {
    return String(text === undefined || text === null ? '' : text)
      .trim().replace(/^["']+/, '').replace(/["']+$/, '').toLowerCase();
  }

  /* 平台清单形如 '*skill说明*,*.skill,*教学说明*'，中英文逗号/分号都算分隔符。 */
  function splitSpec(spec) {
    return String(spec || '').split(/[,;\uFF0C\uFF1B]/).map(norm).filter(Boolean);
  }

  function globToRegExp(pattern) {
    var out = '';
    for (var i = 0; i < pattern.length; i++) {
      var ch = pattern.charAt(i);
      if (ch === '*') { out += '[\\s\\S]*'; }
      else if (ch === '?') { out += '[\\s\\S]'; }
      else { out += ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
    }
    return new RegExp('^' + out + '$');
  }

  /* 返回 'exact' | 'fuzzy' | null。glob 未命中时退化为「去通配后的子串」模糊匹配。 */
  function matchKind(pattern, name) {
    var n = String(name).toLowerCase();
    if (pattern.indexOf('*') >= 0 || pattern.indexOf('?') >= 0) {
      if (globToRegExp(pattern).test(n)) { return 'exact'; }
      var core = pattern.split('*').join('').split('?').join('');
      if (core && n.indexOf(core) >= 0) { return 'fuzzy'; }
      return null;
    }
    if (n === pattern) { return 'exact'; }
    if (pattern && n.indexOf(pattern) >= 0) { return 'fuzzy'; }
    return null;
  }

  function sortByRel(items) {
    return items.slice().sort(function (a, b) {
      return a.rel < b.rel ? -1 : (a.rel > b.rel ? 1 : 0);
    });
  }

  /* 浏览器端拿到的是 File / FileSystemEntry（只有 rel + size），Node 端拿到的是 fs 扫描结果（含 name）。
     这里统一补齐 name（= rel 的末段）：否则 matchKind 会把 undefined 当文件名，浏览器里每一项都会被
     判成 MISSING。tests/run-parity.ps1 第 4 项「剥掉 name 再审计」就是钉住这条回归的。 */
  function baseName(rel) {
    var s = String(rel === undefined || rel === null ? '' : rel);
    var i = s.lastIndexOf('/');
    return i >= 0 ? s.slice(i + 1) : s;
  }

  /* inventory: [{ name, rel, size }]；name 缺省时由 rel 推导，保证浏览器/Node 两条路径同结果 */
  function audit(inventory, spec, minBytes, displayDir) {
    if (minBytes === undefined || minBytes === null) { minBytes = 1; }
    minBytes = Number(minBytes);
    var items = sortByRel(inventory || []).map(function (it) {
      var src = it || {};
      var name = (src.name === undefined || src.name === null || src.name === '') ? baseName(src.rel) : String(src.name);
      var rel = String(src.rel === undefined || src.rel === null ? '' : src.rel);
      return { name: name, rel: rel, size: Number(src.size) };
    });

    var results = splitSpec(spec).map(function (pattern) {
      var hits = [];
      items.forEach(function (it) {
        var kind = matchKind(pattern, it.name);
        if (kind) { hits.push({ rel: it.rel, size: it.size, match: kind }); }
      });
      var usable = hits.filter(function (h) { return h.size >= minBytes; });
      var verdict;
      if (usable.length) {
        verdict = usable.some(function (h) { return h.match === 'exact'; }) ? 'PASS' : 'PASS_FUZZY';
      } else if (hits.length) {
        verdict = 'EMPTY';
      } else {
        verdict = 'MISSING';
      }
      return { requirement: pattern, verdict: verdict, matches: hits, usable: usable.length };
    });

    var risks = [];
    items.forEach(function (it) {
      var low = it.name.toLowerCase();
      if (it.size === 0) {
        risks.push({ level: 'error', file: it.rel, note: '0 字节文件：几乎必然被判为交付物缺失' });
      } else if (it.size < 0) {
        risks.push({ level: 'error', file: it.rel, note: '无法读取大小，权限或路径异常' });
      }
      var tempLike = TEMP_PREFIX.some(function (p) { return low.indexOf(p) === 0; }) ||
        TEMP_SUFFIX.some(function (s) { return low.length >= s.length && low.slice(-s.length) === s; });
      if (tempLike) { risks.push({ level: 'warn', file: it.rel, note: '疑似临时/锁文件，不应提交' }); }
      var stem = low.replace(/\.[^.]+$/, '');
      if (PLACEHOLDER.indexOf(stem) >= 0) {
        risks.push({ level: 'warn', file: it.rel, note: '疑似未命名的占位文件' });
      }
      if (it.name.indexOf(' ') >= 0 || FULLWIDTH.test(it.name)) {
        risks.push({ level: 'info', file: it.rel, note: '含空格或全角字符，跨平台/脚本处理易出错' });
      }
    });

    var failed = results.filter(function (r) { return r.verdict === 'MISSING' || r.verdict === 'EMPTY'; });
    return {
      dir: String(displayDir === undefined || displayDir === null ? '' : displayDir),
      spec: spec,
      min_bytes: minBytes,
      file_count: items.length,
      ready: failed.length === 0,
      passed: results.filter(function (r) { return r.verdict.indexOf('PASS') === 0; }).length,
      required: results.length,
      requirements: results,
      risks: risks,
      inventory: items
    };
  }

  function renderMarkdown(r) {
    var L = [];
    L.push('# 交付物审计报告', '');
    L.push('- 目录：`' + r.dir + '`');
    L.push('- 要求清单：`' + r.spec + '`');
    L.push('- 结论：**' + (r.ready ? 'READY 可以提交' : 'NOT READY 不可提交') + '**（' +
      r.passed + '/' + r.required + ' 项满足，共 ' + r.file_count + ' 个文件）', '');
    L.push('| # | 要求模式 | 判定 | 命中文件 | 大小 |');
    L.push('|---|----------|------|----------|------|');
    r.requirements.forEach(function (q, i) {
      var names = q.matches.length ? q.matches.map(function (m) { return '`' + m.rel + '`'; }).join('<br>') : '—';
      var sizes = q.matches.length ? q.matches.map(function (m) { return String(m.size); }).join('<br>') : '—';
      L.push('| ' + (i + 1) + ' | `' + q.requirement + '` | ' + q.verdict + ' | ' + names + ' | ' + sizes + ' |');
    });
    L.push('');
    if (r.risks.length) {
      L.push('## 风险项', '');
      r.risks.forEach(function (x) { L.push('- **[' + x.level + ']** `' + x.file + '` — ' + x.note); });
      L.push('');
    }
    if (!r.ready) {
      L.push('## 整改清单', '');
      r.requirements.forEach(function (q) {
        if (q.verdict === 'MISSING') { L.push('- 缺少 `' + q.requirement + '` 对应的文件，需新增。'); }
        else if (q.verdict === 'EMPTY') { L.push('- `' + q.requirement + '` 命中的文件全部为空（<' + r.min_bytes + ' 字节），需补内容。'); }
      });
      L.push('');
    }
    return L.join('\n');
  }

  return {
    SKIP_DIRS: SKIP_DIRS,
    norm: norm,
    splitSpec: splitSpec,
    matchKind: matchKind,
    audit: audit,
    renderMarkdown: renderMarkdown
  };
});
