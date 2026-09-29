# 第 6 周：用 Semgrep 扫描并修复漏洞

> 原文：week6/assignment.md ；上游提交：见 source/PINNED.txt

## 作业概览
使用 **Semgrep** 对 `week6/` 中提供的应用做静态分析。对发现的问题进行分诊，并至少修复 3 个安全问题。在书面报告中说明 Semgrep 暴露了哪些问题，以及你是如何修复它们的。

## 了解 Semgrep
Semgrep 是一个开源的静态分析工具，用于搜索代码、发现缺陷，并落实安全护栏与编码规范。

1. 点击[这里](https://github.com/semgrep/semgrep/blob/develop/README.md)了解 Semgrep。

2. 按上述链接中的安装说明操作。你可以自行选择使用 **Semgrep Appsec Platform** 还是 **CLI 工具**。

## 扫描任务

### 扫描对象
- 后端 Python（FastAPI）：`week6/backend/`
- 前端 JavaScript：`week6/frontend/`
- 依赖项：`week6/requirements.txt`
- 配置/环境变量（用于排查密钥）：`week6/` 内的文件

### 运行一次通用安全扫描，并针对密钥和依赖项做专项扫描。

在**作业仓库根目录**下运行以下命令，应用一套精选的 CI 风格规则包（同时包含代码规则与密钥规则）：
```bash
semgrep ci --subdir week6
```

## 任务
1. 从 Semgrep 识别出的问题中任选 3 个，用你选择的 AI 编码工具修复它们。

2. 展示精确的改动，并解释缓解措施（例如参数化 SQL、更安全的 API、更强的加密、经过净化的 DOM 写入、受限的 CORS、依赖升级）。

3. 重要：确保修复后应用仍能运行、测试仍能通过。

## 交付物
### 1. 发现概览
- 概述 Semgrep 报告的问题类别（SAST/Secrets/SCA）。
- 说明你选择不处理的误报或噪声规则，以及原因。

### 2. 三处修复（修改前 → 修改后）
对每个已修复的问题：
- 文件与行号
- Semgrep 标记的规则/类别
- 风险简述
- 你的改动（简短代码差异或说明、AI 编码工具使用情况）
- 为什么这能缓解该问题

## 提示
- 优先采用最小、有针对性的改动，直接解决根因。
- 每次修复后重跑 Semgrep，确认该发现已解决，且没有引入新的问题。
- 对于依赖项，记录升级后的版本；若使用了供应链扫描，附上公告链接。

## 提交说明
1. 确保所有改动都已推送到你的远程仓库以供评分。
2. 确保你已在作业仓库中把 brentju 和 febielin 都添加为协作者。
2. 通过 Gradescope 提交。

*本译文由 C1 翻译流水线产出，术语以 glossary.csv 为准。*
