import {
  SectionBox,
} from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { KubeObject } from '@kinvolk/headlamp-plugin/lib/lib/k8s/cluster';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
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
import { useParams, useHistory, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ConstraintTemplateClass } from '../model';
import { ConstraintTemplate } from '../types';
import * as ApiProxy from '@kinvolk/headlamp-plugin/lib/ApiProxy';
import { RoutingPath } from '../index';

interface ConstraintTemplateDetailsProps {}

function ConstraintTemplateDetails({}: ConstraintTemplateDetailsProps) {
  const { t } = useTranslation();
  const { name } = useParams<{ name: string }>();
  const [item, setItem] = useState<KubeObject | null>(null);
  const history = useHistory();
  const location = useLocation();

  // Delete dialog state
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

  ConstraintTemplateClass.useApiGet(setItem, name);

  if (!item) {
    return <Typography>{t('Loading constraint template details...')}</Typography>;
  }

  const constraintTemplate = item.jsonData as ConstraintTemplate;

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (!name) return;

    setIsDeleting(true);
    setDeleteDialogOpen(false);

    try {
      await ApiProxy.request(
        `/apis/templates.gatekeeper.sh/v1beta1/constrainttemplates/${name}`,
        {
          method: 'DELETE',
        }
      );

      setSnackbarState({
        open: true,
        message: t('ConstraintTemplate "{{name}}" deleted successfully', { name }),
        severity: 'success',
      });

      // Navigate back to constraint templates list after a short delay
      setTimeout(() => {
        // Extract cluster from current URL (format: /c/:cluster/...)
        const clusterMatch = location.pathname.match(/\/c\/([^\/]+)/);
        const cluster = clusterMatch ? clusterMatch[1] : null;
        
        if (cluster) {
          history.push(`/c/${cluster}${RoutingPath.ConstraintTemplates}`);
        } else {
          history.push(RoutingPath.ConstraintTemplates);
        }
      }, 1500);

    } catch (error: any) {
      let errorMessage = t('Failed to delete ConstraintTemplate');
      if (error.json && error.json.message) {
        errorMessage = t('Failed to delete ConstraintTemplate: {{message}}', { message: error.json.message });
      } else if (error.message) {
        errorMessage = t('Failed to delete ConstraintTemplate: {{message}}', { message: error.message });
      }

      setSnackbarState({
        open: true,
        message: errorMessage,
        severity: 'error',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCloseSnackbar = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarState(prev => ({ ...prev, open: false }));
  };

  function getMainInfoRows() {
    return [
      {
        name: t('Name'),
        value: constraintTemplate.metadata.name,
      },
      {
        name: t('Created'),
        value: constraintTemplate.metadata.creationTimestamp,
      },
      {
        name: t('Kind'),
        value: constraintTemplate.spec?.crd?.spec?.names?.kind || '',
      },
      {
        name: t('Plural'),
        value: constraintTemplate.spec?.crd?.spec?.names?.plural || '',
      },
      {
        name: t('Status'),
        value: constraintTemplate.status?.created ? t('Ready') : t('Not Ready'),
      },
    ];
  }

  function getTargetRows() {
    if (!constraintTemplate.spec?.targets) {
      return [];
    }

    return constraintTemplate.spec.targets.map((target) => ({
      Target: target.target,
      'Has Rego': target.rego ? t('Yes') : t('No'),
      'Has Libs': target.libs && target.libs.length > 0 ? t('Yes') : t('No'),
    }));
  }

  return (
    <Box>
      {/* Header with title and delete button */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            {constraintTemplate.metadata.name}
          </Typography>
          <Typography variant="subtitle1" color="textSecondary" gutterBottom>
            {t('Constraint Template')}
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="error"
          onClick={handleDeleteClick}
          disabled={isDeleting}
          startIcon={isDeleting ? <CircularProgress size={20} /> : null}
          sx={{ height: 'fit-content' }}
        >
          {isDeleting ? t('Deleting...') : t('Delete')}
        </Button>
      </Box>

      <SectionBox title={t('Overview')}>
        <Table>
          <TableBody>
            {getMainInfoRows().map((row) => (
              <TableRow key={row.name}>
                <TableCell component="th" scope="row">
                  {row.name}
                </TableCell>
                <TableCell>{row.value}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionBox>

      <SectionBox title={t('Targets')}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('Target')}</TableCell>
              <TableCell>{t('Has Rego')}</TableCell>
              <TableCell>{t('Has Libs')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {getTargetRows().map((row, index) => (
              <TableRow key={index}>
                <TableCell>{row.Target}</TableCell>
                <TableCell>{row['Has Rego']}</TableCell>
                <TableCell>{row['Has Libs']}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionBox>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          {t('Delete ConstraintTemplate')}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            {t('Are you sure you want to delete the ConstraintTemplate "{{name}}"? This action cannot be undone and may affect any constraints using this template.', { name: constraintTemplate.metadata.name })}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} color="primary">
            {t('Cancel')}
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            {t('Delete')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
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
    </Box>
  );
}

export default ConstraintTemplateDetails;
