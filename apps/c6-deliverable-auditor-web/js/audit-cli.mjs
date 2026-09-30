#!/usr/bin/env node
/**
 * audit-cli.mjs — 同一个判定内核的命令行外壳（Node 侧）
 *
 * 存在的理由有两个：
 *  1) 浏览器里点一次就能出报告，但报告要进 CI / 进文档时命令行更方便；
 *  2) 它是「JS 移植版 = Python 版」的等价性证据（tests/run-parity.ps1 逐字段比对两者的 JSON）。
 *
 * 用法：node js/audit-cli.mjs --dir <目录> --spec '<清单>' [--min-bytes N] [--json out.json] [--md out.md] [--quiet]
 * 退出码：0 = READY；1 = 存在 MISSING/EMPTY；2 = 用法错误。
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { scanDir, displayDir } from './inventory-fs.mjs';

const require = createRequire(import.meta.url);
const AuditCore = require('./audit-core.js');

function parseArgs(argv) {
  const out = { minBytes: 1, quiet: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dir') out.dir = argv[++i];
    else if (a === '--spec') out.spec = argv[++i];
    else if (a === '--min-bytes') out.minBytes = Number(argv[++i]);
    else if (a === '--json') out.json = argv[++i];
    else if (a === '--md') out.md = argv[++i];
    else if (a === '--quiet') out.quiet = true;
    else if (a === '-h' || a === '--help') out.help = true;
    else { process.stderr.write('未知参数：' + a + '\n'); return { error: true }; }
  }
  return out;
}

const args = parseArgs(process.argv);
if (args.error) { process.exit(2); }
if (args.help || !args.dir || !args.spec) {
  process.stdout.write('用法：node js/audit-cli.mjs --dir <目录> --spec <清单> [--min-bytes N] [--json f] [--md f] [--quiet]\n');
  process.exit(args.help ? 0 : 2);
}
if (!fs.existsSync(args.dir) || !fs.statSync(args.dir).isDirectory()) {
  process.stderr.write('目录不存在：' + args.dir + '\n');
  process.exit(2);
}

const report = AuditCore.audit(scanDir(args.dir), args.spec, args.minBytes, displayDir(args.dir));
const md = AuditCore.renderMarkdown(report);

if (args.json) { fs.writeFileSync(args.json, JSON.stringify(report, null, 2) + '\n', 'utf8'); }
if (args.md) { fs.writeFileSync(args.md, md + '\n', 'utf8'); }
if (!args.quiet) { process.stdout.write(md + '\n'); }
process.exit(report.ready ? 0 : 1);
