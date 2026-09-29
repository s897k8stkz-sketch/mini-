# CS146S《The Modern Software Developer》中文资料包

> 出自挑战 **C1：课程资料获取与翻译** —— 从一手来源获取 Stanford CS146S（fall2025）全部公开作业资料，经术语表约束的翻译流水线产出可复跑的中文课程资料包，供下一批同学零成本复用。

## 一、这是什么

本仓库把 Stanford CS146S（The Modern Software Developer，2025 秋季）公开仓库中的每周作业原文，翻译为结构一致的中文讲义，并附带一套**可复跑的抓取 → 翻译 → 校对流水线**与**统一术语表**。

- 面向读者：想自学该课程但受英文阅读成本限制的同学。
- 设计目标：换一门课的资料，用同一套流程可再次产出（管线不写死某一课）。
- 质量约束：术语全篇统一（见 `术语表.md`）、无大段漏译、无占位符（由校验脚本硬性拦截）。

## 二、目录结构

```
mini-/
├── README.md              # 本文件：来源、覆盖范围、翻译流程、使用方法、已知缺口
├── AI日志.md              # 每日 AI 协作日志：工具、prompt、踩坑
├── AAR.md                 # 七维复盘
├── 拿来说明.md            # 关键决策/产出如何借助 AI 完成（含原文、prompt、产出、对比）
├── 术语表.md              # 73 条术语，9 个类别（由 glossary.csv 生成）
├── glossary.csv           # 术语表源数据：en,zh,category,note
├── course-cn/             # 中文讲义（产出）
│   ├── 00-课程总览.md
│   └── week1-讲义.md … week8-讲义.md
├── pipeline/              # 流水线脚本（可复跑）
│   ├── fetch_sources.py   # 按固定提交抓取一手作业原文 → source/
│   ├── build_glossary.py  # 由 glossary.csv 生成 术语表.md + 术语巡检
│   ├── verify_pipeline.py # 覆盖率/占位符/英文残留 硬校验
│   ├── TRANSLATION-SPEC.md# 翻译规范（标题、锚点、术语、格式约定）
│   └── run_all.ps1        # 一键串起三个脚本
├── source/                # 上游原文快照（由 fetch_sources.py 生成）
│   ├── weekN/
│   └── PINNED.txt         # 固定的上游提交哈希，保证可复现
└── reports/               # 机器可读报告
    ├── glossary-report.json
    └── verify-report.json
```

## 三、来源与覆盖范围

**一手来源**：`mihail911/modern-software-dev-assignments`，分支 `fall2025`，固定提交 `ca2df55b78d6194612b65ae3fbfaa55a4678a683`（见 `source/PINNED.txt`）。固定提交而非跟随 HEAD，保证任何人复跑得到同一份内容。

**覆盖范围**

| 项目 | 情况 |
| --- | --- |
| 讲义周数 | 第 1–8 周，全部有对应中文讲义（覆盖度 100%，≥ 挑战要求的 80%） |
| 课程总览 | `00-课程总览.md`：课程基本信息、每周主题、提交方式、环境工具 |
| 术语表 | 73 条（挑战要求 ≥ 50），跨 9 个类别，全篇一致 |
| 校验结果 | 8/8 周通过（标题覆盖、行数比例、占位符、英文残留四项） |

**各周主题**：1 提示技术 · 2 行动项抽取器 · 3 自定义 MCP 服务器 · 4 自主编码智能体实战 · 5 Warp 智能体式开发 · 6 Semgrep 漏洞扫描与修复 · 7 Graphite AI 代码评审 · 8 多技术栈 AI 加速 Web 应用。

## 四、翻译流程（机器翻译 + 术语表 + 人工校对）

1. **抓取**：`fetch_sources.py` 按固定提交克隆/拉取上游仓库，逐周提取 `assignment.md`（次选 `writeup.md`/`README.md`/`docs/TASKS.md`），写入 `source/weekN/`，并记录提交哈希到 `source/PINNED.txt`。
2. **规范化**：每篇译文首行统一为 `# 第 N 周：<中文标题>`，第二行为来源锚点 `> 原文：weekN/assignment.md ；上游提交：见 source/PINNED.txt`。
3. **翻译**：在 `TRANSLATION-SPEC.md` 约束下逐周翻译——标题 1:1 对应，代码/路径/URL/JSON 键名不译，专有名词保留英文（Claude Code、mitmproxy、Agentic、Gradescope、Stanford、CS146S、Semgrep、Graphite、Warp、Bolt），技术表述用简洁中文。
4. **术语对齐**：严格以 `glossary.csv` 为准（如 vibe coding→氛围编程、coding agent→编码智能体、subagent→子智能体、rubric→评分量规、writeup→书面报告）。
5. **校对**：`verify_pipeline.py` 做四项硬校验，任一 FAIL 即退出码 1：
   - 标题覆盖：译文标题数 ≥ 原文标题数；
   - 行数比例：非空行比例 ≥ 0.60；
   - 占位符：命中「略/省略/同上/TODO/待补充/此处省略」即 FAIL；
   - 英文残留：连续 ≥ 5 个英文单词的段落（排除专有名词行）。
6. **汇总**：`build_glossary.py` 生成 `术语表.md` 与术语巡检报告；`reports/*.json` 保留机器可读结果。

## 五、如何使用（陌生人上手）

1. 浏览 `course-cn/00-课程总览.md` 了解课程全貌与每周主题。
2. 按周阅读 `course-cn/weekN-讲义.md`；每篇开头的锚点指向对应英文原文位置。
3. 需要术语对照时查 `术语表.md`；需要核对原文时看 `source/weekN/`。
4. 只读使用无需运行任何脚本；本仓库内容自包含。

## 六、如何复跑（换一门课复用）

1. 修改 `pipeline/fetch_sources.py` 顶部的 `REPO` / `BRANCH` / `PIN` 与候选文件名列表。
2. 用新课程的术语更新 `glossary.csv`。
3. 运行 `pipeline/run_all.ps1`（Windows PowerShell 5.1，脚本为纯 ASCII）。
4. 按 `TRANSLATION-SPEC.md` 产出 `course-cn/weekN-讲义.md`。
5. 再次运行 `verify_pipeline.py`，直到 8/8 通过。

> 脚本自身是通用骨架；唯一与课程耦合的是抓取源与术语表。

## 七、已知缺口

- **官网 FAQ 未收录**：官网 `/faq` 返回 404，未取到 FAQ 内容，总览中未包含 FAQ 条目。
- **逐讲时间表/阅读材料缺失**：官网 Fall 2025 专页与 Syllabus 页抓取失败，总览中的每周主题改用作业原文表述，未做推断性补全。
- **第 1–3 周无提交说明**：只有第 4–8 周作业原文含 SUBMISSION INSTRUCTIONS 段，故总览的提交方式说明仅适用于后者。
- **第二名助教待定**：官网上第二 TA 标注为 TBD。
- **作业截止日期**：官网仅提供 Calendar 入口，正文未给具体日期，未臆造。

## 八、交付物对照（C1 required_deliverables）

| 要求 | 对应文件 | 状态 |
| --- | --- | --- |
| `README.md` | `README.md` | 本文件 |
| `*AI日志*` | `AI日志.md` | 已产出 |
| `*AAR*` | `AAR.md` | 已产出（七维） |
| `*拿来说明*` | `拿来说明.md` | 已产出（≥ 3 个） |

## 九、C2 交付物（AI for Math 论文）

本仓库同时承载 C2 挑战的论文交付物，与 C1 的讲义管线互不依赖：

| 要求 | 对应文件 | 状态 |
| --- | --- | --- |
| `paper.tex` | `paper.tex` | 已产出（24 个环境、28 条引用、8 节正文） |
| `references.bib` | `references.bib` | 已产出（28 条，均为一手文献） |
| `*AI日志*` | `C2-AI日志.md` | 已产出（含 5 例 AI 误导与失败案例） |
| `*AAR*` | `C2-AAR.md` | 已产出（七维） |

> 论文结构与文献清单以 `paper.tex` 与 `references.bib` 为准。本机未安装 TeX 引擎，因此**未执行真实编译**；编译前的静态校验（环境配对、花括号平衡、citation↔bib 双向匹配、表格列数一致、AST 解析）结果记录在 `C2-AI日志.md`。

---

*本资料包由 C1 课程资料获取与翻译流水线产出，术语以 `glossary.csv` 为准。*
