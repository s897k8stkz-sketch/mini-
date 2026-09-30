#!/usr/bin/env node
/**
 * canonical-json.mjs — 逐字段比对两个 JSON 报告（键序无关，值必须完全一致）
 *
 * 用法：node tests/canonical-json.mjs a.json b.json
 * 输出：IDENTICAL（退出码 0）或首个差异的路径（退出码 1）。
 * 存在的理由：两个实现（Python / JS）序列化时的键顺序、缩进可能不同，
 * 直接 diff 文本会把「键序差异」误报成「判定差异」。
 */
import fs from 'node:fs';

export function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
  }
  return JSON.stringify(value);
}

function firstDiff(a, b, path) {
  if (canonical(a) === canonical(b)) return null;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return path + '.length: ' + a.length + ' vs ' + b.length;
    for (let i = 0; i < a.length; i++) {
      const d = firstDiff(a[i], b[i], path + '[' + i + ']');
      if (d) return d;
    }
    return path + ': 数组内容不同';
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const keys = Array.from(new Set([...Object.keys(a), ...Object.keys(b)])).sort();
    for (const k of keys) {
      const d = firstDiff(a[k], b[k], path + '.' + k);
      if (d) return d;
    }
    return path + ': 对象内容不同';
  }
  return path + ': ' + JSON.stringify(a) + ' vs ' + JSON.stringify(b);
}

if (process.argv[1] && process.argv[1].endsWith('canonical-json.mjs')) {
  const [a, b] = process.argv.slice(2);
  if (!a || !b) {
    process.stderr.write('用法：node tests/canonical-json.mjs a.json b.json\n');
    process.exit(2);
  }
  const ja = JSON.parse(fs.readFileSync(a, 'utf8'));
  const jb = JSON.parse(fs.readFileSync(b, 'utf8'));
  const diff = firstDiff(ja, jb, '$');
  if (diff) {
    process.stdout.write('DIFFERENT ' + diff + '\n');
    process.exit(1);
  }
  process.stdout.write('IDENTICAL 逐字段一致（' + canonical(ja).length + ' 字符的规范形）\n');
  process.exit(0);
}
