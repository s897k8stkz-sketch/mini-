#!/usr/bin/env node
/**
 * browser-path-check.mjs — 钉住「浏览器路径 == 命令行路径」这条回归
 *
 * 浏览器端提交的文件清单来自 File / FileSystemEntry，只能拿到相对路径与大小，没有 name 字段；
 * Node 端来自 fs 扫描，带 name。内核必须对两者给出同一份判定 —— 否则用户在网页上看到的结果
 * 与 CI/命令行不一致，工具就失去了意义（早期版本正是把这个差异做成了「浏览器里全 MISSING」）。
 *
 * 用法：node tests/browser-path-check.mjs <report.json>
 * 做法：把报告里的 inventory 逐项剥掉 name（模拟浏览器），用同一 spec / min_bytes 重跑内核，
 *       再与完整报告逐字段比对。输出 IDENTICAL / DIFFERENT，退出码 0 / 1。
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { canonical } from './canonical-json.mjs';

const require = createRequire(import.meta.url);
const AuditCore = require(path.resolve('js/audit-core.js'));

const file = process.argv[2];
if (!file) {
  process.stderr.write('用法：node tests/browser-path-check.mjs <report.json>\n');
  process.exit(2);
}
const full = JSON.parse(fs.readFileSync(file, 'utf8'));
const stripped = full.inventory.map((it) => ({ rel: it.rel, size: it.size }));
const again = AuditCore.audit(stripped, full.spec, full.min_bytes, full.dir);

const same = canonical(full) === canonical(again);
if (same) {
  process.stdout.write('IDENTICAL 剥掉 name 后结果不变：' + full.passed + '/' + full.required +
    '，ready=' + full.ready + '，风险 ' + full.risks.length + ' 项\n');
  process.exit(0);
}
process.stdout.write('DIFFERENT 浏览器路径与命令行路径结论不一致\n');
process.exit(1);
