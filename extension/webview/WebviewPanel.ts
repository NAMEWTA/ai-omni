import * as vscode from 'vscode';
import { getHtml } from './getHtml';
import { WebviewMessage } from '../../shared/types/message';

export class WebviewPanel {
  public static currentPanel: WebviewPanel | undefined;

  private readonly _panel: vscode.WebviewPanel;
  private readonly _context: vscode.ExtensionContext;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(context: vscode.ExtensionContext) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If we already have a panel, show it
    if (WebviewPanel.currentPanel) {
      WebviewPanel.currentPanel._panel.reveal(column);
      return;
    }

    // Otherwise, create a new panel
    const panel = vscode.window.createWebviewPanel(
      'myWebview',
      'My Webview',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(context.extensionUri, 'dist', 'webview')
        ]
      }
    );

    WebviewPanel.currentPanel = new WebviewPanel(panel, context);
  }

  private constructor(panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
    this._panel = panel;
    this._context = context;

    // Set the webview's initial html content
    this._update();

    // Listen for when the panel is disposed
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Handle messages from the webview
    this._panel.webview.onDidReceiveMessage(
      (message: WebviewMessage) => {
        this._handleMessage(message);
      },
      null,
      this._disposables
    );
  }

  private _handleMessage(message: WebviewMessage) {
    switch (message.type) {
      case 'ping':
        console.log('Received ping:', message.payload);
        // Send response back to webview
        this._panel.webview.postMessage({
          type: 'pong',
          payload: 'Hello from extension!'
        });
        break;
      case 'showInfo':
        vscode.window.showInformationMessage(message.payload);
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  public dispose() {
    WebviewPanel.currentPanel = undefined;

    // Clean up our resources
    this._panel.dispose();

    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  private _update() {
    this._panel.webview.html = getHtml(this._panel.webview, this._context);
  }
}
