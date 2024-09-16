const vscode = require('vscode');
const path = require('path');

/**
 * Called when the extension is activated.
 * This method is called when the extension is activated, which happens when the command defined below is invoked.
 * @param {vscode.ExtensionContext} context - The extension context provided by VSCode.
 */
function activate(context) {
  console.log('Extension "code-collector-js" is now active!');

  // Register the 'code-collector-js.openPanel' command
  let disposable = vscode.commands.registerCommand('code-collector-js.openPanel', function () {
    // When the command is executed, create or show the Code Collector panel
    CodeCollectorPanel.createOrShow(context.extensionUri);
  });

  // Add to subscriptions to ensure the command is disposed when the extension is deactivated
  context.subscriptions.push(disposable);
}
exports.activate = activate;

/**
 * Called when the extension is deactivated.
 * This method is called when your extension is deactivated.
 */
function deactivate() { }
exports.deactivate = deactivate;

/**
 * Class representing the Code Collector Panel.
 * This class encapsulates the functionality for the webview panel used in the extension.
 */
class CodeCollectorPanel {
  /**
   * The currently active panel. Only allow a single panel at a time.
   * @type {CodeCollectorPanel}
   */
  static currentPanel = undefined;

  /**
   * Creates an instance of CodeCollectorPanel.
   * @param {vscode.WebviewPanel} panel - The webview panel where the webview is displayed.
   * @param {vscode.Uri} extensionUri - The URI of the directory containing the extension.
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
            // Collect code from open tabs and send it back to the webview
            const content = await this.collectOpenTabContent();
            this._panel.webview.postMessage({ command: 'displayCode', content: content });
            return;
          case 'copyToClipboard':
            // Copy provided text to the clipboard
            await vscode.env.clipboard.writeText(message.text);
            vscode.window.showInformationMessage(`Copied ${message.text.length} characters to clipboard!`);
            return;
          case 'getTheme':
            // Send the current theme to the webview
            const themeKind = vscode.window.activeColorTheme.kind;
            const theme = themeKind === vscode.ColorThemeKind.Dark ? 'vscode-dark' : 'vscode-light';
            this._panel.webview.postMessage({ command: 'setTheme', theme });
            return;
        }
      },
      null,
      this._disposables
    );

    // Listen for theme changes and update the webview accordingly
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
   * Creates a new panel or reveals the existing one.
   * @param {vscode.Uri} extensionUri - The URI of the directory containing the extension.
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

  /**
   * Cleans up and disposes of the webview panel and its resources.
   */
  dispose() {
    CodeCollectorPanel.currentPanel = undefined;

    // Dispose of the webview panel
    this._panel.dispose();

    // Dispose of all disposables (e.g., event listeners)
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  /**
   * Updates the webview's HTML content.
   * This method sets the webview's HTML content by invoking _getHtmlForWebview.
   * @private
   */
  _update() {
    const webview = this._panel.webview;
    this._panel.webview.html = this._getHtmlForWebview(webview);
  }

  /**
   * Generates the HTML content for the webview.
   * @param {vscode.Webview} webview - The webview instance.
   * @returns {string} The HTML content to display in the webview.
   * @private
   */
  _getHtmlForWebview(webview) {
    const isDevelopment = process.env.NODE_ENV === 'development';
    console.log('Is Development Environment', isDevelopment);

    const nonce = getNonce();

    // Decide where to load the script from based on development or production mode
    const scriptUri = isDevelopment
      ? 'http://localhost:3000/bundle.js' // URL served by webpack-dev-server during development
      : webview.asWebviewUri(
        vscode.Uri.joinPath(this._extensionUri, 'out', 'bundle.js')
      );

    const cspSource = webview.cspSource;

    // Get the current theme kind
    const themeKind = vscode.window.activeColorTheme.kind;
    const theme = themeKind === vscode.ColorThemeKind.Dark ? 'vscode-dark' : 'vscode-light';

    // Return the HTML content with appropriate CSP and script inclusion
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

  // In src/extension.js

  /**
   * Collects the content of all open tabs in the current tab group.
   * @returns {Promise<{ code: string, stats: { numberOfFiles: number, numberOfWords: number, collectedAt: string } }>} The concatenated content of all open tabs and the statistics.
   */
  async collectOpenTabContent() {
    let content = '';
    let numberOfFiles = 0;
    let numberOfWords = 0;

    // Get the root path of the workspace
    const workspaceFolders = vscode.workspace.workspaceFolders;
    const rootPath = workspaceFolders && workspaceFolders.length > 0 ? workspaceFolders[0].uri.fsPath : '';

    if (!rootPath) {
      console.log('No workspace folder found.');
      return { code: '', stats: null };
    }

    // Get the active tab group
    const activeTabGroup = vscode.window.tabGroups.activeTabGroup;

    // Check if there is an active tab group
    if (!activeTabGroup) {
      console.log('No active tab group found.');
      return { code: '', stats: null };
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

          numberOfFiles += 1;
          numberOfWords += fileContent.split(/\s+/).filter(word => word.length > 0).length;

          content += `// File: ${relativePath}\n${fileContent}\n\n`;
        } catch (error) {
          console.error('Error opening document:', error);
        }
      }
    }

    // Get the current date and time in ISO format
    const collectedAt = new Date().toISOString();

    const stats = {
      numberOfFiles,
      numberOfWords,
      collectedAt
    };

    return { code: content, stats: stats };
  }
}

/**
 * Generates a nonce for Content Security Policy.
 * @returns {string} A random nonce string.
 */
function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}