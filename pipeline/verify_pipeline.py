"""译文覆盖率与质量校验，产出可直接引用的校验报告。

用法：
    python pipeline/verify_pipeline.py

检查项（逐周）：
    1. 中文译文文件是否存在
    2. 章节覆盖率：译文一级/二级标题数 / 原文标题数
    3. 段落覆盖率：译文非空行数 / 原文非空行数（阈值 >= 0.60）
    4. 禁用占位符：略 / 省略 / 同上 / TODO / 待补充
    5. 残留英文：连续 6 个以上英文单词且不含代码标记的行视为可疑

产出：
    mini-/reports/verify-report.json
退出码：存在 FAIL 项时为 1。
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT.parent / "source-cs146s-fall2025"
COURSE_CN = ROOT / "course-cn"
REPORT = ROOT / "reports" / "verify-report.json"

WEEKS = [f"week{i}" for i in range(1, 9)]
PLACEHOLDERS = ["略", "省略", "同上", "TODO", "待补充", "此处省略"]
HEADING_RE = re.compile(r"^#{1,6}\s", re.MULTILINE)
ENGLISH_RUN = re.compile(r"(?:[A-Za-z][A-Za-z'\-]*\s+){5,}[A-Za-z][A-Za-z'\-]*")
MIN_RATIO = 0.60


def nonempty_lines(text):
    return [ln for ln in text.splitlines() if ln.strip()]


def check_week(week):
    src = SOURCE / week / "assignment.md"
    dst = COURSE_CN / f"{week}-讲义.md"
    item = {
        "week": week,
        "source": str(src.relative_to(ROOT.parent)) if src.exists() else None,
        "translation": f"course-cn/{dst.name}",
        "status": "FAIL",
        "checks": [],
    }
    if not src.exists():
        item["checks"].append({"name": "原文存在", "result": "FAIL", "detail": "未找到上游原文，请先运行 fetch_sources.py"})
        return item, 0, 0
    if not dst.exists():
        item["checks"].append({"name": "译文存在", "result": "FAIL", "detail": "缺少中文译文"})
        return item, 0, 0

    s_text = src.read_text(encoding="utf-8")
    d_text = dst.read_text(encoding="utf-8")
    s_head = len(HEADING_RE.findall(s_text))
    d_head = len(HEADING_RE.findall(d_text))
    s_lines = len(nonempty_lines(s_text))
    d_lines = len(nonempty_lines(d_text))

    ok = True
    head_ok = d_head >= s_head
    item["checks"].append({
        "name": "章节覆盖率", "result": "PASS" if head_ok else "FAIL",
        "detail": f"译文标题 {d_head} / 原文标题 {s_head}",
    })
    ok = ok and head_ok

    ratio = d_lines / s_lines if s_lines else 0
    line_ok = ratio >= MIN_RATIO
    item["checks"].append({
        "name": "段落覆盖率", "result": "PASS" if line_ok else "FAIL",
        "detail": f"译文非空行 {d_lines} / 原文非空行 {s_lines} = {ratio:.2f}（阈值 {MIN_RATIO}）",
    })
    ok = ok and line_ok

    found = [p for p in PLACEHOLDERS if p in d_text]
    item["checks"].append({
        "name": "无禁用占位符", "result": "PASS" if not found else "FAIL",
        "detail": "未发现占位符" if not found else "发现：" + "、".join(found),
    })
    ok = ok and not found

    suspects = []
    for idx, ln in enumerate(d_text.splitlines(), start=1):
        if ln.strip().startswith(("```", "|", ">", "http")) or "`" in ln:
            continue
        if ENGLISH_RUN.search(ln):
            suspects.append(idx)
    item["checks"].append({
        "name": "无明显残留英文段落", "result": "PASS" if not suspects else "WARN",
        "detail": "未发现整句残留英文" if not suspects else f"可疑行号：{suspects[:12]}",
    })

    item["status"] = "PASS" if ok else "FAIL"
    item["stats"] = {"src_headings": s_head, "cn_headings": d_head,
                     "src_lines": s_lines, "cn_lines": d_lines, "ratio": round(ratio, 3)}
    return item, s_head, d_head


def main():
    results = []
    total_src = total_cn = 0
    for week in WEEKS:
        item, s, d = check_week(week)
        results.append(item)
        total_src += s
        total_cn += d

    passed = sum(1 for r in results if r["status"] == "PASS")
    payload = {
        "weeks_checked": len(WEEKS),
        "weeks_passed": passed,
        "weeks_failed": len(WEEKS) - passed,
        "heading_coverage": round(total_cn / total_src, 3) if total_src else 0,
        "thresholds": {"min_line_ratio": MIN_RATIO},
        "results": results,
    }
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"校验完成：{passed}/{len(WEEKS)} 周通过；标题整体覆盖率 {payload['heading_coverage']}")
    for r in results:
        bad = [c for c in r["checks"] if c["result"] == "FAIL"]
        mark = "PASS" if r["status"] == "PASS" else "FAIL"
        print(f"  [{mark}] {r['week']} " + ("; ".join(f"{c['name']}:{c['detail']}" for c in bad) if bad else "全部检查项通过"))
    raise SystemExit(0 if payload["weeks_failed"] == 0 else 1)


if __name__ == "__main__":
    main()
