const vscode = require('vscode');
const path = require('path');

const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  console.log('Extension "code-collector-js" is now active!');

  let disposable = vscode.commands.registerCommand('code-collector-js.openPanel', function () {
    CodeCollectorPanel.createOrShow(context.extensionUri);
  });

  context.subscriptions.push(disposable);
}
exports.activate = activate;

function deactivate() { }
exports.deactivate = deactivate;

class CodeCollectorPanel {
  /**
   * @type {CodeCollectorPanel}
   */
  static currentPanel = undefined;

  /**
   * @param {vscode.WebviewPanel} panel
   * @param {vscode.Uri} extensionUri
   */
  constructor(panel, extensionUri) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._disposables = [];

    // Set the webview's initial HTML content
    this._update();

    // Listen for when the panel is disposed
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Handle messages from the webview
    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        console.log('Received message from webview:', message);

        switch (message.command) {
          case 'collectCode':
            const code = await this.collectOpenTabContent();
            this._panel.webview.postMessage({ command: 'displayCode', code: code });
            return;
          case 'copyToClipboard':
            await vscode.env.clipboard.writeText(message.text);
            vscode.window.showInformationMessage(`Copied ${message.text.length} to clipboard!`);
            return;
          case 'getTheme':
            const themeKind = vscode.window.activeColorTheme.kind;
            const theme = themeKind === vscode.ColorThemeKind.Dark ? 'vscode-dark' : 'vscode-light';
            this._panel.webview.postMessage({ command: 'setTheme', theme });
            return;
        }
      },
      null,
      this._disposables
    );

    // In the constructor of CodeCollectorPanel
    vscode.window.onDidChangeActiveColorTheme(
      (event) => {
        const theme = event.kind === vscode.ColorThemeKind.Dark ? 'vscode-dark' : 'vscode-light';
        this._panel.webview.postMessage({ command: 'setTheme', theme });
      },
      null,
      this._disposables
    );
  }

  /**
   * @param {vscode.Uri} extensionUri
   */
  static createOrShow(extensionUri) {
    const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

    // If we already have a panel, show it.
    if (CodeCollectorPanel.currentPanel) {
      CodeCollectorPanel.currentPanel._panel.reveal(column);
      return;
    }

    // Otherwise, create a new panel.
    const panel = vscode.window.createWebviewPanel(
      'codeCollector',
      'Code Collector',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    CodeCollectorPanel.currentPanel = new CodeCollectorPanel(panel, extensionUri);
  }

  dispose() {
    CodeCollectorPanel.currentPanel = undefined;

    // Clean up our resources
    this._panel.dispose();

    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  _update() {
    const webview = this._panel.webview;
    this._panel.webview.html = this._getHtmlForWebview(webview);
  }

  /**
   * @param {vscode.Webview} webview
   */
  _getHtmlForWebview(webview) {
    const nonce = getNonce();

    // Decide where to load the script from
    const scriptUri = isDevelopment
      ? 'http://localhost:3000/bundle.js' // URL served by webpack-dev-server
      : webview.asWebviewUri(
        vscode.Uri.joinPath(this._extensionUri, 'out', 'bundle.js')
      );

    const cspSource = webview.cspSource;

    // Get the current theme kind
    const themeKind = vscode.window.activeColorTheme.kind;
    const theme = themeKind === vscode.ColorThemeKind.Dark ? 'vscode-dark' : 'vscode-light';

    return `<!DOCTYPE html>
    <html lang="en" class="${theme}">
    <head>
      <meta charset="UTF-8">
      <meta
        http-equiv="Content-Security-Policy"
        content="default-src 'none'; script-src 'nonce-${nonce}' ${isDevelopment ? "'unsafe-eval' http://localhost:3000" : cspSource
      }; style-src ${cspSource} 'unsafe-inline';"
      >
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Code Collector</title>
    </head>
    <body>
      <div id="root"></div>
      <script nonce="${nonce}" src="${scriptUri}"></script>
    </body>
    </html>`;
  }

  async collectOpenTabContent() {
    let content = '';

    // Get the root path of the workspace
    const workspaceFolders = vscode.workspace.workspaceFolders;
    const rootPath = workspaceFolders && workspaceFolders.length > 0 ? workspaceFolders[0].uri.fsPath : '';

    if (!rootPath) {
      console.log('No workspace folder found.');
      return '';
    }

    // Get the active tab group
    const activeTabGroup = vscode.window.tabGroups.activeTabGroup;

    // Check if there is an active tab group
    if (!activeTabGroup) {
      console.log('No active tab group found.');
      return '';
    }

    console.log('Number of tabs in the current tab group:', activeTabGroup.tabs.length);

    // Loop through each tab in the active tab group
    for (const tab of activeTabGroup.tabs) {
      // Check if the tab has a document associated with it
      if (tab.input && tab.input.uri) {
        try {
          // Open the text document using the URI
          const document = await vscode.workspace.openTextDocument(tab.input.uri);
          const absolutePath = document.fileName;
          const relativePath = path.relative(rootPath, absolutePath);
          console.log('Collecting content from tab:', relativePath);
          const fileContent = document.getText();
          content += `// File: ${relativePath}\n${fileContent}\n\n`;
        } catch (error) {
          console.error('Error opening document:', error);
        }
      }
    }

    return content;
  }
}

function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}