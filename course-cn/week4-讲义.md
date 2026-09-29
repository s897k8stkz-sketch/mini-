# 第 4 周：真实环境中的自主编码智能体

> 原文：week4/assignment.md ；上游提交：见 source/PINNED.txt

> ***建议在开始动手之前先通读本文档全文。***

本周的任务是：在本仓库的语境下，使用以下 **Claude Code** 功能的任意组合，构建至少 **2 个自动化**：


- 自定义斜杠命令（提交到 `.claude/commands/*.md`）

- 用于仓库或上下文指引的 `CLAUDE.md` 文件

- Claude SubAgents（按角色分工、协同工作的子智能体）

- 集成进 Claude Code 的 MCP 服务器

你的自动化应当切实改善某种开发者工作流——例如简化测试、文档、重构或数据相关任务。随后你将用自己创建的自动化，去扩展 `week4/` 中的起始应用。


## 了解 Claude Code

为了更深入地理解 Claude Code 并探索自动化选项，请阅读以下两份资料：

1. **Claude Code 最佳实践：** [anthropic.com/engineering/claude-code-best-practices](https://www.anthropic.com/engineering/claude-code-best-practices)

2. **SubAgents 概览：** [docs.anthropic.com/en/docs/claude-code/sub-agents](https://docs.anthropic.com/en/docs/claude-code/sub-agents)

## 探索起始应用

一个极简的全栈起始应用，被设计为 **"开发者的指挥中心"**。
- FastAPI 后端 + SQLite（SQLAlchemy）
- 静态前端（无需 Node 工具链）
- 极简测试（pytest）
- pre-commit（black + ruff）
- 用于练习智能体驱动工作流的任务

把这个应用当作你的试验场，用来试验你构建的 Claude 自动化。

### 结构

```
backend/                # FastAPI 应用
frontend/               # 由 FastAPI 提供的静态 UI
data/                   # SQLite 数据库 + 种子数据
docs/                   # 供智能体驱动工作流使用的任务
```

### 快速开始

1) 激活你的 conda 环境。

```bash
conda activate cs146s
```

2) （可选）安装 pre-commit 钩子

```bash
pre-commit install
```

3) 运行应用（在 `week4/` 目录下）

```bash
make run
```

4) 打开 `http://localhost:8000` 查看前端，打开 `http://localhost:8000/docs` 查看 API 文档。

5) 试用一下起始应用，感受它当前的功能与特性。


### 测试

运行测试（在 `week4/` 目录下）
```bash
make test
```

### 格式化/静态检查

```bash
make format
make lint
```

## 第一部分：构建你的自动化（任选 2 个或更多）

既然你已经熟悉了起始应用，下一步就是构建自动化来增强或扩展它。下面是若干可选的自动化方向，你可以跨类别混搭。

在构建自动化的过程中，请把改动记录在 `writeup.md` 文件中。暂时把 *"你如何使用该自动化来增强起始应用"* 一节留空——你会在本作业第二部分回到这里。

### A) Claude 自定义斜杠命令

斜杠命令是针对重复性工作流的功能，让你可以在 `.claude/commands/` 下的 Markdown 文件中创建可复用的工作流。Claude 通过 `/` 暴露这些命令。


- 示例 1：带覆盖率的测试运行器
  - 名称：`tests.md`
  - 意图：运行 `pytest -q backend/tests --maxfail=1 -x`，若通过则运行覆盖率统计。
  - 输入：可选的标记或路径。
  - 输出：汇总失败情况并给出下一步建议。
- 示例 2：文档同步
  - 名称：`docs-sync.md`
  - 意图：读取 `/openapi.json`，更新 `docs/API.md`，并列出路由变动。
  - 输出：差异式摘要与待办清单。
- 示例 3：重构工具台（harness）
  - 名称：`refactor-module.md`
  - 意图：重命名模块（例如 `services/extract.py` → `services/parser.py`），更新导入，运行静态检查/测试。
  - 输出：被改动文件的清单与验证步骤。

>*提示：让命令保持聚焦、使用 `$ARGUMENTS`、优先选择幂等步骤。可以考虑把安全工具加入允许列表，并用无头模式提升可重复性。*

### B) `CLAUDE.md` 指引文件

`CLAUDE.md` 文件会在开始对话时被自动读取，让你能够提供仓库专属的指令、上下文或指引，从而影响 Claude 的行为。在仓库根目录（以及可选地，在 `week4/` 的子目录中）创建 `CLAUDE.md` 来引导 Claude 的行为。

- 示例 1：代码导航与入口
  - 包含：如何运行应用、路由所在位置（`backend/app/routers`）、测试所在位置、数据库如何做种子。
- 示例 2：风格与安全护栏
  - 包含：工具链要求（black/ruff）、可安全运行的命令、应避免的命令，以及 lint/测试门禁。
- 示例 3：工作流片段
  - 包含："当被要求新增一个端点时，先写一个失败的测试，再实现，最后运行 pre-commit。"

> *提示：像打磨提示词一样迭代 `CLAUDE.md`，保持简洁且可执行，并记录你期望 Claude 使用的自定义工具/脚本。*

### C) SubAgents（按角色分工）

SubAgents 是专门的 AI 助手，各自配置了系统提示、工具与上下文，用来处理特定任务。设计两个或更多协同工作的智能体，每个负责单一工作流中的不同环节。

- 示例 1：TestAgent + CodeAgent
  - 流程：TestAgent 为某处改动编写/更新测试 → CodeAgent 实现代码让测试通过 → TestAgent 验证。
- 示例 2：DocsAgent + CodeAgent
  - 流程：CodeAgent 新增一个 API 路由 → DocsAgent 更新 `API.md` 与 `TASKS.md`，并对照 `/openapi.json` 检查是否偏离。
- 示例 3：DBAgent + RefactorAgent
  - 流程：DBAgent 提出数据模式变更（调整 `data/seed.sql`）→ RefactorAgent 更新模型/模式/路由并修复 lint 问题。

>*提示：使用清单/便签板，在角色切换之间重置上下文（`/clear`），并对相互独立的任务并行运行智能体。*

## 第二部分：让你的自动化真正发挥作用

既然你已经构建了 2 个以上自动化，现在就投入使用吧！在 `writeup.md` 中 *"你如何使用该自动化来增强起始应用"* 一节里，描述你如何借助每个自动化来改进或扩展应用的功能。

例如：如果你实现了自定义斜杠命令 `/generate-test-cases`，请说明你如何使用它来与起始应用交互并对其进行测试。


## 交付物

1) 两个或更多自动化，其中可以包括：
   - `.claude/commands/*.md` 中的斜杠命令
   - `CLAUDE.md` 文件
   - SubAgent 的提示词/配置（清晰文档化，附上相关文件/脚本，如有）

2) `week4/` 下的书面报告 `writeup.md`，其中包含：
  - 设计灵感（例如引用最佳实践文档和/或子智能体文档）
  - 每个自动化的设计，包含目标、输入/输出、步骤
  - 如何运行（确切命令）、预期输出，以及回滚/安全注意事项
  - 前后对比（即人工工作流 vs 自动化工作流）
  - 你如何使用该自动化来增强起始应用



## 提交说明

1. 确保所有改动都已推送到你的远程仓库以便评分。
2. **确保你已把 brentju 和 febielin 两位都添加为你作业仓库的协作者。**
2. 通过 Gradescope 提交。

---
*本译文由 C1 翻译流水线产出，术语以 `glossary.csv` 为准。*
