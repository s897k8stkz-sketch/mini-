# examples —— 三个可复现样例

这里放的是**能被重复跑出同样结论**的最小目录。每个样例都配了
`expected/` 下的期望输出，而**期望输出是审计器真实生成的**，不是手抄的结果：
把下面「怎么跑」里的命令加上 `--json` / `--md` 指向 `expected/` 同名文件重跑一遍，
再和自己 clone 出来的结果逐字段比对，就能验证这一点。

用途有二：
1. 你 clone 下来不用读源码，就能看到四种判定长什么样；
2. 你改审计器代码后，可以用它们做**回归基线**——判定变了就是改坏了。

## 怎么跑

在仓库根目录执行（无需安装依赖，Python ≥ 3.8）：

```bash
# 样例 A：合格目录 —— 期望 exit 0（READY）
python skills/challenge-deliverable-auditor/scripts/audit.py \
  --dir examples/sample-ready \
  --spec "*skill说明*,*.skill,*教学说明*,*demo*,*AI日志*"; echo "exit=$?"

# 样例 B：残缺目录 —— 期望 exit 1（NOT READY）
python skills/challenge-deliverable-auditor/scripts/audit.py \
  --dir examples/sample-incomplete \
  --spec "*skill说明*,*.skill,*教学说明*,*demo*,*AI日志*"; echo "exit=$?"

# 样例 C：清单里没写通配符 —— 期望 exit 0（模糊命中）
python skills/challenge-deliverable-auditor/scripts/audit.py \
  --dir examples/sample-fuzzy \
  --spec "教学说明,demo"; echo "exit=$?"
```

## 实测结果（当前仓库）

| 样例 | 清单 | 退出码 | ready | 满足项 | 判定分布 | 风险项 | 文件数 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `sample-ready` | `*skill说明*,*.skill,*教学说明*,*demo*,*AI日志*` | **0** | true | 5/5 | PASS ×5 | 0 | 5 |
| `sample-incomplete` | 同上 | **1** | false | 2/5 | PASS ×2、MISSING ×2、EMPTY ×1 | 2 | 5 |
| `sample-fuzzy` | `教学说明,demo` | **0** | true | 2/2 | PASS_FUZZY ×2 | 0 | 2 |

## 每个样例在演示什么

### `sample-ready` —— 五类判定全 PASS

五个文件分别精确命中五条模式，其中 `demo-package.skill` 是一个**结构合法的 ZIP 容器**
（顶层目录 = 技能名，内含 `SKILL.md` 与 `scripts/run.py`），用来证明 `*.skill`
命中的不只是一个空壳。

### `sample-incomplete` —— 一次覆盖三类静默失败

这是**最重要的样例**，因为它还原的都是真实踩过的坑：

| 文件 | 判定 | 说明 |
| --- | --- | --- |
| `C4-skill说明.md` | PASS | 名字命中 `*skill说明*`，内容非空 |
| `C4-demo.md` | PASS | 名字命中 `*demo*`，内容非空 |
| `C4-AI日志.md` | **EMPTY** | 文件在、名字对，但 **0 字节**——肉眼最容易漏的一类 |
| `技能说明.md` | 不命中 | 人名它叫"技能说明"，机器要的是字面量 `skill说明`；这正是"模式不对齐" |
| `新建文本文档.txt` | 不命中 | 占位垃圾文件，会被一起提交进目录 |
| （缺失 `*.skill`） | **MISSING** | 没有任何 `.skill` 包 |
| （缺失 `*教学说明*`） | **MISSING** | 教学说明根本没写 |

注意 `技能说明.md` 的存在方式：它**不会**让 `*skill说明*` 变成 PASS——审计器不会
"猜你指的是它"。这就是为什么提交前必须用平台的**原文清单**跑一遍。

### `sample-fuzzy` —— `PASS_FUZZY` 与 `PASS` 的区别

当清单项是 `教学说明`（没有 `*`）时，审计器只能做子串匹配，于是命中
`C4-教学说明.md` 得到 `PASS_FUZZY`。结论仍是"可用"，但它会提示你：
**按平台模式原样改名对齐更稳**。这与"完全一致"是两种不同的信心等级，
混为一谈就会在评分时吃到意外扣分。

## 期望输出

```
expected/
├── sample-ready.md / .json           # 由 audit.py --md / --json 生成
├── sample-incomplete.md / .json
└── sample-fuzzy.md / .json
```

`.json` 里含完整机器可读报告：`ready`、`passed/required`、`requirements[]`（每项带
`verdict` 与 `matches[]`）、`risks[]`、`inventory[]`（每个文件的字节数）。
第三方可以拿它与自己跑出来的结果逐字段比对。

## 想自己加一个样例？

见 `../CONTRIBUTING.md` 第二节，三步即可。
