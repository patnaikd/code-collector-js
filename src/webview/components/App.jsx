import React, { useState, useEffect } from 'react';
import { Button, TextField, Box, ThemeProvider, createTheme } from '@mui/material';
import { CssBaseline } from '@mui/material';

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
    vscode.postMessage({
      command: 'copyToClipboard',
      text: `${codeContent}\n\n\n\n${promptText}`,
    });
  };

  const theme = createTheme({
    palette: {
      mode: themeMode,
    },
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ p: 2 }}>
        <TextField
          label="Enter your prompts here..."
          variant="outlined"
          fullWidth
          multiline
          minRows={2}
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          sx={{ mb: 2 }}
        />
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Button variant="contained" onClick={collectCode}>
            Collect Code
          </Button>
          <Button variant="outlined" onClick={copyToClipboard}>
            Copy to Clipboard
          </Button>
        </Box>
        <TextField
          label="Collected Code"
          variant="outlined"
          fullWidth
          multiline
          minRows={10}
          value={codeContent}
          InputProps={{
            readOnly: true,
          }}
        />
      </Box>
    </ThemeProvider>
  );
};

export default App;