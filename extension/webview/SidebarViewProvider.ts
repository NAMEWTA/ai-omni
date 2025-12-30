import * as vscode from 'vscode';
import { WebviewMessage, MessageTypes, ModelsListPayload, ServerStatusPayload } from '../../shared/types/message';
import { CopilotService } from '../services/CopilotService';
import { ApiServer } from '../services/ApiServer';

/**
 * 侧边栏 Webview Provider
 * 用于在 Activity Bar 中显示 Webview
 */
export class SidebarViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'aiOmni.sidebarView';

  private _view?: vscode.WebviewView;
  private readonly _context: vscode.ExtensionContext;
  private readonly _copilotService: CopilotService;
  private readonly _apiServer: ApiServer;

  constructor(
    context: vscode.ExtensionContext,
    copilotService: CopilotService,
    apiServer: ApiServer
  ) {
    this._context = context;
    this._copilotService = copilotService;
    this._apiServer = apiServer;

    // 监听服务器状态变化
    this._apiServer.onStatusChange((status) => {
      this.postMessage({
        type: MessageTypes.SERVER_STATUS,
        payload: status as ServerStatusPayload,
      });
    });

    // 监听模型变化
    this._copilotService.onModelsChange((models) => {
      this.postMessage({
        type: MessageTypes.MODELS_LIST,
        payload: { models } as ModelsListPayload,
      });
    });
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    // 配置 Webview 选项
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this._context.extensionUri, 'dist', 'webview')
      ]
    };

    // 设置 HTML 内容
    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // 处理来自 Webview 的消息
    webviewView.webview.onDidReceiveMessage((message: WebviewMessage) => {
      this._handleMessage(message);
    });

    // 当视图可见性改变时
    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        // 视图变为可见时发送当前状态
        this._sendInitialState();
      }
    });

    // 初始化时发送状态
    this._sendInitialState();
  }

  /**
   * 发送初始状态
   */
  private async _sendInitialState() {
    // 获取模型列表
    const models = await this._copilotService.getModels();
    this.postMessage({
      type: MessageTypes.MODELS_LIST,
      payload: { models } as ModelsListPayload,
    });

    // 发送服务器状态
    this.postMessage({
      type: MessageTypes.SERVER_STATUS,
      payload: this._apiServer.getStatus() as ServerStatusPayload,
    });

    // 发送配置
    this.postMessage({
      type: MessageTypes.CONFIG_UPDATE,
      payload: {
        defaultPort: this._context.globalState.get('defaultPort', 11435),
        lastSelectedModel: this._context.globalState.get('lastSelectedModel'),
      },
    });
  }

  /**
   * 向 Webview 发送消息
   */
  public postMessage(message: WebviewMessage) {
    if (this._view) {
      this._view.webview.postMessage(message);
    }
  }

  /**
   * 处理来自 Webview 的消息
   */
  private async _handleMessage(message: WebviewMessage) {
    switch (message.type) {
      case MessageTypes.PING:
        console.log('Sidebar received ping:', message.payload);
        this.postMessage({
          type: MessageTypes.PONG,
          payload: 'Hello from sidebar!'
        });
        break;

      case MessageTypes.SHOW_INFO:
        vscode.window.showInformationMessage(message.payload);
        break;

      case MessageTypes.GET_MODELS:
        const models = await this._copilotService.getModels();
        this.postMessage({
          type: MessageTypes.MODELS_LIST,
          payload: { models } as ModelsListPayload,
        });
        break;

      case MessageTypes.SELECT_MODEL:
        const { modelId } = message.payload;
        const success = await this._copilotService.selectModel(modelId);
        if (success) {
          await this._context.globalState.update('lastSelectedModel', modelId);
          this.postMessage({
            type: MessageTypes.MODEL_SELECTED,
            payload: { modelId, success: true },
          });
          // 更新服务器状态
          this.postMessage({
            type: MessageTypes.SERVER_STATUS,
            payload: this._apiServer.getStatus() as ServerStatusPayload,
          });
        } else {
          this.postMessage({
            type: MessageTypes.MODEL_SELECTED,
            payload: { modelId, success: false, error: 'Model not found' },
          });
        }
        break;

      case MessageTypes.START_SERVER:
        try {
          const { port, modelId: startModelId } = message.payload;
          
          // 确保选择了模型
          if (startModelId) {
            await this._copilotService.selectModel(startModelId);
            await this._context.globalState.update('lastSelectedModel', startModelId);
          }
          
          if (!this._copilotService.getSelectedModel()) {
            throw new Error('Please select a model first');
          }

          await this._context.globalState.update('defaultPort', port);
          await this._apiServer.start(port);
          
          vscode.window.showInformationMessage(`API Server started on port ${port}`);
          
          this.postMessage({
            type: MessageTypes.SERVER_STATUS,
            payload: this._apiServer.getStatus() as ServerStatusPayload,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to start server';
          vscode.window.showErrorMessage(errorMessage);
          this.postMessage({
            type: MessageTypes.SHOW_ERROR,
            payload: errorMessage,
          });
        }
        break;

      case MessageTypes.STOP_SERVER:
        console.log('Received STOP_SERVER message');
        try {
          await this._apiServer.stop();
          console.log('API Server stopped successfully');
          vscode.window.showInformationMessage('API Server stopped');
          this.postMessage({
            type: MessageTypes.SERVER_STATUS,
            payload: this._apiServer.getStatus() as ServerStatusPayload,
          });
        } catch (error) {
          console.error('Failed to stop server:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to stop server';
          vscode.window.showErrorMessage(errorMessage);
        }
        break;

      case MessageTypes.GET_SERVER_STATUS:
        this.postMessage({
          type: MessageTypes.SERVER_STATUS,
          payload: this._apiServer.getStatus() as ServerStatusPayload,
        });
        break;

      case MessageTypes.GET_CONFIG:
        this.postMessage({
          type: MessageTypes.CONFIG_UPDATE,
          payload: {
            defaultPort: this._context.globalState.get('defaultPort', 11435),
            lastSelectedModel: this._context.globalState.get('lastSelectedModel'),
          },
        });
        break;

      case 'openPanel':
        // 打开独立的 Webview Panel
        vscode.commands.executeCommand('my-extension.open');
        break;

      default:
        console.log('Unknown message type:', message.type);
    }
  }

  /**
   * 生成 Webview HTML
   */
  private _getHtmlForWebview(webview: vscode.Webview): string {
    const distUri = vscode.Uri.joinPath(this._context.extensionUri, 'dist', 'webview');

    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(distUri, 'assets', 'index.js')
    );

    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(distUri, 'assets', 'index.css')
    );

    const nonce = this._getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <link rel="stylesheet" href="${styleUri}">
  <title>AI Omni</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  private _getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }
}
