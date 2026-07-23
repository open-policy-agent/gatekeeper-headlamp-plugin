import type { KubeObject } from '@kinvolk/headlamp-plugin/lib/lib/k8s/cluster';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar,
} from '@mui/material';
import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';

interface ResourceDeleteButtonProps {
  resource: KubeObject;
  kind: string;
  redirectUrl: string;
}

interface ComparableLocation {
  key?: string;
  pathname: string;
  search: string;
  hash: string;
}

export function isSameHistoryLocation(
  currentLocation: ComparableLocation,
  originalLocation: ComparableLocation
): boolean {
  return (
    currentLocation.key === originalLocation.key &&
    currentLocation.pathname === originalLocation.pathname &&
    currentLocation.search === originalLocation.search &&
    currentLocation.hash === originalLocation.hash
  );
}

export function buildClusterRedirectPath(pathname: string, redirectUrl: string): string {
  const clusterMatch = pathname.match(/^\/c\/([^/]+)/);
  return clusterMatch ? `/c/${clusterMatch[1]}${redirectUrl}` : redirectUrl;
}

function getDeleteErrorMessage(error: unknown, kind: string): string {
  let detail = '';

  if (error && typeof error === 'object') {
    const candidate = error as { message?: unknown; json?: { message?: unknown } };
    const rawDetail = candidate.json?.message || candidate.message;
    detail = typeof rawDetail === 'string' ? rawDetail : '';
  } else if (typeof error === 'string') {
    detail = error;
  }

  return detail ? `Failed to delete ${kind}: ${detail}` : `Failed to delete ${kind}`;
}

export default function ResourceDeleteButton({
  resource,
  kind,
  redirectUrl,
}: ResourceDeleteButtonProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const history = useHistory();
  const name = resource.getName();

  const handleDeleteConfirm = async () => {
    const deleteLocation = history.location;

    setIsDeleting(true);
    setDeleteDialogOpen(false);
    setErrorMessage('');

    try {
      await resource.delete();

      const currentLocation = history.location;
      if (isSameHistoryLocation(currentLocation, deleteLocation)) {
        history.replace(buildClusterRedirectPath(deleteLocation.pathname, redirectUrl));
      } else {
        setIsDeleting(false);
      }
    } catch (error) {
      setErrorMessage(getDeleteErrorMessage(error, kind));
      setIsDeleting(false);
    }
  };

  const handleCloseSnackbar = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason !== 'clickaway') {
      setErrorMessage('');
    }
  };

  return (
    <>
      <Button
        variant="contained"
        color="error"
        onClick={() => setDeleteDialogOpen(true)}
        disabled={isDeleting}
        startIcon={isDeleting ? <CircularProgress size={20} /> : null}
        sx={{ height: 'fit-content' }}
      >
        {isDeleting ? 'Deleting...' : 'Delete'}
      </Button>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete {kind}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the {kind} "{name}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(errorMessage)}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="error" sx={{ width: '100%' }}>
          {errorMessage}
        </Alert>
      </Snackbar>
    </>
  );
}
