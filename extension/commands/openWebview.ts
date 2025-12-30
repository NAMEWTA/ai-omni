import * as vscode from 'vscode';
import { WebviewPanel } from '../webview/WebviewPanel';

export function openWebview(context: vscode.ExtensionContext) {
  WebviewPanel.createOrShow(context);
}
