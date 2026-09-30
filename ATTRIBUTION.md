# 借鉴来源与致谢（ATTRIBUTION）

先划清界线，再列来源。

**本仓库原创的部分**：`course-cn/` 中文讲义的组织方式与译文、术语表 `glossary.csv`
的构建与校验流水线（`pipeline/`）、F1 保真探针（`c2-f1-probe/`）、
交付物审计器（`skills/challenge-deliverable-auditor/`）的全部代码与文档、
以及本仓库的 `README.md` / `AI_LOG.md` / `examples/` / `CONTRIBUTING.md` / `CHANGELOG.md`。

**本仓库不声称原创的部分**：下列外部来源被借鉴、引用或直接依赖。若你认为某处
归属有误或缺引用，请开 Issue，这类问题优先处理。

---

## 一、代码与运行时依赖

| 来源 | 用途 | 许可 |
| --- | --- | --- |
| Python 标准库 `argparse` / `pathlib` / `fnmatch` / `zipfile` / `json` / `hashlib` / `subprocess` | 审计器与流水线的全部功能 | PSF License 2.0 |
| [`actions/checkout@v4`](https://github.com/actions/checkout) | 两个工作流的检出步骤 | MIT |
| [`actions/setup-python@v5`](https://github.com/actions/setup-python) | CI 内的 Python 环境 | MIT |
| [`xu-cheng/latex-action`](https://github.com/xu-cheng/latex-action) | 云端 LaTeX 编译（`build-paper.yml`） | MIT |
| GitHub 官方 [`Python.gitignore`](https://github.com/github/gitignore/blob/main/Python.gitignore) 模板 | `.gitignore` 的分类骨架 | CC0-1.0 |
| [Keep a Changelog 1.1.0](https://keepachangelog.com/zh-CN/1.1.0/) | `CHANGELOG.md` 的格式约定 | MIT |
| [Semantic Versioning 2.0.0](https://semver.org/lang/zh-CN/) | 版本号语义 | CC BY 3.0 |
| [Contributor Covenant v2.1](https://www.contributor-covenant.org/zh-cn/version/2/1/code_of_conduct/) | `CONTRIBUTING.md` 第五节"行为准则"的思路 | CC BY 4.0 |
| MIT License 原文（OSI / [choosealicense.com](https://choosealicense.com/licenses/mit/)） | `LICENSE` | — |

**刻意的一条设计决定**：本仓库**不引入任何第三方 Python 依赖**，因此没有
`requirements.txt`，克隆后无需 `pip install` 即可运行全部脚本。这不是省事，
而是为了让"5 分钟内跑通"这件事不依赖网络与包管理器状态。

## 二、文档与规范

| 来源 | 借鉴了什么 | 边界 |
| --- | --- | --- |
| [Anthropic Agent Skills 文档](https://docs.claude.com/en/docs/agents-and-tools/agent-skills) | `.skill` 包结构：ZIP 容器 + 顶层目录为技能名 + `SKILL.md` 的 YAML frontmatter；以及"渐进式披露"的组织思路 | 只借鉴格式与组织方式，未复制其示例代码或文本 |
| Claude `skill-creator` 的质量标准（D1–D4：可执行性 / 可教性 / 完整性 / 边界） | 审计器与技能包自评时的评审维度 | 用于自评，**不是**平台的官方评分口径 |
| 挑战平台下发的 `required_deliverables` 模式串（如 `*skill说明*,*.skill,*AI日志*`） | 审计器 `--spec` 参数的输入形态 | 该模式串来自平台元数据，由平台定义，非本仓库发明 |
| [GitHub Docs: Configuring issue templates](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests) | `.github/ISSUE_TEMPLATE/` 的 frontmatter 字段（`name`/`about`/`title`/`labels`） | 字段格式，模板正文为本仓库自写 |

## 三、内容与素材

| 来源 | 用途 | 许可与边界 |
| --- | --- | --- |
| Stanford CS146S《The Modern Software Developer》课程材料（上游仓库 [`mihail911/modern-software-dev-assignments`](https://github.com/mihail911/modern-software-dev-assignments)） | `course-cn/` 八周中文讲义的**原文来源** | 讲义原文版权归课程方。本仓库仅做**中文整理与结构化**，不复制上游整套材料；需要原文请回到上游。若权利人不希望被整理，开 Issue 即撤下 |
| 各周讲义中引用的第三方文章、视频与工具文档（正文内以链接标注） | 课程内容的支撑 | 各归其权利人 |
| `references.bib` 收录的 28 条 AI4Math 相关文献 | `paper.tex` 的引文与对照基线 | 每条按其出版方许可；本仓库仅作学术引用，未转载正文 |
| 术语表条目的中英对照（`glossary.csv`） | 术语标准化 | 术语本身属公共知识，本仓库的贡献是**筛选与分类** |

## 四、灵感来源（借鉴了"思路"，没有搬运代码或文本）

| 来源 | 借鉴了什么 |
| --- | --- |
| 软件工程中的 **lint / 契约测试** 实践 | "用退出码表达结论、让机器判定代替肉眼核对"这一整体思路 |
| CI 的 **回归基线** 概念 | `examples/sample-incomplete` 必须稳定判成 NOT READY，判定变了即为回归 |
| 学术论文的 **可复现性附录** 传统 | 把编译日志、探针结果、审计报告一并归档为可核验证据 |
| 挑战平台"提交前自检"的诉求 | 审计器要解决的问题域本身 |

## 五、两处需要澄清的事

1. **关于"原创性"**：`course-cn/` 的知识内容来自上游课程，`paper.tex` 的观点建立在
   其引用的 28 条文献之上。本仓库真正的贡献是**组织方式、可复跑流程与验证工具**——
   也就是说，值得评审的是"这套流程能否被别人复现"，而不是"这些知识点是否新颖"。

2. **关于 AI 生成内容**：本仓库的代码与文档在人机协作下完成，具体分工、
   迭代轮次与出错纠正记录在 `AI_LOG.md`。任何由 AI 生成的表述都可以被质疑；
   请以仓库内**可复跑的命令与机器生成的报告**为准，不要以文字自述为准。

---

## 六、如何纠正归属问题

开 Issue（选 `Bug report` 模板），在"补充说明"里写明：文件路径 + 原始来源链接 + 期望的署名方式。
