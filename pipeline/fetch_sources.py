"""按固定提交拉取上游课程资料，保证整条流水线可复现。

用法：
    python pipeline/fetch_sources.py

行为：
    1. 把 https://github.com/mihail911/modern-software-dev-assignments 克隆/更新到 .cache/upstream
    2. 检出 PIN 指定的提交（detached HEAD）
    3. 把各周公开讲义与配套文档复制到 source/weekN/
    4. 写出 source/PINNED.txt 记录仓库、分支、提交与文件清单
"""
import json
import shutil
import subprocess
import sys
from pathlib import Path

REPO = "https://github.com/mihail911/modern-software-dev-assignments.git"
BRANCH = "fall2025"
PIN = "ca2df55b78d6194612b65ae3fbfaa55a4678a683"

ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = ROOT / "source"
CACHE = ROOT / ".cache" / "upstream"

WEEKS = [f"week{i}" for i in range(1, 9)]
CANDIDATES = ["assignment.md", "writeup.md", "README.md", "docs/TASKS.md"]


def run(args, cwd=None):
    subprocess.run(args, cwd=str(cwd) if cwd else None, check=True)


def ensure_clone():
    git = shutil.which("git")
    if not git:
        sys.exit("错误：未找到 git，请先安装 git 再运行流水线。")
    if not (CACHE / ".git").exists():
        CACHE.parent.mkdir(parents=True, exist_ok=True)
        print(f"[1/4] 克隆上游仓库 {REPO} (分支 {BRANCH}) ...")
        run([git, "clone", "--quiet", "--branch", BRANCH, REPO, str(CACHE)])
    else:
        print("[1/4] 复用已有克隆，刷新远端 ...")
    run([git, "fetch", "--quiet", "--depth", "200", "origin", BRANCH], cwd=CACHE)
    print(f"[2/4] 检出固定提交 {PIN[:12]} ...")
    run([git, "-c", "advice.detachedHead=false", "checkout", "--quiet", PIN], cwd=CACHE)
    head = subprocess.run([git, "rev-parse", "HEAD"], cwd=CACHE,
                          capture_output=True, text=True, check=True).stdout.strip()
    if head != PIN:
        sys.exit(f"错误：检出结果 {head} 与固定提交 {PIN} 不一致，终止以保证可复现。")
    return git


def copy_week(week):
    copied = []
    for rel in CANDIDATES:
        src = CACHE / week / rel
        if not src.is_file():
            continue
        dst = SRC_DIR / week / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)
        copied.append(f"{week}/{rel}")
    return copied


def main():
    git = ensure_clone()
    if SRC_DIR.exists():
        shutil.rmtree(SRC_DIR)
    SRC_DIR.mkdir(parents=True, exist_ok=True)

    print("[3/4] 复制各周公开讲义与配套文档 ...")
    manifest = []
    for week in WEEKS:
        files = copy_week(week)
        manifest.append({"week": week, "files": files})
        print(f"      {week}: {len(files)} 个文件")

    print("[4/4] 写出 source/PINNED.txt ...")
    lines = [
        "# 上游课程资料来源锁定信息（由 pipeline/fetch_sources.py 生成）",
        f"repo = {REPO}",
        f"branch = {BRANCH}",
        f"commit = {PIN}",
        "note = source/ 目录下的英文原文不随本仓库分发，任何环境执行本脚本即可按上述提交重新取得完全一致的文件。",
        "",
        "files:",
    ]
    for item in manifest:
        for f in item["files"]:
            lines.append(f"  - {f}")
    (SRC_DIR / "PINNED.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")

    (ROOT / ".cache" / "fetch-manifest.json").write_text(
        json.dumps({"repo": REPO, "branch": BRANCH, "commit": PIN, "weeks": manifest},
                   ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("完成：本地 source/ 已锁定到上游提交 " + PIN[:12])


if __name__ == "__main__":
    main()
