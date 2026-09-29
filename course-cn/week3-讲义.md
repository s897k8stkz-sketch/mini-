# 第 3 周：构建自定义 MCP 服务器

> 原文：week3/assignment.md ；上游提交：见 source/PINNED.txt

设计并实现一个 Model Context Protocol（MCP，模型上下文协议）服务器，用它封装一个真实的外部 API。你可以：
- 让它 **在本地运行**（STDIO 传输），并集成到某个 MCP 客户端（例如 Claude Desktop）。
- 或者让它 **远程运行**（HTTP 传输），由模型智能体或客户端调用。这种方式更难，但可额外加分。

若按 MCP Authorization 规范加入认证（API 密钥或 OAuth2），可获得加分。

## 学习目标
- 理解 MCP 的核心能力：工具（tools）、资源（resources）、提示（prompts）。
- 实现带类型化参数的工具定义，以及健壮的错误处理。
- 遵循日志与传输层最佳实践（STDIO 服务器不得把日志写往 stdout）。
- 可选：为 HTTP 传输实现授权流程。

## 要求
1. 选择一个外部 API，并记录你将使用哪些端点。例如：天气、GitHub issue、Notion 页面、影视数据库、日历、任务管理器、金融/加密货币、旅行、体育统计。
2. 至少暴露两个 MCP 工具。
3. 实现基本的韧性：
   - 对 HTTP 失败、超时与空结果给出优雅的错误处理。
   - 遵守 API 速率限制（例如简单退避，或面向用户的提示）。
4. 打包与文档：
   - 提供清晰的安装说明、环境变量与运行命令。
   - 给出一个示例调用流程（在客户端里输入/点击什么可以触发这些工具）。
5. 选择一种部署模式：
   - 本地：STDIO 服务器，可在你本机运行，并能被 Claude Desktop 或 Cursor 这类 AI IDE 发现。
   - 远程：可通过网络访问的 HTTP 服务器，可被支持 MCP 的客户端或智能体运行时调用。若完成部署且可达，可额外加分。
6. （可选）加分项：认证
   - 通过环境变量与客户端配置支持 API 密钥；或
   - 为 HTTP 传输支持 OAuth2 风格的 bearer token，校验 token 的受众（audience），且绝不把 token 透传给上游 API。

## 交付物
- `week3/` 下的源代码（建议放在 `week3/server/`，并有一个清晰的入口，例如 `main.py` 或 `app.py`）。
- `week3/README.md`，其中包含：
  - 前置条件、环境配置与运行说明（本地和/或远程）。
  - 如何配置 MCP 客户端（本地可参考 Claude Desktop 示例）或远程的智能体运行时。
  - 工具参考：名称、参数、示例输入/输出与预期行为。

## 评分量规（共 90 分）
- 功能（35）：实现 2 个以上工具、API 集成正确、输出有意义。
- 可靠性（20）：输入校验、错误处理、日志、对速率限制的感知。
- 开发者体验（20）：清晰的安装/文档、易于在本地运行、合理的目录结构。
- 代码质量（15）：代码可读、命名达意、复杂度最小、在适用处使用类型标注。
- 额外加分（10）：
  - +5 远程 HTTP MCP 服务器，可被 OpenAI/Claude SDK 这类智能体/客户端调用。
  - +5 正确实现认证（API 密钥，或带受众校验的 OAuth2）。

## 参考链接
- MCP 服务器快速上手：[modelcontextprotocol.io/quickstart/server](https://modelcontextprotocol.io/quickstart/server)。
*注意：不得直接提交该示例。*
- MCP 授权（HTTP）：[modelcontextprotocol.io/specification/2025-06-18/basic/authorization](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization)
- Cloudflare 上的远程 MCP（Agents）：[developers.cloudflare.com/agents/guides/remote-mcp-server/](https://developers.cloudflare.com/agents/guides/remote-mcp-server/)。部署前可先用 modelcontextprotocol inspector 工具在本地调试你的服务器。
- https://vercel.com/docs/mcp/deploy-mcp-servers-to-vercel 如果你选择做远程 MCP 部署，Vercel 是个不错的选择，且有免费额度。

---
*本译文由 C1 翻译流水线产出，术语以 `glossary.csv` 为准。*
