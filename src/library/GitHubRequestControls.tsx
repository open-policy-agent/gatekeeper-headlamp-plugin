import { Box, Button, TextField, Typography } from '@mui/material';
import React, { useState } from 'react';
import { clearGitHubToken, getGitHubToken, setGitHubToken } from './libraryData';

interface GitHubRequestControlsProps {
  onRetry: () => void;
  disabled?: boolean;
}

export default function GitHubRequestControls({
  onRetry,
  disabled = false,
}: GitHubRequestControlsProps) {
  const [tokenInput, setTokenInput] = useState(getGitHubToken());
  const [hasActiveToken, setHasActiveToken] = useState(Boolean(getGitHubToken()));

  const handleRetryWithToken = () => {
    setGitHubToken(tokenInput);
    setHasActiveToken(Boolean(tokenInput.trim()));
    onRetry();
  };

  const handleClearToken = () => {
    clearGitHubToken();
    setTokenInput('');
    setHasActiveToken(false);
    onRetry();
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
        <TextField
          label="GitHub Personal Access Token"
          variant="outlined"
          size="small"
          type="password"
          value={tokenInput}
          onChange={event => setTokenInput(event.target.value)}
          sx={{ minWidth: 300 }}
          autoComplete="off"
          disabled={disabled}
        />
        <Button variant="contained" onClick={handleRetryWithToken} disabled={disabled}>
          Use Token & Retry
        </Button>
        {hasActiveToken && (
          <Button variant="outlined" onClick={handleClearToken} disabled={disabled}>
            Clear Token & Retry
          </Button>
        )}
      </Box>
      <Typography variant="caption" color="text.secondary">
        The token is kept in memory only and is cleared when this page is reloaded.
      </Typography>
    </Box>
  );
}
