import * as vscode from 'vscode';
import { openWebview } from './commands/openWebview';

export function activate(context: vscode.ExtensionContext) {
  console.log('Extension "my-vscode-extension" is now active!');

  context.subscriptions.push(
    vscode.commands.registerCommand('my-extension.open', () =>
      openWebview(context)
    )
  );
}

export function deactivate() {
  console.log('Extension "my-vscode-extension" is now deactivated.');
}
