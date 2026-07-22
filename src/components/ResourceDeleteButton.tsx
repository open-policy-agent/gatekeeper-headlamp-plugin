import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar,
  Alert,
  CircularProgress
} from '@mui/material';
import React, { useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import * as ApiProxy from '@kinvolk/headlamp-plugin/lib/ApiProxy';

interface ResourceDeleteButtonProps {
  name: string;
  kind: string;
  apiUrl: string;
  redirectUrl: string;
}

export default function ResourceDeleteButton({ name, kind, apiUrl, redirectUrl }: ResourceDeleteButtonProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [snackbarState, setSnackbarState] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });
  
  const history = useHistory();
  const location = useLocation();

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    setDeleteDialogOpen(false);

    try {
      await ApiProxy.request(apiUrl, { method: 'DELETE' });

      setSnackbarState({
        open: true,
        message: `${kind} "${name}" deleted successfully`,
        severity: 'success',
      });

      setTimeout(() => {
        const clusterMatch = location.pathname.match(/\/c\/([^\/]+)/);
        const cluster = clusterMatch ? clusterMatch[1] : null;
        if (cluster) {
          history.push(`/c/${cluster}${redirectUrl}`);
        } else {
          history.push(redirectUrl);
        }
      }, 1500);

    } catch (error: any) {
      let errorMessage = `Failed to delete ${kind}`;
      if (error.json && error.json.message) {
        errorMessage = `Failed to delete ${kind}: ${error.json.message}`;
      } else if (error.message) {
        errorMessage = `Failed to delete ${kind}: ${error.message}`;
      }

      setSnackbarState({
        open: true,
        message: errorMessage,
        severity: 'error',
      });
      setIsDeleting(false);
    }
  };

  const handleCloseSnackbar = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') return;
    setSnackbarState(prev => ({ ...prev, open: false }));
  };

  return (
    <>
      <Button
        variant="contained"
        color="error"
        onClick={handleDeleteClick}
        disabled={isDeleting}
        startIcon={isDeleting ? <CircularProgress size={20} /> : null}
        sx={{ height: 'fit-content' }}
      >
        {isDeleting ? 'Deleting...' : 'Delete'}
      </Button>

      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Delete {kind}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the {kind} "{name}"?
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} color="primary">Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarState.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbarState.severity} sx={{ width: '100%' }}>
          {snackbarState.message}
        </Alert>
      </Snackbar>
    </>
  );
}