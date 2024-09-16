/**
 * Entry point for the webview application.
 * This script initializes the React application and renders it into the webview.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import App from './components/App';

// Ensure acquireVsCodeApi is called only once
if (!window.vscode) {
  // acquireVsCodeApi is a function provided by VSCode in the webview environment
  window.vscode = acquireVsCodeApi();
}
const vscode = window.vscode;

// Render the main App component into the root element
ReactDOM.render(<App vscode={vscode} />, document.getElementById('root'));

// Accept Hot Module Replacement (HMR) updates if available
if (module.hot) {
  module.hot.accept();
}