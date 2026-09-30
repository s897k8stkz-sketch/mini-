# 交付物审计器 · Web 版（C6）

一句话：把「本次挑战要交哪些文件」的要求清单粘进来，浏览器**在本地**扫一遍你选的文件夹，直接告诉你**能不能交**、缺什么、哪些是空文件、哪些是临时文件。

- 在线地址：<https://s897k8stkz-sketch.github.io/mini-/apps/c6-deliverable-auditor-web/>
- 免安装、免登录、文件**不上传**（全部判定在浏览器内存里完成）
- 判定内核与 C4 技能包 `challenge-deliverable-auditor` 的 Python 实现同源，等价性由 `tests/run-parity.ps1` 逐字段比对

## 30 秒上手

1. **①清单**：粘贴平台要求，形如 `*app链接*,*demo*,*repo链接*,*AI日志*`；或点「从挑战原文生成」让 AI 助手帮你抽
2. **②交付物**：点「选择文件夹」（或「选择多个文件」，或直接把文件夹拖进虚线区）
3. **③报告区**：自动出结论 `READY 可以提交` / `NOT READY 不可提交`，并列出每项判定与命中文件
4. **④要存档**：点「导出 JSON」「导出 Markdown」，或「复制」报告正文

## 判定语义（四种）

| 判定 | 含义 | 计入「满足」 |
|------|------|--------------|
| `PASS` | 命中要求且非空 | 是 |
| `PASS_FUZZY` | 命中要求但大小写/分隔符不完全一致（会在风险项里点名） | 是 |
| `EMPTY` | 命中要求但文件为 0 字节 | 否 |
| `MISSING` | 没找到对应文件 | 否 |

命令行外壳的退出码：`0` = READY；`1` = 存在 MISSING/EMPTY；`2` = 用法错误。

## 为什么可信（每条都能自己复跑）

```bash
# 正例：应 READY，退出码 0
node js/audit-cli.mjs --dir tests/fixtures/submit-ok --spec "*app链接*,*demo*,*repo链接*,*AI日志*"

# 反例：故意含 0 字节文件与占位文件，应 NOT READY，退出码 1
node js/audit-cli.mjs --dir tests/fixtures/submit-bad --spec "*app链接*,*demo*,*repo链接*,*AI日志*"

# 双实现等价性：Python 版 vs JS 版逐字段比对，应六项全 PASS
pwsh tests/run-parity.ps1
```

最近一次实跑结果见 [`tests/out/parity-report.json`](tests/out/parity-report.json)（6/6 PASS）与 [`docs/demo-cli-transcript.txt`](docs/demo-cli-transcript.txt)（三组夹具的真实输出）。

## 目录

| 路径 | 作用 |
|------|------|
| `index.html`、`css/styles.css` | 单页界面（四个分区：清单 / 交付物 / 报告 / AI 助手） |
| `js/audit-core.js` | 判定内核（纯函数，浏览器与命令行共用） |
| `js/app.js` | 界面交互：选文件夹 / 拖拽 / 出报告 / 导出 |
| `js/ai-client.js`、`js/app-ai.js` | 可选 AI 助手（OpenAI 兼容接口） |
| `js/audit-cli.mjs`、`js/inventory-fs.mjs` | 命令行外壳 + 文件系统扫描 |
| `sample/sample-data.js` | 一次点击即可看到报告的样例数据 |
| `tests/` | 三组夹具 + 规范 JSON 断言 + 浏览器路径检查 + 一致性跑批 |
| `docs/` | 首页截图与命令行实跑记录 |

## AI 助手（可选）

「④AI 助手」支持 OpenAI 兼容接口（OpenAI / DeepSeek / 月之暗面 / 通义 / 本地 vLLM 等）。**API Key 只写进你本机的 `localStorage`**，不写进页面源码、不进本仓库、不发往任何第三方服务器；不填 Key 也能用全部审计功能（审计内核本身不调用任何网络接口）。

## 已知限制（如实说明）

- 浏览器安全模型只允许读到**文件名、相对路径、字节大小**，**读不到文件内容**。「名字对不对、体量够不够」由判定内核负责，「内容切不切题」交给可选 AI 助手。
- 没有后端，所以没有多人协作、没有云端历史记录。
- 首页截图由 headless Edge 对本地静态服务实拍（`docs/demo-01-home.png`）；带报告的界面截图需要真实点击，未纳入本仓库。
