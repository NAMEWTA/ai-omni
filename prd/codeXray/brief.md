# codeXray VSCode 插件需求概述：项目理解与文档生成系统

## 项目背景
codeXray 是一个多功能 VSCode 插件，旨在通过 AI 驱动的工作流提升开发效率，支持代码注释、语言转换、任务规划和头脑风暴等任务。该插件的核心是集成 GitHub Copilot 的 Language Model API 与 VSCode Extension API，实现自动化项目分析和文档生成。

本需求概述聚焦于插件的第二个功能点：**项目遍历、整体理解与文档生成**，以及**代码注释生成**。此功能允许用户指定目录或文件夹，触发 AI 工作流，逐步遍历项目结构，形成全面的项目理解文档系统，并基于此为每个文件生成行级注释。通过分层分析（以目录为单位）和动态上下文控制，确保处理大型项目时避免上下文溢出，同时提供逐步披露的输出方式，提升用户体验和准确性。

## 需求目标
- **主要目标**：实现 AI 驱动的项目扫描和理解，生成结构化文档，并为代码添加完整注释，支持自定义注释语言（如中文）。
- **次要目标**：
  - 确保 scalability：处理大型项目时采用分层策略，避免 AI 模型上下文限制。
  - 用户可控性：允许指定目录、注释语言和输出格式。
  - 集成性：无缝连接 Copilot API，作为插件的核心 AI 引擎。
  - 准确性和隐私：逐步披露信息，仅处理用户指定目录，不发送敏感数据未经授权。
- **预期效果**：用户通过命令或侧边栏界面指定目录后，插件自动生成项目概述文档（e.g., PROJECT_OVERVIEW.md），并可选地为文件添加注释，提升项目维护和团队协作效率。

## 功能范围
### 在范围内的功能
- 项目遍历：递归扫描指定目录，构建文件树，过滤非代码文件。
- 分层理解：以目录为单位分析结构、文件功能、方法/函数列表。
- 文档生成：汇总成 Markdown 文档，包括文件统计、目录职责、模块交互。
- 代码注释：基于整体上下文，为每个文件逐行添加注释，支持指定语言。
- 动态上下文控制：使用逐步披露策略（bottom-up 或 divide-and-conquer），管理 AI Prompt 以避免 token 溢出。
- 用户交互：进度反馈、预览确认、配置选项。

### 不在范围内的功能
- 不涉及 AI 模型训练或自定义 LLM，仅利用 Copilot。
- 不包括实时协作或版本控制集成（e.g., Git）。
- 不处理非代码文件（如图像、配置）的深度分析。
- 暂不支持多项目同时分析，将在后续迭代扩展。
- 不包括自动代码重构，仅限于理解和注释。

## 详细功能描述
### 1. 项目遍历与文件树构建
- **触发时机**：用户通过命令（如 'aiomni.codexray.analyzeProject'）指定目录，或从资源管理器右键菜单启动。
- **步骤**：
  1. 使用 Node.js fs 和 path 模块递归扫描目录。
  2. 过滤代码文件（e.g., .ts, .js, .py），忽略非相关文件（如 .git, node_modules）。
  3. 构建内存中文件树结构：包含路径、类型（directory/file）、内容摘要。
- **输出**：一个 JSON 对象表示的项目知识库，用于后续分析。

### 2. 分层项目理解（以目录为单位）
- **策略**：采用 "自底向上" 分层方法，动态控制上下文：
  - **目录级分析**：为每个目录生成摘要 Prompt："分析以下文件列表，总结目录职责和业务模块划分。"
  - **文件级分析**：为每个文件提取功能、方法/函数列表 Prompt："描述文件主要功能，列出所有类/方法/函数及其作用。"
  - **逐步披露**：从小目录开始，逐步整合到父目录，避免一次性发送全项目内容。
  - **上下文管理**：每个 AI 调用仅包含当前层信息 + 相关摘要，控制 token 在模型限额内（e.g., gpt-4o 的 64K）。
- **集成 Copilot**：使用 LanguageModelChat.sendRequest 发送 Prompt，处理流式响应。
- **输出**：更新文件树 JSON，添加描述、函数列表。

### 3. 整体文档生成
- **输入**：完整文件树 JSON。
- **处理**：Prompt："根据项目结构生成架构文档，包括文件数、核心目录功能、模块交互流程。"
- **输出**：生成 Markdown 文件（e.g., PROJECT_OVERVIEW.md），写入用户指定位置或工作区根目录。
- **格式示例**：
  - 项目统计：文件数、目录数。
  - 目录树视图：树状结构 + 描述。
  - 函数映射：表格列出文件 -> 函数 -> 作用。

### 4. 代码注释生成
- **输入**：整体项目信息 + 单个文件内容。
- **处理**：
  - 构建增强 Prompt：包含项目上下文、目录摘要、文件摘要 + "为代码生成行内注释，语言：中文，解释逻辑，为函数添加块注释。"
  - 逐文件处理：避免批量 overload，支持并行或批量模式。
- **输出**：带有注释的新代码字符串。
- **写回机制**：使用 vscode.WorkspaceEdit 替换文件内容，提供预览面板让用户确认。

### 5. 配置与用户界面
- **配置选项**：package.json contribution：
  - `aiOmni.codeXray.commentLanguage`：'chinese' (default) 或 'english'。
  - `aiOmni.codeXray.maxDepth`：扫描深度限制。
  - `aiOmni.codeXray.outputPath`：文档保存路径。
- **UI**：Webview 侧边栏显示进度、预览文档，支持取消操作。

## 技术栈与依赖
- **核心依赖**：
  - VSCode Extension API：fs (via node)、lm for Copilot、WorkspaceEdit for 文件修改。
  - TypeScript：类型安全，接口定义 (e.g., FileInfo { path: string, type: 'file' | 'directory', description: string, functions: { name: string, role: string }[] })。
- **外部依赖**：
  - GitHub Copilot：作为 AI 引擎（extensionDependencies: ["github.copilot"]）。
  - LangGraph.js：可选，用于复杂工作流编排（后续优化）。
- **开发工具**：Yeoman、Vite for webviews、Mocha for 测试。

## 风险与假设
- **假设**：用户项目结构合理，Copilot 可用；VSCode 版本 >=1.85。
- **风险**：
  - 性能：大型项目扫描慢，需后台任务或 Web Workers 优化。
  - AI 准确性：模型幻觉，需用户确认机制。
  - 上下文溢出：分层策略缓解，但需监控 token 使用。
  - 兼容性：不同语言代码（e.g., JS vs Python）解析差异。
- **缓解措施**：添加重试逻辑、进度条、配置限额；单元测试覆盖扫描和 Prompt 生成。

## 实施计划
- **阶段 1**：实现文件遍历和基本文件树构建（1 周）。
- **阶段 2**：集成 Copilot API，进行分层分析和文档生成（1-2 周）。
- **阶段 3**：添加代码注释功能、UI 预览和配置（1 周）。
- **阶段 4**：测试、优化和文档（0.5 周）。
- **时间估计**：总 3-4 周，取决于 Copilot 调试。

## 附录：示例代码片段
### package.json 片段
```json
{
  "contributes": {
    "commands": [
      {
        "command": "aiomni.codexray.analyzeProject",
        "title": "codeXray: Analyze Project"
      }
    ],
    "configuration": {
      "properties": {
        "aiOmni.codeXray.commentLanguage": {
          "type": "string",
          "default": "chinese",
          "enum": ["chinese", "english"]
        }
      }
    }
  }
}
```

### extension.ts 片段（文件遍历示例）
```typescript
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

interface FileInfo {
  path: string;
  type: 'file' | 'directory';
  description: string;
  content?: string;
  functions?: { name: string; role: string }[];
}

async function scanDirectory(dir: string): Promise<FileInfo[]> {
  const fileTree: FileInfo[] = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      fileTree.push({ path: filePath, type: 'directory', description: '' });
      const subTree = await scanDirectory(filePath);
      fileTree.push(...subTree);
    } else if (/\.(ts|js|py)$/.test(file)) { // 示例过滤
      const content = fs.readFileSync(filePath, 'utf-8');
      fileTree.push({ path: filePath, type: 'file', content, description: '', functions: [] });
    }
  }
  return fileTree;
}

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('aiomni.codexray.analyzeProject', async (uri: vscode.Uri) => {
    const dir = uri ? uri.fsPath : vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    if (!dir) return;
    const fileTree = await scanDirectory(dir);
    // 后续：调用 Copilot 分析 fileTree
    vscode.window.showInformationMessage(`Analyzed ${fileTree.length} items.`);
  });
  context.subscriptions.push(disposable);
}
```

此文档作为需求概述，可直接复制到项目文档中进行迭代和确认。如需调整细节，请提供反馈。