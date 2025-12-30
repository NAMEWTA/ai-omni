---
name: workflow
description: 开发工作流模块。包含 Extension-Webview 通信机制详解、功能点开发标准流程等工作流文档。当需要了解数据流、开发规范、标准流程时使用。
---

# 开发工作流文档

本模块包含 AI Omni 项目的核心开发工作流文档，帮助开发者理解架构并按规范进行功能开发。

## 文档清单

| 文档 | 说明 |
|------|------|
| [extension-webview-communication.md](extension-webview-communication.md) | Extension ↔ Webview 数据流通信机制详解 |
| [feature-development-guide.md](feature-development-guide.md) | 功能点开发标准流程指南 |

## Quick Start

### 理解通信机制

```
Webview (Vue3)                    Extension (Node.js)
     │                                  │
     │── vscode.postMessage({...}) ────▶│ onDidReceiveMessage
     │                                  │
     │◀── panel.webview.postMessage ────│ 处理逻辑
     │                                  │
  window.addEventListener('message')   
```

### 开发新功能的标准步骤

1. **定义消息类型** → `shared/types/message.ts`
2. **实现 Extension 处理** → `extension/webview/WebviewPanel.ts`
3. **实现 Webview UI** → `webview/src/`
4. **注册命令（如需要）** → `package.json` + `extension/commands/`
5. **构建测试** → `npm run build` + F5

## 使用说明

阅读 [extension-webview-communication.md](extension-webview-communication.md) 了解：
- 完整的通信时序图
- 各层代码职责
- 消息类型定义规范
- 安全注意事项

阅读 [feature-development-guide.md](feature-development-guide.md) 了解：
- 功能点开发完整流程
- 代码模板与示例
- 测试与调试方法
