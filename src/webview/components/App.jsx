import React, { useState, useEffect } from 'react';
import {
  Button,
  TextField,
  Box,
  ThemeProvider,
  createTheme,
  CssBaseline,
  Typography,
} from '@mui/material';

/**
 * The main application component for the Code Collector extension.
 * This component renders the UI for collecting code and managing prompts.
 * @param {Object} props - The component props.
 * @param {any} props.vscode - The VSCode API object obtained via acquireVsCodeApi().
 */
const App = ({ vscode }) => {
  const [codeContent, setCodeContent] = useState('');
  const [promptText, setPromptText] = useState('');
  const [themeMode, setThemeMode] = useState('light'); // 'light' or 'dark'

  useEffect(() => {
    // This effect sets up the message listener to receive messages from the extension's main script.
    // It handles 'displayCode' to update the code content, and 'setTheme' to update the theme mode.
    // Also, it requests the current theme from VSCode when the component mounts.
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

  /**
   * Sends a message to VSCode to collect the code from open tabs.
   */
  const collectCode = () => {
    vscode.postMessage({ command: 'collectCode' });
  };

  /**
   * Sends a message to VSCode to copy the combined code content and prompt text to the clipboard.
   */
  const copyToClipboard = () => {
    vscode.postMessage({
      command: 'copyToClipboard',
      text: `${codeContent}\n\n\n\n${promptText}`,
    });
  };

  // Create a Material-UI theme based on the current theme mode ('light' or 'dark')
  const theme = createTheme({
    palette: {
      mode: themeMode,
    },
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ p: 2 }}>
        <Typography variant="h4" gutterBottom>Code Collector</Typography>
        <TextField
          label="Enter your prompts here..."
          variant="outlined"
          fullWidth
          multiline
          minRows={4}
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          sx={{
            mb: 2,
            '& .MuiInputBase-input': {
              fontSize: 12, // Reduce the input text font size
            },
            '& .MuiInputLabel-root': {
              fontSize: 12, // Reduce the label font size
            },
          }}
        />
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Button
            variant="contained"
            onClick={collectCode}
            sx={{
              fontSize: 12, // Reduce the button text font size
            }}
          >
            Collect Code
          </Button>
          <Button
            variant="outlined"
            onClick={copyToClipboard}
            sx={{
              fontSize: 12, // Reduce the button text font size
            }}
          >
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
            sx: {
              fontFamily: 'monospace', // Use monospace font for code
              whiteSpace: 'pre',        // Preserve whitespace and line breaks
              fontSize: 10,
            },
          }}
          sx={{
            '& .MuiInputBase-input': {
              fontSize: 12,
              fontFamily: 'monospace', // Use monospace font for code
              whiteSpace: 'pre',        // Preserve whitespace and line breaks
            },
            '& .MuiInputLabel-root': {
              fontSize: 12,
            },
          }}
        />
      </Box>
    </ThemeProvider>
  );
};

export default App;