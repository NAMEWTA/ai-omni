# AI Omni

AI Omni 是一个 VS Code 扩展，通过将 GitHub Copilot 的语言模型能力封装为 OpenAI 和 Anthropic 兼容的 API 接口，使得外部应用程序可以通过标准 API 调用来使用 Copilot 的 AI 能力。

## 功能特性

- 🤖 **模型选择**: 从 GitHub Copilot 可用模型中选择
- 🔌 **API 服务器**: 在指定端口启动 HTTP 服务器
- 📡 **OpenAI 兼容**: 支持 `/v1/chat/completions` 和 `/v1/models` 端点
- 🔮 **Anthropic 兼容**: 支持 `/v1/messages` 端点
- 💬 **流式响应**: 支持 SSE (Server-Sent Events) 流式输出
- 🎛️ **简洁 UI**: 通过侧边栏 Webview 进行控制

## 项目结构

```
ai-omni/
├─ package.json                # VS Code 插件主配置
├─ tsconfig.json               # Extension TypeScript 配置
├─ .vscode/
│   ├─ launch.json             # 调试配置
│   └─ tasks.json              # 构建任务
│
├─ extension/                  # 插件后端（Node / VS Code API）
│   ├─ index.ts                # 插件入口 activate
│   ├─ commands/               # 命令注册
│   │   └─ openWebview.ts
│   ├─ services/               # 核心服务
│   │   ├─ ApiServer.ts        # HTTP API 服务器
│   │   └─ CopilotService.ts   # Copilot 集成服务
│   └─ webview/                # Webview 相关逻辑
│       ├─ SidebarViewProvider.ts
│       ├─ WebviewPanel.ts
│       └─ getHtml.ts
│
├─ webview/                    # 前端（Vue3 + Vite）
│   ├─ index.html
│   ├─ package.json
│   ├─ vite.config.ts
│   └─ src/
│       ├─ main.ts
│       ├─ App.vue             # 主界面（模型选择、端口配置、服务控制）
│       ├─ api/                # 与 extension 通信
│       └─ styles/
│
├─ shared/                     # 前后端共享
│   ├─ types/
│   │   ├─ api.ts              # OpenAI/Anthropic API 类型定义
│   │   └─ message.ts          # 消息类型定义
│   └─ constants/
│
└─ dist/                       # 构建输出
    ├─ extension/              # 打包后的插件
    └─ webview/                # Vue build 输出
```

## 快速开始

### 1. 安装依赖

```bash
# 安装根目录依赖
npm install

# 安装 webview 依赖
cd webview && npm install
```

### 2. 构建项目

```bash
npm run build
```

### 3. 调试运行

按 **F5** 或在 VS Code 中选择「Run Extension」启动调试。

## 使用方法

1. 在 VS Code 左侧活动栏找到 **AI Omni** 图标并点击
2. 在侧边栏中选择要使用的 Copilot 模型
3. 设置 API 服务器端口（默认 11435）
4. 点击「启动服务」按钮
5. 使用任何支持 OpenAI 或 Anthropic API 的客户端连接到 `http://localhost:<port>`

## API 端点

启动服务后，以下端点可用：

| 方法 | 端点 | 说明 | 兼容性 |
|------|------|------|--------|
| GET | `/v1/models` | 获取可用模型列表 | OpenAI |
| POST | `/v1/chat/completions` | 聊天补全 | OpenAI |
| POST | `/v1/messages` | 消息对话 | Anthropic |
| GET | `/health` | 健康检查 | - |

### OpenAI 兼容示例

```bash
curl http://localhost:11435/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### Anthropic 兼容示例

```bash
curl http://localhost:11435/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: any" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-3",
    "max_tokens": 1024,
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### 流式响应

在请求中添加 `"stream": true` 参数即可启用流式响应。

## 开发命令

| 命令 | 说明 |
|------|------|
| `npm run build` | 构建整个项目 |
| `npm run build:ext` | 只构建 Extension |
| `npm run build:web` | 只构建 Webview |
| `npm run watch:ext` | 监听模式构建 Extension |
| `npm run dev:web` | Webview 开发模式（Vite） |

## 技术栈

- **Extension**: TypeScript + VS Code API + Node.js HTTP
- **Webview**: Vue 3 + Vite + TypeScript
- **通信**: postMessage API
- **API 服务**: 原生 Node.js HTTP 模块
- **共享层**: TypeScript 类型定义

## 注意事项

- 需要安装并登录 GitHub Copilot 扩展
- API 服务器仅在本地运行，不建议暴露到公网
- 模型可用性取决于您的 Copilot 订阅级别