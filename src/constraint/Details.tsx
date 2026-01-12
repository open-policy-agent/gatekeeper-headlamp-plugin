import {
  SectionBox,
} from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import {
  Box,
  Chip,
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
import { ConstraintClass } from '../model';
import { Constraint } from '../types';
import * as ApiProxy from '@kinvolk/headlamp-plugin/lib/ApiProxy';
import { RoutingPath } from '../index';

interface ConstraintDetailsProps {}

function ConstraintDetails({}: ConstraintDetailsProps) {
  const { t } = useTranslation();
  const { kind, name } = useParams<{ kind: string; name: string }>();
  const [item, setItem] = useState<any | null>(null);
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

  ConstraintClass.useApiGet(setItem, name);

  if (!item) {
    return <Typography>{t('Loading constraint details...')}</Typography>;
  }

  // Handle both KubeObject instances and raw constraint objects
  const constraint = item.jsonData ? (item.jsonData as Constraint) : (item as Constraint);

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
  };

  const handleDeleteConfirm = async () => {
    console.log('=== DELETE CONSTRAINT DEBUG START ===');
    console.log('URL params - kind:', kind, 'name:', name);
    console.log('constraint object:', constraint);
    console.log('constraint.kind:', constraint?.kind);

    if (!name || !constraint) {
      console.error('Cannot delete: name or constraint is missing', { name, constraint });
      setSnackbarState({
        open: true,
        message: t('Cannot delete: missing constraint information'),
        severity: 'error',
      });
      return;
    }

    console.log('Starting delete process for constraint:', { name, urlKind: kind, constraintKind: constraint.kind });
    setIsDeleting(true);
    setDeleteDialogOpen(false);

    try {
      // The 'kind' parameter from the URL is actually the plural form used in the API
      // But if it's not available, we need to determine it from ConstraintTemplates
      let constraintPlural = kind ? kind.toLowerCase() : '';

      // If kind from URL is not available or seems like a singular form, try to get the correct plural from ConstraintTemplates
      if (!constraintPlural || constraintPlural === constraint.kind.toLowerCase()) {
        try {
          console.log('Fetching ConstraintTemplates to determine plural form...');
          const templatesResponse = await ApiProxy.request('/apis/templates.gatekeeper.sh/v1beta1/constrainttemplates');
          console.log('ConstraintTemplates response:', templatesResponse);

          if (templatesResponse && templatesResponse.items) {
            const matchingTemplate = templatesResponse.items.find((template: any) =>
              template.spec?.crd?.spec?.names?.kind === constraint.kind
            );

            if (matchingTemplate && matchingTemplate.spec?.crd?.spec?.names?.plural) {
              constraintPlural = matchingTemplate.spec.crd.spec.names.plural.toLowerCase();
              console.log(`Found matching template with plural: ${constraintPlural}`);
            } else {
              console.warn(`No matching template found for kind: ${constraint.kind}`);
            }
          }
        } catch (templateError: any) {
          console.warn('Failed to fetch ConstraintTemplates for plural form, falling back to simple pluralization', templateError);
        }
      }

      // Fallback to simple pluralization if we couldn't get it from ConstraintTemplates
      if (!constraintPlural) {
        const constraintKind = constraint.kind.toLowerCase();
        console.log(`Using fallback pluralization for kind: ${constraintKind}`);

        if (constraintKind.endsWith('y')) {
          constraintPlural = constraintKind.slice(0, -1) + 'ies';
        } else if (constraintKind.endsWith('s') || constraintKind.endsWith('sh') || constraintKind.endsWith('ch') || constraintKind.endsWith('x') || constraintKind.endsWith('z')) {
          constraintPlural = constraintKind + 'es';
        } else {
          constraintPlural = constraintKind + 's';
        }
        console.log(`Computed plural form: ${constraintPlural}`);
      }

      if (!constraintPlural) {
        throw new Error(`Could not determine plural form for constraint kind: ${constraint.kind}`);
      }

      if (!name) {
        throw new Error('Constraint name is missing');
      }

      const deleteUrl = `/apis/constraints.gatekeeper.sh/v1beta1/${constraintPlural}/${name}`;
      console.log(`Attempting to delete constraint with URL: ${deleteUrl}`);
      console.log(`Full URL parts - plural: "${constraintPlural}", name: "${name}"`);

      await ApiProxy.request(
        deleteUrl,
        {
          method: 'DELETE',
        }
      );

      console.log('Delete request successful');
      setSnackbarState({
        open: true,
        message: t('Constraint "{{name}}" deleted successfully', { name }),
        severity: 'success',
      });

      // Navigate back to constraints list after a short delay
      setTimeout(() => {
        // Extract cluster from current URL (format: /c/:cluster/...)
        const clusterMatch = location.pathname.match(/\/c\/([^\/]+)/);
        const cluster = clusterMatch ? clusterMatch[1] : null;
        
        if (cluster) {
          history.push(`/c/${cluster}${RoutingPath.Constraints}`);
        } else {
          history.push(RoutingPath.Constraints);
        }
      }, 1500);

    } catch (error: any) {
      console.error('Failed to delete constraint:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        json: error.json,
        response: error.response
      });

      let errorMessage = t('Failed to delete Constraint');
      if (error.json && error.json.message) {
        errorMessage = t('Failed to delete Constraint: {{message}}', { message: error.json.message });
      } else if (error.message) {
        errorMessage = t('Failed to delete Constraint: {{message}}', { message: error.message });
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
    const action = constraint.spec?.enforcementAction || 'warn';
    const actionColor = {
      deny: 'error',
      dryrun: 'warning',
      warn: 'info',
    }[action] as 'error' | 'warning' | 'info';

    return [
      {
        name: t('Name'),
        value: constraint.metadata.name,
      },
      {
        name: t('Kind'),
        value: constraint.kind,
      },
      {
        name: t('Created'),
        value: constraint.metadata.creationTimestamp,
      },
      {
        name: t('Enforcement Action'),
        value: <Chip label={action} color={actionColor} size="small" />,
      },
      {
        name: t('Total Violations'),
        value: constraint.status?.totalViolations?.toString() || '0',
      },
      {
        name: t('Last Audit'),
        value: constraint.status?.auditTimestamp || t('Never'),
      },
    ];
  }

  function getMatchRules() {
    if (!constraint.spec?.match) {
      return [];
    }

    const match = constraint.spec.match;
    const rules = [];

    if (match.kinds) {
      match.kinds.forEach((kindRule, index) => {
        rules.push({
          Property: t('API Groups'),
          Value: kindRule.apiGroups.join(', '),
          Index: `kinds-${index}-apiGroups`,
        });
        rules.push({
          Property: t('Kinds'),
          Value: kindRule.kinds.join(', '),
          Index: `kinds-${index}-kinds`,
        });
      });
    }

    if (match.excludedNamespaces) {
      rules.push({
        Property: t('Excluded Namespaces'),
        Value: match.excludedNamespaces.join(', '),
        Index: 'excludedNamespaces',
      });
    }

    return rules;
  }

  function getViolationRows() {
    if (!constraint.status?.violations) {
      return [];
    }

    return constraint.status.violations.map((violation, index) => ({
      Resource: `${violation.kind}/${violation.name}`,
      Namespace: violation.namespace || t('cluster-scoped'),
      Message: violation.message,
      Index: index,
    }));
  }

  return (
    <Box>
      {/* Header with title and delete button */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            {constraint.metadata.name}
          </Typography>
          <Typography variant="subtitle1" color="textSecondary" gutterBottom>
            {t('{{kind}} Constraint', { kind: constraint.kind })}
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

      <SectionBox title={t('Match Rules')}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('Property')}</TableCell>
              <TableCell>{t('Value')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {getMatchRules().map((row) => (
              <TableRow key={row.Index}>
                <TableCell>{row.Property}</TableCell>
                <TableCell>{row.Value}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionBox>

      <SectionBox title={t('Violations ({{count}})', { count: constraint.status?.totalViolations || 0 })}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('Resource')}</TableCell>
              <TableCell>{t('Namespace')}</TableCell>
              <TableCell>{t('Message')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {getViolationRows().map((row) => (
              <TableRow key={row.Index}>
                <TableCell>{row.Resource}</TableCell>
                <TableCell>{row.Namespace}</TableCell>
                <TableCell>{row.Message}</TableCell>
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
          {t('Delete Constraint')}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            {t('Are you sure you want to delete the {{kind}} constraint "{{name}}"? This action cannot be undone.', { kind: constraint.kind, name: constraint.metadata.name })}
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

export default ConstraintDetails;
