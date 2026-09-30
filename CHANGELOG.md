# 更新日志（Changelog）

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 的写法，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。时间为 UTC。

## [Unreleased]

### 计划中
- 让审计器的要求清单可从平台元数据自动拉取，消除手工粘贴 `--spec`。
- 增加文件编码 / BOM 检测：UTF-8 有 BOM 与无 BOM 混用会造成跨机器比对失败。
- 扩大语料压力测试，并补中文文件名的 NFC/NFD 归一化场景。

## [1.3.0] - 2026-09-30

开源化补齐版本，目标是"陌生人 clone 下来 5 分钟内能看懂、能跑通"。

### 新增
- `LICENSE`（MIT）、`.gitignore`、`AI_LOG.md`、`ATTRIBUTION.md`、
  `CONTRIBUTING.md`、`CHANGELOG.md` —— 开源仓库的六件必备件。
- `examples/`：三个可复现样例目录与**机器生成**的期望输出，
  用于在不读源码的情况下看到四类判定（`PASS` / `PASS_FUZZY` / `EMPTY` / `MISSING`）。
- `.github/workflows/repo-quality.yml`：每次 push / PR 自动执行
  ① Python 语法检查 ② 用审计器审计本仓库自身 ③ 校验开源必备文件是否齐全。
- `.github/ISSUE_TEMPLATE/` 与 `PULL_REQUEST_TEMPLATE.md`。
- `README.md` 重写为面向使用者的项目主页：快速开始、使用说明、示例、
  项目结构、技术栈、AI 生成说明、借鉴来源、License。

### 变更
- README 的叙述主体从"课程资料包"改为"交付物审计器"，
  C1 讲义与 C2 论文降级为"仓库内其他内容"小节，但内容一字未删。

### 已知限制
- 审计器只做模式级匹配，不判断内容质量；不做 `.skill` 包内结构校验。

## [1.2.0] - 2026-09-29

对应提交：`72851a3` → `48c4e1b`

### 新增
- 交付物审计器技能包 `challenge-deliverable-auditor`：
  `.skill` 安装包（ZIP 容器）+ 可读源码目录（`SKILL.md` / `scripts/audit.py` / `references/spec-format.md`）。
- C4 四件套文档：`2025105400247_C4_skill说明.md`、`2025105400247_C4_教学说明.md`、
  `2025105400247_C4_demo.md`、`2025105400247_C4_AI日志.md`。

### 修复
- 修正交付物中引用的陈旧文件名（`AI日志` / `skill说明` 的命名对齐）。

## [1.1.0] - 2026-09-29

对应提交：`e12cee4` → `a901e6d`

### 新增
- 论文正文 `paper.tex` 与参考文献 `references.bib`（28 条）。
- F1 保真探针 `c2-f1-probe/`：22 例输入上的可复现测量，产出 `results.json`。
- `.github/workflows/build-paper.yml`：云端真实 LaTeX 编译，
  把 PDF、编译日志与证据表回写到 `build/`，用于消除"核心交付物未经真实编译验证"。

## [1.0.0] - 2026-09-29

### 新增
- 首个版本：Stanford CS146S《The Modern Software Developer》中文资料包。
- `course-cn/`：八周讲义 + 课程总览（`00-课程总览.md` ~ `week8-*.md`）。
- `glossary.csv`：中英术语对照 73 条，分属 9 个类别。
- `pipeline/`：可复跑流水线（`fetch_sources.py` → `build_glossary.py` → `verify_pipeline.py`）
  与翻译规范 `TRANSLATION-SPEC.md`。

[Unreleased]: https://github.com/s897k8stkz-sketch/mini-/compare/v1.3.0...HEAD
[1.3.0]: https://github.com/s897k8stkz-sketch/mini-/releases/tag/v1.3.0
[1.2.0]: https://github.com/s897k8stkz-sketch/mini-/releases/tag/v1.2.0
