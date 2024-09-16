import React, { useState, useEffect } from 'react';
import { Button, TextField, Box, ThemeProvider, createTheme } from '@mui/material';

const App = ({ vscode }) => {
  const [codeContent, setCodeContent] = useState('');
  const [promptText, setPromptText] = useState('');
  const [themeMode, setThemeMode] = useState('light'); // 'light' or 'dark'

  useEffect(() => {
    // Listen for messages from VSCode
    const handleMessage = (event) => {
      const message = event.data;
      switch (message.command) {
        case 'displayCode':
          setCodeContent(message.code);
          break;
        case 'setTheme':
          setThemeMode(message.theme === 'vscode-dark' ? 'dark' : 'light');
          break;
        default:
          break;
      }
    };

    window.addEventListener('message', handleMessage);

    // Request the current theme from VSCode on mount
    vscode.postMessage({ command: 'getTheme' });

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [vscode]);

  const collectCode = () => {
    vscode.postMessage({ command: 'collectCode' });
  };

  const copyToClipboard = () => {
    vscode.postMessage({ command: 'copyToClipboard', text: `${codeContent}\n\n\n\n${promptText}` });
  };

  return (
    <div>
      <textarea
        placeholder="Enter your prompts here..."
        value={promptText}
        onChange={(e) => setPromptText(e.target.value)}
        style={{ width: '100%', height: '50px' }}
      />
      <div>
        <button onClick={collectCode}>Collect Code</button>
        <button onClick={copyToClipboard}>Copy to Clipboard</button>
      </div>
      <textarea
        readOnly
        value={codeContent}
        style={{ width: '100%', height: 'calc(100% - 100px)' }}
      />
    </div>
  );
};

export default App;