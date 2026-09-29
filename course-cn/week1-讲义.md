# 第 1 周：提示词技术

> 原文：week1/assignment.md ；上游提交：见 source/PINNED.txt

你将通过为具体任务设计提示词，来练习多种提示词技术。每个任务的说明都写在对应源文件的开头。

## 安装

请先确认已完成顶层 `README.md` 中描述的安装步骤。

## 安装 Ollama

我们将使用一个名为 [Ollama](https://ollama.com/) 的工具，在你的本机运行不同的前沿大语言模型。请从以下方式中选择一种：

- macOS（Homebrew）：
  ```bash
  brew install --cask ollama 
  ollama serve
  ```

- Linux（推荐）：
  ```bash
  curl -fsSL https://ollama.com/install.sh | sh
  ```

- Windows：
  从 [ollama.com/download](https://ollama.com/download) 下载并运行安装程序。

验证安装：
```bash
ollama -v
```

在运行测试脚本之前，请确认已拉取以下模型。你只需执行一次（除非之后删除了模型）：
```bash
ollama run mistral-nemo:12b
ollama run llama3.1:8b
```

## 技术与源文件

- k 样本提示（k-shot prompting）—— `week1/k_shot_prompting.py`
- 思维链（chain-of-thought）—— `week1/chain_of_thought.py`
- 工具调用（tool calling）—— `week1/tool_calling.py`
- 自洽性提示（self-consistency prompting）—— `week1/self_consistency_prompting.py`
- 检索增强生成（RAG，Retrieval-Augmented Generation）—— `week1/rag.py`
- 反思循环（Reflexion）—— `week1/reflexion.py`

## 交付物

- 阅读每个文件中的任务说明。
- 设计并运行提示词（找出代码中所有被标记为待办的位置）。这应当是你唯一需要改动的内容（也就是不要去改动模型本身）。
- 反复迭代改进结果，直到测试脚本通过。
- 保存每种技术的最终提示词与输出。
- 提交时务必附上每种提示词技术文件的完整代码。***请再次确认所有待办标记都已落实。***

## 评分量规（共 60 分）

- 6 种不同提示词技术，每种完成的提示词各得 10 分

---
*本译文由 C1 翻译流水线产出，术语以 `glossary.csv` 为准。*
