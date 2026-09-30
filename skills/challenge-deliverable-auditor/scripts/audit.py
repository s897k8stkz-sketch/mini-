#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""挑战交付物审计器 / challenge-deliverable-auditor

按平台声明的"要求清单"审计一个交付物目录，逐项判定 命中/模糊命中/空文件/缺失，
输出可复现的 go/no-go 结论。纯标准库，无第三方依赖。

退出码：0 = 全部满足（ready）；1 = 存在 MISSING 或 EMPTY；2 = 用法错误。
"""

import argparse
import fnmatch
import hashlib
import json
import os
import re
import sys

SKIP_DIRS = {".git", ".github", ".idea", ".vscode", "__pycache__", "node_modules", ".parts", ".texparse"}
TEMP_PREFIX = ("~$", ".~", "._")
TEMP_SUFFIX = (".tmp", ".bak", ".swp", ".crdownload", ".part")
PLACEHOLDER = ("untitled", "新建文本文档", "无标题", "新建 文本文档")


def display_dir(root):
    """报告里记录的目录：优先用「相对当前工作目录」的形式。

    绝对路径会把维护者本机的目录结构写进报告，别人 clone 之后无法与自己的结果逐字段
    比对；因此只在相对路径不往上层跑（不出现 '..'）时采用相对形式，否则退回绝对路径。
    """
    abspath = os.path.abspath(root)
    try:
        rel = os.path.relpath(abspath, os.getcwd()).replace("\\", "/")
    except ValueError:  # Windows 跨盘符时 relpath 会抛错
        return abspath.replace("\\", "/")
    if rel == ".." or rel.startswith("../"):
        return abspath.replace("\\", "/")
    return rel


def norm(text):
    return (text or "").strip().strip('"').strip("'").lower()


def split_spec(spec):
    """平台清单形如 '*skill说明*,*.skill,*教学说明*'，中英文逗号/分号都算分隔符。"""
    parts = re.split(r"[,;\uFF0C\uFF1B]", spec or "")
    return [norm(p) for p in parts if norm(p)]


def sha256_of(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def scan(root):
    items = []
    for cur, dirs, files in os.walk(root):
        dirs[:] = [d for d in dirs if d.lower() not in SKIP_DIRS]
        for name in files:
            full = os.path.join(cur, name)
            try:
                size = os.path.getsize(full)
            except OSError:
                size = -1
            items.append({
                "name": name,
                "rel": os.path.relpath(full, root).replace("\\", "/"),
                "size": size,
            })
    return sorted(items, key=lambda i: i["rel"])


def match_kind(pattern, name):
    """返回 ('exact'|'fuzzy'|None)。"""
    n = name.lower()
    if "*" in pattern or "?" in pattern:
        if fnmatch.fnmatch(n, pattern):
            return "exact"
        core = pattern.replace("*", "").replace("?", "")
        if core and core in n:
            return "fuzzy"
        return None
    if n == pattern:
        return "exact"
    if pattern and pattern in n:
        return "fuzzy"
    return None


def audit(root, spec, min_bytes=1):
    requirements = split_spec(spec)
    items = scan(root)
    results = []
    for pattern in requirements:
        hits = []
        for it in items:
            kind = match_kind(pattern, it["name"])
            if kind:
                hits.append({"rel": it["rel"], "size": it["size"], "match": kind})
        usable = [h for h in hits if h["size"] >= min_bytes]
        if usable:
            verdict = "PASS" if any(h["match"] == "exact" for h in usable) else "PASS_FUZZY"
        elif hits:
            verdict = "EMPTY"
        else:
            verdict = "MISSING"
        results.append({
            "requirement": pattern,
            "verdict": verdict,
            "matches": hits,
            "usable": len(usable),
        })

    risks = []
    for it in items:
        low = it["name"].lower()
        if it["size"] == 0:
            risks.append({"level": "error", "file": it["rel"], "note": "0 字节文件：几乎必然被判为交付物缺失"})
        elif it["size"] < 0:
            risks.append({"level": "error", "file": it["rel"], "note": "无法读取大小，权限或路径异常"})
        if low.startswith(TEMP_PREFIX) or low.endswith(TEMP_SUFFIX):
            risks.append({"level": "warn", "file": it["rel"], "note": "疑似临时/锁文件，不应提交"})
        stem = os.path.splitext(low)[0]
        if stem in PLACEHOLDER:
            risks.append({"level": "warn", "file": it["rel"], "note": "疑似未命名的占位文件"})
        if " " in it["name"] or re.search(r"[\uFF01-\uFF5E]", it["name"]):
            risks.append({"level": "info", "file": it["rel"], "note": "含空格或全角字符，跨平台/脚本处理易出错"})

    failed = [r for r in results if r["verdict"] in ("MISSING", "EMPTY")]
    return {
        "dir": display_dir(root),
        "spec": spec,
        "min_bytes": min_bytes,
        "file_count": len(items),
        "ready": not failed,
        "passed": sum(1 for r in results if r["verdict"].startswith("PASS")),
        "required": len(results),
        "requirements": results,
        "risks": risks,
        "inventory": items,
    }


def render_md(report):
    lines = []
    lines.append("# 交付物审计报告")
    lines.append("")
    lines.append("- 目录：`%s`" % report["dir"])
    lines.append("- 要求清单：`%s`" % report["spec"])
    lines.append("- 结论：**%s**（%d/%d 项满足，共 %d 个文件）" % (
        "READY 可以提交" if report["ready"] else "NOT READY 不可提交",
        report["passed"], report["required"], report["file_count"]))
    lines.append("")
    lines.append("| # | 要求模式 | 判定 | 命中文件 | 大小 |")
    lines.append("|---|----------|------|----------|------|")
    for i, r in enumerate(report["requirements"], 1):
        if r["matches"]:
            names = "<br>".join("`%s`" % m["rel"] for m in r["matches"])
            sizes = "<br>".join(str(m["size"]) for m in r["matches"])
        else:
            names, sizes = "—", "—"
        lines.append("| %d | `%s` | %s | %s | %s |" % (i, r["requirement"], r["verdict"], names, sizes))
    lines.append("")
    if report["risks"]:
        lines.append("## 风险项")
        lines.append("")
        for r in report["risks"]:
            lines.append("- **[%s]** `%s` — %s" % (r["level"], r["file"], r["note"]))
        lines.append("")
    if not report["ready"]:
        lines.append("## 整改清单")
        lines.append("")
        for r in report["requirements"]:
            if r["verdict"] == "MISSING":
                lines.append("- 缺少 `%s` 对应的文件，需新增。" % r["requirement"])
            elif r["verdict"] == "EMPTY":
                lines.append("- `%s` 命中的文件全部为空（<%d 字节），需补内容。" % (r["requirement"], report["min_bytes"]))
        lines.append("")
    return "\n".join(lines)


def main(argv=None):
    ap = argparse.ArgumentParser(description="挑战交付物审计器：提交前自检要求清单是否齐全")
    ap.add_argument("--dir", required=True, help="待审计的交付物目录")
    ap.add_argument("--spec", required=True, help="平台要求清单，如 '*skill说明*,*.skill,*教学说明*'")
    ap.add_argument("--min-bytes", type=int, default=1, help="认定非空的最小字节数，默认 1")
    ap.add_argument("--json", dest="json_out", help="把完整报告写入该 JSON 文件")
    ap.add_argument("--md", dest="md_out", help="把 Markdown 报告写入该文件")
    ap.add_argument("--quiet", action="store_true", help="不向标准输出打印报告")
    args = ap.parse_args(argv)

    if not os.path.isdir(args.dir):
        sys.stderr.write("目录不存在：%s\n" % args.dir)
        return 2

    report = audit(args.dir, args.spec, args.min_bytes)
    md = render_md(report)

    if args.json_out:
        with open(args.json_out, "w", encoding="utf-8") as fh:
            json.dump(report, fh, ensure_ascii=False, indent=2)
    if args.md_out:
        with open(args.md_out, "w", encoding="utf-8") as fh:
            fh.write(md)
    if not args.quiet:
        sys.stdout.write(md + "\n")

    return 0 if report["ready"] else 1


if __name__ == "__main__":
    sys.exit(main())
