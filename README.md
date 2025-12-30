# AI Omni

AI Omni（原称 AI Any）是一个基于 VSCode 的多功能 AI 插件，旨在利用 AI（如 GitHub Copilot）处理开发任务，包括代码注释、语言转换、任务规划和头脑风暴。插件集成 VSCode API、LangGraph.js、TypeScript 和 Vue3，实现自动化项目分析、文档生成和代码增强。

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
│   └─ webview/                # Webview 相关逻辑
│       ├─ WebviewPanel.ts
│       └─ getHtml.ts
│
├─ webview/                    # 前端（Vue3 + Vite）
│   ├─ index.html
│   ├─ package.json
│   ├─ vite.config.ts
│   └─ src/
│       ├─ main.ts
│       ├─ App.vue
│       ├─ api/                # 与 extension 通信
│       └─ styles/
│
├─ shared/                     # 前后端共享
│   ├─ types/
│   │   └─ message.ts
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

在新开的 VS Code 窗口中，按 `Ctrl+Shift+P`，输入 `Open My Webview` 即可打开 Webview 面板。

## 开发命令

| 命令 | 说明 |
|------|------|
| `npm run build` | 构建整个项目 |
| `npm run build:ext` | 只构建 Extension |
| `npm run build:web` | 只构建 Webview |
| `npm run watch:ext` | 监听模式构建 Extension |
| `npm run dev:web` | Webview 开发模式（Vite） |

## 技术栈

- **Extension**: TypeScript + VS Code API
- **Webview**: Vue 3 + Vite + TypeScript
- **通信**: postMessage API
- **共享层**: TypeScript 类型定义