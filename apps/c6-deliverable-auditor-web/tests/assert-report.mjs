#!/usr/bin/env node
/**
 * assert-report.mjs — 对一份审计报告做「预期断言」（供 tests/run-parity.ps1 调用）
 *
 * 为什么不写在 PowerShell 里：Windows PowerShell 5.1 读 UTF-8 无 BOM 的 JSON 时默认按
 * 本地代码页解码，中文要求模式会变乱码，ConvertFrom-Json 直接抛错。把 JSON 解析放在
 * Node 里可以彻底绕开这一层编码陷阱（这本身也是本仓库「先跑再写文档」的一个实例）。
 *
 * 用法：
 *   node tests/assert-report.mjs <report.json> [--ready=true|false] [--passed=N]
 *        [--required=N] [--verdict="模式:判定,模式:判定"] [--min-risks=N] [--spec="..."]
 * 退出码：0 = 全部断言通过；1 = 有断言失败；2 = 用法错误。
 */
import fs from 'node:fs';

const args = process.argv.slice(2);
const file = args.shift();
if (!file) {
  process.stderr.write('用法：node tests/assert-report.mjs <report.json> [--ready=..] [--passed=..] [--required=..] [--verdict=".."] [--min-risks=N]\n');
  process.exit(2);
}
const opts = {};
for (const a of args) {
  const m = /^--([a-zA-Z-]+)=(.*)$/.exec(a);
  if (!m) { process.stderr.write('无法识别的参数：' + a + '\n'); process.exit(2); }
  opts[m[1]] = m[2];
}

const r = JSON.parse(fs.readFileSync(file, 'utf8'));
const fails = [];
const notes = [];

if ('ready' in opts) {
  const want = opts.ready === 'true';
  (r.ready === want) ? notes.push('ready=' + r.ready) : fails.push('ready 期望 ' + want + ' 实际 ' + r.ready);
}
if ('passed' in opts) {
  (r.passed === Number(opts.passed)) ? notes.push('passed=' + r.passed) : fails.push('passed 期望 ' + opts.passed + ' 实际 ' + r.passed);
}
if ('required' in opts) {
  (r.required === Number(opts.required)) ? notes.push('required=' + r.required) : fails.push('required 期望 ' + opts.required + ' 实际 ' + r.required);
}
if ('diskSize' in opts) { /* 占位，保持参数解析宽松 */ }
if (opts.spec !== undefined) {
  (r.spec === opts.spec) ? notes.push('spec 一致') : fails.push('spec 期望 ' + opts.spec + ' 实际 ' + r.spec);
}
if ('verdict' in opts) {
  // 报告里的 requirement 字段是「归一化后的模式」（去首尾空格与引号、全角转半角、转小写），
  // 所以断言方给过来的模式也必须过同一套归一化再查表，否则 `*AI日志*` 与报告里的
  // `*ai日志*` 会被当成两条不同的要求，断言恒为 undefined —— 这正是本脚本第一次
  // 运行时暴露出来的假失败（断言器自身的口径不一致，而非被测内核有问题）。
  const key = (s) => String(s).trim().replace(/^["']+|["']+$/g, '')
    .replace(/[\uFF01-\uFF5E]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    .replace(/\u3000/g, ' ').toLowerCase();
  const byReq = {};
  for (const q of r.requirements) byReq[key(q.requirement)] = q.verdict;
  for (const pair of opts.verdict.split(',')) {
    const i = pair.lastIndexOf(':');
    const pattern = pair.slice(0, i);
    const want = pair.slice(i + 1);
    const got = byReq[key(pattern)];
    (got === want) ? notes.push(pattern + '=' + got) : fails.push(pattern + ' 期望 ' + want + ' 实际 ' + got);
  }
}
if ('min-risks' in opts) {
  const n = r.risks.length;
  const want = Number(opts['min-risks']);
  (n >= want) ? notes.push('risks=' + n) : fails.push('risks 期望 ≥' + want + ' 实际 ' + n);
}

if (fails.length) {
  process.stdout.write('FAIL ' + fails.join('；') + '\n');
  process.exit(1);
}
process.stdout.write('OK   ' + notes.join('，') + '\n');
process.exit(0);
