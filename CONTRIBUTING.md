# 贡献指南（Contributing）

感谢你愿意改进这个仓库。它只解决一件事：**在点"提交"之前，用一条可复跑的命令
把交付物缺口暴露出来**。因此最受欢迎的贡献是「能复现的缺陷报告」和「新的失败样例」。

## 一、提交缺陷（Issue）

请到本仓库的 **Issues → New issue**，选择 `Bug report` 模板。一份合格的缺陷报告
包含四样东西，缺一样都会让维护者无法复现：

1. **完整命令**：含 `--dir` 与 `--spec` 的原文（`--spec` 请直接粘贴平台字段，不要手改）；
2. **实际输出**与**期望输出**；
3. **目录结构**：`tree` 或 `ls -la` 的结果（文件名可脱敏，但**长度与扩展名要保留**）；
4. **环境**：`python --version` 与操作系统。

## 二、新增失败样例（优先级最高）

这个工具的价值取决于样例覆盖度。新增一个样例 = 一次可量化的能力提升，流程只有三步：

```bash
# 1. 在 examples/ 下新建样例目录，放入能触发目标判定的文件
mkdir examples/sample-你的场景

# 2. 让审计器生成期望输出（机器生成，禁止手抄）
python skills/challenge-deliverable-auditor/scripts/audit.py \
  --dir examples/sample-你的场景 \
  --spec "*skill说明*,*.skill,*教学说明*,*demo*,*AI日志*" \
  --json examples/expected/sample-你的场景.json \
  --md   examples/expected/sample-你的场景.md
echo "exit=$?"

# 3. 在 examples/README.md 的样例表里补一行，说明它演示哪一类判定
```

**提交样例时必须连"它能触发什么"一起说清楚**——没有期望输出的样例等于没有样例。

## 三、代码贡献（Pull Request）

1. Fork 本仓库，从 `main` 切出分支：`fix/xxx` 或 `feat/xxx`；
2. 保持**零外部依赖**（只用 Python 标准库，Python ≥ 3.8 可运行）；
3. 改动后本地跑一遍自检，三项全绿再提交 PR：

```bash
python -m py_compile pipeline/*.py skills/challenge-deliverable-auditor/scripts/*.py
python skills/challenge-deliverable-auditor/scripts/audit.py --dir examples/sample-ready \
  --spec "*skill说明*,*.skill,*教学说明*,*demo*,*AI日志*"; echo "exit=$?   # 期望 0"
```

4. PR 描述里写清「改了什么 / 为什么 / 怎么验证」；CI（`repo-quality.yml`）会自动复核。

### 编码约定

- 文件名用**英文或拼音 + 连字符**，避免全角字符与空格；中文内容写在文件内部；
- 输出给机器读的结论一律用**退出码**表达（`0` 达标 / `1` 未达标 / `2` 用法错误）；
- 写给人的结论一律**落盘为文件**（JSON + Markdown 双份），不要只打印到终端。

## 四、边界（什么不会被接受）

- 把审计器改成"能顺便上传/提交到平台"——本工具在设计上就是**只读**的，
  写入动作必须由学生本人在平台上确认；
- 引入第三方依赖来实现本可用标准库完成的功能；
- 把手抄的结果冒充"机器生成的证据"。

## 五、行为准则

讨论对事不对人：可以否决方案，不可以贬低人。争议以「能否复现」裁决，
不以「谁说的」裁决。
