import * as vscode from 'vscode';
import { openWebview } from './commands/openWebview';
import { SidebarViewProvider } from './webview/SidebarViewProvider';
import { CopilotService, ApiServer } from './services';

// 全局服务实例
let copilotService: CopilotService;
let apiServer: ApiServer;

export function activate(context: vscode.ExtensionContext) {
  console.log('Extension "ai-omni" is now active!');

  // 初始化服务
  copilotService = new CopilotService();
  apiServer = new ApiServer(copilotService);

  // 初始化 Copilot 服务
  copilotService.initialize().then(models => {
    console.log(`Initialized with ${models.length} models`);
  });

  // 注册侧边栏 Webview Provider
  const sidebarProvider = new SidebarViewProvider(context, copilotService, apiServer);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      SidebarViewProvider.viewType,
      sidebarProvider,
      {
        webviewOptions: {
          retainContextWhenHidden: true
        }
      }
    )
  );

  // 注册打开 Webview Panel 命令
  context.subscriptions.push(
    vscode.commands.registerCommand('my-extension.open', () =>
      openWebview(context)
    )
  );

  // 注册刷新侧边栏命令
  context.subscriptions.push(
    vscode.commands.registerCommand('aiOmni.refreshSidebar', async () => {
      const models = await copilotService.getModels();
      vscode.window.showInformationMessage(`Found ${models.length} models`);
    })
  );

  // 注册启动服务器命令
  context.subscriptions.push(
    vscode.commands.registerCommand('aiOmni.startServer', async () => {
      const port = context.globalState.get('defaultPort', 11435);
      try {
        await apiServer.start(port as number);
        vscode.window.showInformationMessage(`API Server started on port ${port}`);
      } catch (error) {
        vscode.window.showErrorMessage(error instanceof Error ? error.message : 'Failed to start server');
      }
    })
  );

  // 注册停止服务器命令
  context.subscriptions.push(
    vscode.commands.registerCommand('aiOmni.stopServer', async () => {
      try {
        await apiServer.stop();
        vscode.window.showInformationMessage('API Server stopped');
      } catch (error) {
        vscode.window.showErrorMessage(error instanceof Error ? error.message : 'Failed to stop server');
      }
    })
  );
}

export async function deactivate() {
  console.log('Extension "ai-omni" is now deactivated.');
  
  // 停止服务器
  if (apiServer) {
    await apiServer.stop();
  }
  
  // 清理 Copilot 服务
  if (copilotService) {
    copilotService.dispose();
  }
}
