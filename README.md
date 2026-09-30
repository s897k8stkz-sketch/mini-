# challenge-deliverable-auditor · 交付物审计器

> **一句话说明**：在点「提交」之前，用一条命令把交付物缺口（缺件 / 空文件 / 命名不命中）暴露出来，并用退出码给出结论。
>
> 出自挑战 **C5：GitHub Repository** —— 把 C4 产出的技能从「我电脑上的一个文件」变成「别人 clone 下来 5 分钟能跑的开源项目」。

输入一个目录 + 平台给出的要求清单原文（如 `*skill说明*,*.skill,*教学说明*,*demo*,*AI日志*`），
输出一份 Human 可读的 Markdown 报告 + 一份机器可读的 JSON 证据 + 一个退出码。

| 退出码 | 含义 |
| --- | --- |
| `0` | READY —— 清单每一项都命中 |
| `1` | NOT READY —— 至少一项 MISSING 或 EMPTY |
| `2` | 用法错误（参数缺失、目录不存在等） |

---

## 一、解决什么问题

每一次提交作业都有人在「缺一个文件」上翻车，而这个错误**不需要智能，只需要检查**：

- 平台写的是 `*教学说明*`，你交的是 `教学指南.md` —— 语义上完全正确，规则上不匹配；
- 用 `>` 重定向保存命令输出，写出了一个 **0 字节**的文件，自己也看不出来；
- 报告里写「已完成 5/5」，但没有任何机器可核验的证据。

审计器把这三类问题变成机器判定：**模式匹配 + 尺寸阈值 + 退出码**，并把结论落成 JSON 与
Markdown 双份证据，供第三方复核。它不判断内容质量——那是教师与 rubric 的事。

**它凭什么可信**：它对自己跑过。对一个真实仓库目录做审计，第一次输出 **1/5 项满足
NOT READY**，补齐后输出 **5/5 项满足 READY**（43 个文件）。这两次都是真实执行结果，
记录在 `examples/expected/` 与 `2025105400247_C4_demo.md` 中。

---

## 二、快速开始（clone 后 5 分钟内可跑）

只依赖 **Python 3.8+ 标准库**，没有第三方包，不需要虚拟环境。

```bash
git clone https://github.com/s897k8stkz-sketch/mini-.git
cd mini-

# 用仓库自带的三份样例目录跑一遍（无需准备任何东西）
python skills/challenge-deliverable-auditor/scripts/audit.py \
  --dir examples/sample-ready --spec "*skill说明*,*.skill,*教学说明*,*demo*,*AI日志*" \
  --json /tmp/audit.json --md /tmp/audit.md
echo "exit=$?"
```

期望：`exit=0`，控制台打印 5 行 `PASS`。

再跑一个**故意残缺**的样例，看它能否正确报错：

```bash
python skills/challenge-deliverable-auditor/scripts/audit.py \
  --dir examples/sample-incomplete --spec "*skill说明*,*.skill,*教学说明*,*demo*,*AI日志*"
echo "exit=$?"
```

期望：`exit=1`，并列出 `MISSING` / `EMPTY` 的具体文件名。两个命令都跑通，就说明环境没问题。

> Windows PowerShell 用户把续行符 `\` 换成反引号 `` ` ``，或把命令写成一行。

---

## 三、使用

```bash
python skills/challenge-deliverable-auditor/scripts/audit.py \
  --dir <要审计的目录> \
  --spec "<要求清单原文，逗号分隔>" \
  [--min-bytes N] [--json out.json] [--md out.md] [--quiet]
```

| 参数 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- |
| `--dir` | 是 | — | 被审计的目录 |
| `--spec` | 是 | — | 要求清单，逗号分隔；支持 `*` 通配，如 `*AI日志*` |
| `--min-bytes` | 否 | `1` | 小于该字节数视为 EMPTY（默认 0 字节即空文件） |
| `--json` | 否 | — | 把机器可读结果写到指定路径 |
| `--md` | 否 | — | 把 Markdown 报告写到指定路径 |
| `--quiet` | 否 | 关 | 只输出结论行，不打印逐项明细 |

**四种判定**（`verdict` 枚举，全部来自真实运行，不是设计意图）：

| verdict | 含义 |
| --- | --- |
| `PASS` | 有文件精确命中该模式且大于尺寸阈值 |
| `PASS_FUZZY` | 未精确命中，但存在大小写/全半角/空格归一化后命中的文件（提示而非通过） |
| `EMPTY` | 命中文件存在但字节数为 0（或小于 `--min-bytes`） |
| `MISSING` | 没有任何文件命中 |

**当作提交前的自检关卡**（推荐用法）：把 `--spec` 换成你当前挑战的真实清单原文，
在仓库根目录跑一次，`exit=0` 再点提交。

---

## 四、示例（真实输出，非手抄）

`examples/` 下有三个可复现样例目录，`examples/expected/` 里的期望输出由脚本调用审计器
**机器生成**。三份实测结果：

| 样例 | 构造方式 | 实测退出码 | 判定分布 |
| --- | --- | --- | --- |
| `sample-ready` | 五类交付物齐备且非空 | `0` | `PASS` × 5 |
| `sample-incomplete` | 缺 2 类、1 类为 0 字节 | `1` | `PASS` × 2、`MISSING` × 2、`EMPTY` × 1 |
| `sample-fuzzy` | 文件名大小写/全半角不一致 | `0` | `PASS_FUZZY` × 2 |

三种样例合起来覆盖了全部四种判定，改动审计器代码后可以拿它们当**回归基线**：
判定变了就说明改坏了。详见 [`examples/README.md`](examples/README.md)。

---

## 五、项目结构

```
mini-/
├── README.md                      # 本文件
├── LICENSE                        # MIT
├── .gitignore                     # 忽略可再生成物；build/ 等 CI 证据强制入库
├── AI_LOG.md                      # AI 使用日志（C5 要求）
├── ATTRIBUTION.md                 # 拿来说明：借鉴来源与致谢
├── CHANGELOG.md                   # 更新日志（Keep a Changelog 格式）
├── CONTRIBUTING.md                # 贡献指南与缺陷报告要求
│
├── skills/challenge-deliverable-auditor/   # ★ 本项目主线：审计器
│   ├── SKILL.md                   # 技能定义与使用说明
│   ├── scripts/audit.py           # 实现（纯标准库）
│   └── references/spec-format.md  # --spec 模式串格式说明
│
├── examples/                      # 可复现样例 + 机器生成的期望输出
│   ├── README.md
│   ├── sample-ready/  sample-incomplete/  sample-fuzzy/
│   └── expected/                  # *.json / *.md（脚本生成）
│
├── .github/
│   ├── workflows/repo-quality.yml # C5：脚本语法 + 样例回归 + 必备文件存在性
│   ├── workflows/build-paper.yml  # C2：LaTeX 真实编译
│   ├── ISSUE_TEMPLATE/            # bug_report / feature_request
│   └── PULL_REQUEST_TEMPLATE.md
│
└── 其他挑战内容（互不依赖，见第七节）
    ├── course-cn/  pipeline/  source/  glossary.csv  # C1 中文讲义管线
    ├── paper.tex  references.bib  c2-f1-probe/       # C2 论文与保真探针
    ├── 2025105400247_C4_*                            # C4 技能分享四件套
    └── build/  reports/                              # CI 与校验证据
```

---

## 六、技术栈

- **语言**：Python 3.8+（仅标准库：`argparse` / `pathlib` / `fnmatch` / `json` / `zipfile`）
- **无外部依赖**：无 `requirements.txt`，无虚拟环境要求，无网络访问
- **技能容器**：`.skill` 包为 ZIP 容器（顶层目录 = 技能名），文件头 `50 4B 03 04`
- **CI**：GitHub Actions（`ubuntu-latest`），本机无需安装任何东西
- **平台**：Windows / macOS / Linux 均可运行（脚本为纯 ASCII，路径用 `pathlib`）

---

## 七、AI 生成说明

本项目按挑战要求使用 AI 辅助开发，完整过程记录在 [`AI_LOG.md`](AI_LOG.md)，
人机分工与采纳/否决的判断记录在 [`ATTRIBUTION.md`](ATTRIBUTION.md) 与 C4 的 AI 日志中。

**一句话概括分工**：AI 负责澄清、编码、跑测；人负责选方向、核对数字是否真实、决定归档。

五条自设约束贯穿全程：

1. 要原文不要摘要（先读 `CHALLENGE.md` 与平台清单原文，不看二手转述）；
2. 要可执行不要可描述（结论必须能变成一条可复跑的命令）；
3. 证据必须机器生成（`examples/expected/` 由脚本生成，禁止手抄）；
4. 先跑再写文档（先对真实目录跑出结果，再落笔描述结果）；
5. 必须列出反例（每节至少给一个失败样例，如 `sample-incomplete`）。

**如实声明的局限**：未做大规模语料压测；未覆盖极端 Unicode 归一化场景；
审计器只做交付物存在性与命名判定，**不判断内容质量**。

---

## 八、借鉴来源

借鉴来源、原创边界与许可说明见 [`ATTRIBUTION.md`](ATTRIBUTION.md)。要点：

- 原创：审计器全部代码与文档、样例目录与生成脚本、`pipeline/` 讲义流水线、`c2-f1-probe/` 探针、本仓库工程文件；
- 借鉴：Claude Skill 的 `SKILL.md` 结构约定、Keep a Changelog 写法、语义化版本、GitHub Actions 官方 workflow 语法、Stanford CS146S 公开作业原文（C1，仅作翻译来源）。

## 九、License

[MIT](LICENSE) © 2026 s897k8stkz-sketch
