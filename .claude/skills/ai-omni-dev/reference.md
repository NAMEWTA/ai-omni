# AI Omni 技术参考文档

## 项目信息

| 属性 | 值 |
|------|-----|
| 项目名称 | AI Omni (原 AI Any) |
| 插件 ID | my-vscode-extension |
| VS Code 版本 | ^1.85.0 |
| 主入口 | ./dist/extension/index.js |

## 技术架构

```
┌─────────────────────────────────────────────────────────┐
│                    VS Code Extension                     │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │  Commands   │    │  Services   │    │   Webview   │  │
│  │             │    │             │    │   Manager   │  │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘  │
│         │                  │                  │          │
│         └──────────────────┼──────────────────┘          │
│                            │                             │
│                    ┌───────┴───────┐                     │
│                    │  VS Code API  │                     │
│                    └───────────────┘                     │
└─────────────────────────────────────────────────────────┘
                            │
                     postMessage
                            │
┌─────────────────────────────────────────────────────────┐
│                    Webview (Vue 3)                       │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │ Components  │    │   Stores    │    │   API Layer │  │
│  │   (Vue)     │    │   (Pinia)   │    │  (vscode.ts)│  │
│  └─────────────┘    └─────────────┘    └─────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## 文件清单

### Extension 层

| 文件 | 用途 |
|------|------|
| `extension/index.ts` | 插件入口，activate/deactivate |
| `extension/commands/openWebview.ts` | 打开 Webview 命令 |
| `extension/webview/WebviewPanel.ts` | Webview Panel 管理类 |
| `extension/webview/getHtml.ts` | 生成 Webview HTML |

### Webview 层

| 文件 | 用途 |
|------|------|
| `webview/src/main.ts` | Vue 应用入口 |
| `webview/src/App.vue` | 根组件 |
| `webview/src/api/vscode.ts` | VS Code 通信封装 |
| `webview/src/styles/main.css` | 全局样式 |
| `webview/vite.config.ts` | Vite 构建配置 |

### 共享层

| 文件 | 用途 |
|------|------|
| `shared/types/message.ts` | 消息类型定义 |
| `shared/constants/index.ts` | 共享常量 |

### 配置文件

| 文件 | 用途 |
|------|------|
| `package.json` | 插件配置、命令、依赖 |
| `tsconfig.json` | Extension TypeScript 配置 |
| `.vscode/launch.json` | 调试配置 |
| `.vscode/tasks.json` | 构建任务 |

## 命令列表

| 命令 ID | 标题 | 说明 |
|---------|------|------|
| `my-extension.open` | Open My Webview | 打开主 Webview 面板 |

## 消息类型

| 类型 | 方向 | 说明 |
|------|------|------|
| `ping` | Webview → Extension | 测试连接 |
| `pong` | Extension → Webview | 连接响应 |
| `showInfo` | Webview → Extension | 显示信息提示 |
| `showError` | Webview → Extension | 显示错误提示 |

## VS Code CSS 变量速查

### 颜色

```css
--vscode-foreground              /* 前景色 */
--vscode-editor-background       /* 编辑器背景 */
--vscode-widget-border           /* 边框色 */
--vscode-button-background       /* 按钮背景 */
--vscode-button-foreground       /* 按钮前景 */
--vscode-button-hoverBackground  /* 按钮悬停 */
--vscode-input-background        /* 输入框背景 */
--vscode-input-foreground        /* 输入框前景 */
--vscode-input-border            /* 输入框边框 */
--vscode-textLink-foreground     /* 链接色 */
```

### 字体

```css
--vscode-font-family             /* 字体族 */
--vscode-font-size               /* 字号 */
--vscode-editor-font-family      /* 编辑器字体 */
```

## 依赖版本

### 根目录

```json
{
  "@types/node": "^20.10.0",
  "@types/vscode": "^1.85.0",
  "typescript": "^5.3.0"
}
```

### Webview

```json
{
  "vue": "^3.4.0",
  "@vitejs/plugin-vue": "^5.0.0",
  "vite": "^5.0.0",
  "typescript": "^5.3.0",
  "vue-tsc": "^2.0.0"
}
```

## 构建输出

```
dist/
├─ extension/
│   ├─ index.js           # 插件入口
│   ├─ index.js.map
│   ├─ commands/
│   │   └─ openWebview.js
│   └─ webview/
│       ├─ WebviewPanel.js
│       └─ getHtml.js
└─ webview/
    ├─ index.html
    └─ assets/
        ├─ index.js       # Vue 打包
        └─ index.css      # 样式
```

## 调试配置

### Run Extension

启动新的 VS Code 窗口，加载当前扩展进行调试。

```json
{
  "name": "Run Extension",
  "type": "extensionHost",
  "request": "launch",
  "args": ["--extensionDevelopmentPath=${workspaceFolder}"],
  "outFiles": ["${workspaceFolder}/dist/**/*.js"],
  "preLaunchTask": "${defaultBuildTask}"
}
```

## 后续规划

### 功能扩展

- [ ] 集成 GitHub Copilot Language Model API
- [ ] 实现 codeXray 项目分析功能
- [ ] 添加侧边栏 WebviewViewProvider
- [ ] 支持多 Webview 场景
- [ ] 添加 TreeView 文件浏览器

### 技术优化

- [ ] 使用 esbuild/tsup 优化构建
- [ ] 添加 Pinia 状态管理
- [ ] 实现通信 SDK 封装
- [ ] 添加单元测试
- [ ] 添加 ESLint + Prettier
