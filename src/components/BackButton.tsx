import { Button, SxProps, Theme } from '@mui/material';
import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { buildClusterRedirectPath } from './ResourceDeleteButton';

export interface BackButtonProps {
  /** Optional fallback URL to navigate to if there is no previous history within the app */
  fallbackUrl?: string;
  /** Alias for fallbackUrl */
  to?: string;
  sx?: SxProps<Theme>;
}

export default function BackButton({ fallbackUrl, to, sx }: BackButtonProps) {
  const history = useHistory();
  const location = useLocation();

  const targetUrl = fallbackUrl || to;

  const handleBack = (e?: React.MouseEvent) => {
    e?.preventDefault();
    if (history?.action === 'PUSH' && typeof history?.goBack === 'function') {
      history.goBack();
    } else if (targetUrl && typeof history?.push === 'function') {
      const pathname = location?.pathname || '';
      history.push(buildClusterRedirectPath(pathname, targetUrl));
    } else if (typeof history?.goBack === 'function') {
      history.goBack();
    }
  };

  return (
    <Button
      size="small"
      aria-label="Back"
      onClick={handleBack}
      sx={{
        textTransform: 'none',
        p: 0,
        minWidth: 'auto',
        fontSize: '0.875rem',
        fontWeight: 500,
        color: 'primary.main',
        mb: 1.5,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        '&:hover': {
          backgroundColor: 'transparent',
          textDecoration: 'underline',
        },
        ...sx,
      }}
    >
      {'< Back'}
    </Button>
  );
}
