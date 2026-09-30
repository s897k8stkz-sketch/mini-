/**
 * inventory-fs.mjs — Node 侧的「文件清单」扫描（浏览器版不需要它）
 *
 * 与 audit.py 的 scan() 保持同语义：跳过 SKIP_DIRS、按 rel 排序、size 读取失败记 -1。
 * 报告里的 dir 字段优先写「相对当前工作目录」的形式，避免把维护者本机路径写进报告。
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const AuditCore = require('./audit-core.js');

const SKIP = new Set(AuditCore.SKIP_DIRS.map((d) => d.toLowerCase()));

export function scanDir(root) {
  const items = [];
  const walk = (abs, rel) => {
    let entries;
    try {
      entries = fs.readdirSync(abs, { withFileTypes: true });
    } catch (err) {
      return;
    }
    for (const e of entries) {
      const childAbs = path.join(abs, e.name);
      const childRel = rel ? rel + '/' + e.name : e.name;
      if (e.isDirectory()) {
        if (SKIP.has(e.name.toLowerCase())) continue;
        walk(childAbs, childRel);
      } else {
        let size = -1;
        try {
          size = fs.statSync(childAbs).size;
        } catch (err) {
          size = -1;
        }
        items.push({ name: e.name, rel: childRel, size });
      }
    }
  };
  walk(path.resolve(root), '');
  items.sort((a, b) => (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0));
  return items;
}

/** 报告里要写的目录：能表达成不下钻到上层目录的相对路径就用相对路径。 */
export function displayDir(root) {
  const abs = path.resolve(root).replace(/\\/g, '/');
  const rel = path.relative(process.cwd(), path.resolve(root)).replace(/\\/g, '/');
  if (!rel || rel === '..' || rel.startsWith('../') || path.isAbsolute(rel)) return abs;
  return rel;
}
