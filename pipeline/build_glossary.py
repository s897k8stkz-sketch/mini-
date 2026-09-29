"""从 glossary.csv 生成中文术语表，并对译文做术语一致性巡检。

用法：
    python pipeline/build_glossary.py

产出：
    mini-/术语表.md            —— 按类别分组的中文术语表（人工可读）
    mini-/reports/glossary-report.json —— 术语使用与缺失情况（机器可读）
"""
import csv
import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GLOSSARY = ROOT / "glossary.csv"
COURSE_CN = ROOT / "course-cn"
OUT_MD = ROOT / "术语表.md"
REPORT = ROOT / "reports" / "glossary-report.json"


def load_glossary():
    with GLOSSARY.open("r", encoding="utf-8-sig", newline="") as fh:
        rows = list(csv.DictReader(fh))
    cleaned = []
    for row in rows:
        en = (row.get("en") or "").strip()
        zh = (row.get("zh") or "").strip()
        if not en or not zh:
            continue
        cleaned.append({
            "en": en,
            "zh": zh,
            "category": (row.get("category") or "未分类").strip(),
            "note": (row.get("note") or "").strip(),
        })
    return cleaned


def render_markdown(rows):
    groups = defaultdict(list)
    for row in rows:
        groups[row["category"]].append(row)
    lines = [
        "# CS146S 课程翻译术语表",
        "",
        f"共 {len(rows)} 条，按类别分组。本文件由 `pipeline/build_glossary.py` 从 `glossary.csv` 自动生成，请勿手工编辑。",
        "",
        "| 英文原词 | 中文译法 | 一致性规则 |",
        "| --- | --- | --- |",
    ]
    for cat, items in groups.items():
        lines.append(f"| **{cat}** | | |")
        for it in items:
            lines.append(f"| {it['en']} | {it['zh']} | {it['note'] or '—'} |")
    return "\n".join(lines) + "\n"


def scan_translations(rows):
    """检查每个术语在译文中是否使用了规定译法。"""
    md_files = sorted(COURSE_CN.glob("*.md")) if COURSE_CN.is_dir() else []
    findings = []
    for row in rows:
        en = row["en"]
        # 英文术语按词边界匹配（允许内部有空格与连字符）
        stem = re.escape(en)
        en_re = re.compile(r"(?<![A-Za-z])" + stem + r"(?![A-Za-z])", re.IGNORECASE)
        zh_key = row["zh"].split("（")[0].split("(")[0].strip()
        for path in md_files:
            text = path.read_text(encoding="utf-8")
            en_hits = len(en_re.findall(text))
            zh_hits = text.count(zh_key)
            if en_hits > 0 and zh_hits == 0:
                findings.append({
                    "file": path.name, "term_en": en, "expected_zh": row["zh"],
                    "en_occurrences": en_hits, "zh_occurrences": zh_hits,
                    "issue": "译文出现该英文术语但未使用规定中文译法",
                })
            elif en_hits > 0 and zh_hits > 0:
                findings.append({
                    "file": path.name, "term_en": en, "expected_zh": row["zh"],
                    "en_occurrences": en_hits, "zh_occurrences": zh_hits,
                    "issue": "英文与中文并存（首次出现时允许，需确认是否为术语标注）",
                })
    return md_files, findings


def main():
    rows = load_glossary()
    OUT_MD.parent.mkdir(parents=True, exist_ok=True)
    OUT_MD.write_text(render_markdown(rows), encoding="utf-8")
    md_files, findings = scan_translations(rows)
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps({
        "glossary_entries": len(rows),
        "categories": sorted({r["category"] for r in rows}),
        "translated_files": [p.name for p in md_files],
        "findings": findings,
        "findings_count": len(findings),
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"术语表已生成：{OUT_MD.name}（{len(rows)} 条，{len({r['category'] for r in rows})} 个类别）")
    print(f"已扫描译文文件 {len(md_files)} 个，术语巡检发现 {len(findings)} 条待确认项")
    if not md_files:
        print("提示：course-cn/ 下暂无译文，术语巡检为空跑。")


if __name__ == "__main__":
    main()
