import React from 'react';
import ReactDOM from 'react-dom';
import App from './components/App';

// Ensure acquireVsCodeApi is called only once
if (!window.vscode) {
  window.vscode = acquireVsCodeApi();
}
const vscode = window.vscode;

ReactDOM.render(<App vscode={vscode} />, document.getElementById('root'));

// Accept HMR updates
if (module.hot) {
  module.hot.accept();
}