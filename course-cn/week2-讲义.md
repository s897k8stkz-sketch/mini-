# 第 2 周：行动项提取器

> 原文：week2/assignment.md ；上游提交：见 source/PINNED.txt

本周，我们将在一个人工智能（AI）驱动的最小 FastAPI + SQLite 应用上继续扩展：它能把自由形式的笔记转换为逐条列出的行动项。

***建议在动手之前先通读本文档全文。***

提示：预览本 Markdown 文件
- 在 Mac 上，按 `Command (⌘) + Shift + V`
- 在 Windows/Linux 上，按 `Ctrl + Shift + V`


## 快速开始

### Cursor 环境配置

按以下说明配置 Cursor 并打开你的项目：
1. 兑换 Cursor Pro 的免费一年：https://cursor.com/students
2. 下载 Cursor：https://cursor.com/download
3. 要启用 Cursor 命令行工具，请打开 Cursor，Mac 用户按 `Command (⌘) + Shift + P`（非 Mac 用户按 `Ctrl + Shift + P`）打开命令面板。输入：`Shell Command: Install 'cursor' command`。选中它并按回车。
4. 打开一个新的终端窗口，进入你的项目根目录，并运行：`cursor .`

### 当前应用

以下是启动当前起始应用的方法：
1. 激活你的 conda 环境。
```
conda activate cs146s 
```
2. 从项目根目录运行服务器：
```
poetry run uvicorn week2.app.main:app --reload
```
3. 打开浏览器并访问 http://127.0.0.1:8000/。
4. 熟悉应用的当前状态。确认你可以成功输入笔记，并生成提取出的行动项清单。

## 练习

对于每个练习，使用 Cursor 帮助你实现针对当前行动项提取器应用的指定改进。

在完成作业的过程中，请用 `writeup.md` 记录你的进展。务必包含你使用的提示词，以及你或 Cursor 所做的任何改动。我们将依据这份书面报告的内容评分。另外，请在代码中随处添加注释，记录你的改动。

### 练习项 1：搭建新功能

分析 `week2/app/services/extract.py` 中现有的 `extract_action_items()` 函数，它目前使用预定义启发式规则来提取行动项。

你的任务是实现一个 **由大语言模型驱动** 的替代方案 `extract_action_items_llm()`，它使用 Ollama，通过大语言模型完成行动项提取。

一些提示：
- 若要产生结构化输出（即由字符串组成的 JSON 数组），请参考这份文档：https://ollama.com/blog/structured-outputs
- 若要浏览可用的 Ollama 模型，请参考这份文档：https://ollama.com/library。注意：模型越大越耗资源，因此先从小模型开始。拉取并运行模型：`ollama run {MODEL_NAME}`

### 练习项 2：添加单元测试

在 `week2/tests/test_extract.py` 中为 `extract_action_items_llm()` 编写单元测试，覆盖多种输入（例如项目符号列表、带关键词前缀的行、空输入）。

### 练习项 3：重构现有代码以提升可读性

对后端代码进行重构，尤其关注定义良好的 API 契约/数据模式、数据库层的清理、应用生命周期与配置、错误处理。

### 练习项 4：使用智能体模式自动化小任务

1. 将大语言模型驱动的提取集成为一个新端点。更新前端，加入一个 "Extract LLM" 按钮，点击后通过该新端点触发提取流程。

2. 再暴露一个用于获取全部笔记的端点。更新前端，加入一个 "List Notes" 按钮，点击后抓取并显示这些笔记。

### 练习项 5：从代码库生成 README

***学习目标：***
*学生将了解 AI 如何审视一个代码库并自动生成文档，从而展示 Cursor 解析代码上下文、并将其转写为人类可读形式的能力。*

使用 Cursor 分析当前代码库，并生成一份结构良好的 `README.md` 文件。该 README 至少应包含：
- 项目的简要概述
- 如何安装并运行本项目
- API 端点与功能
- 运行测试套件的说明

## 交付物

按其中给出的说明填写 `week2/writeup.md`。确保你的所有改动都在代码库中有记录。

## 评分量规（共 100 分）

- 第 1 至第 5 部分每部分 20 分（生成的代码 10 分，每个提示词 10 分）。

---
*本译文由 C1 翻译流水线产出，术语以 `glossary.csv` 为准。*
