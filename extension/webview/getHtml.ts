import * as vscode from 'vscode';

export function getHtml(
  webview: vscode.Webview,
  context: vscode.ExtensionContext
): string {
  const distUri = vscode.Uri.joinPath(context.extensionUri, 'dist', 'webview');

  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(distUri, 'assets', 'index.js')
  );

  const styleUri = webview.asWebviewUri(
    vscode.Uri.joinPath(distUri, 'assets', 'index.css')
  );

  // Use a nonce to whitelist scripts
  const nonce = getNonce();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <link rel="stylesheet" href="${styleUri}">
  <title>My Webview</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
