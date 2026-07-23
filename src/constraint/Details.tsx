import * as ApiProxy from '@kinvolk/headlamp-plugin/lib/ApiProxy';
import { SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import React, { useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import {
  buildClusterRedirectPath,
  isSameHistoryLocation,
} from '../components/ResourceDeleteButton';
import { RoutingPath } from '../index';
import { ConstraintClass, requestConstraintTemplates } from '../model';
import { Constraint } from '../types';

interface ConstraintDetailsProps {}

function ConstraintDetails({}: ConstraintDetailsProps) {
  const { kind, name } = useParams<{ kind: string; name: string }>();
  const [item, setItem] = useState<any | null>(null);
  const history = useHistory();

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

  ConstraintClass.useApiGet(setItem, name, kind);

  if (!item) {
    return <Typography>Loading constraint details...</Typography>;
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
        message: 'Cannot delete: missing constraint information',
        severity: 'error',
      });
      return;
    }

    console.log('Starting delete process for constraint:', {
      name,
      urlKind: kind,
      constraintKind: constraint.kind,
    });
    const deleteLocation = history.location;
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
          const templatesResponse = await requestConstraintTemplates();
          console.log('ConstraintTemplates response:', templatesResponse);

          if (templatesResponse && templatesResponse.items) {
            const matchingTemplate = templatesResponse.items.find(
              (template: any) => template.spec?.crd?.spec?.names?.kind === constraint.kind
            );

            if (matchingTemplate && matchingTemplate.spec?.crd?.spec?.names?.plural) {
              constraintPlural = matchingTemplate.spec.crd.spec.names.plural.toLowerCase();
              console.log(`Found matching template with plural: ${constraintPlural}`);
            } else {
              console.warn(`No matching template found for kind: ${constraint.kind}`);
            }
          }
        } catch (templateError: any) {
          console.warn(
            'Failed to fetch ConstraintTemplates for plural form, falling back to simple pluralization',
            templateError
          );
        }
      }

      // Fallback to simple pluralization if we couldn't get it from ConstraintTemplates
      if (!constraintPlural) {
        const constraintKind = constraint.kind.toLowerCase();
        console.log(`Using fallback pluralization for kind: ${constraintKind}`);

        if (constraintKind.endsWith('y')) {
          constraintPlural = constraintKind.slice(0, -1) + 'ies';
        } else if (
          constraintKind.endsWith('s') ||
          constraintKind.endsWith('sh') ||
          constraintKind.endsWith('ch') ||
          constraintKind.endsWith('x') ||
          constraintKind.endsWith('z')
        ) {
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

      await ApiProxy.request(deleteUrl, {
        method: 'DELETE',
      });

      console.log('Delete request successful');
      setSnackbarState({
        open: true,
        message: `Constraint "${name}" deleted successfully`,
        severity: 'success',
      });

      if (isSameHistoryLocation(history.location, deleteLocation)) {
        history.replace(buildClusterRedirectPath(deleteLocation.pathname, RoutingPath.Constraints));
      }
    } catch (error: any) {
      console.error('Failed to delete constraint:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        json: error.json,
        response: error.response,
      });

      let errorMessage = 'Failed to delete Constraint';
      if (error.json && error.json.message) {
        errorMessage = `Failed to delete Constraint: ${error.json.message}`;
      } else if (error.message) {
        errorMessage = `Failed to delete Constraint: ${error.message}`;
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
        name: 'Name',
        value: constraint.metadata.name,
      },
      {
        name: 'Kind',
        value: constraint.kind,
      },
      {
        name: 'Created',
        value: constraint.metadata.creationTimestamp,
      },
      {
        name: 'Enforcement Action',
        value: <Chip label={action} color={actionColor} size="small" />,
      },
      {
        name: 'Total Violations',
        value: constraint.status?.totalViolations?.toString() || '0',
      },
      {
        name: 'Last Audit',
        value: constraint.status?.auditTimestamp || 'Never',
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
          Property: 'API Groups',
          Value: kindRule.apiGroups.join(', '),
          Index: `kinds-${index}-apiGroups`,
        });
        rules.push({
          Property: 'Kinds',
          Value: kindRule.kinds.join(', '),
          Index: `kinds-${index}-kinds`,
        });
      });
    }

    if (match.excludedNamespaces) {
      rules.push({
        Property: 'Excluded Namespaces',
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
      Namespace: violation.namespace || 'cluster-scoped',
      Message: violation.message,
      Index: index,
    }));
  }

  return (
    <Box sx={{ pt: 2, pb: 2 }}>
      {/* Header with title and delete button */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            {constraint.metadata.name}
          </Typography>
          <Typography variant="subtitle1" color="textSecondary" gutterBottom>
            {constraint.kind} Constraint
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
          {isDeleting ? 'Deleting...' : 'Delete'}
        </Button>
      </Box>

      <SectionBox title="Overview">
        <Table>
          <TableBody>
            {getMainInfoRows().map(row => (
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

      <SectionBox title="Match Rules">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Property</TableCell>
              <TableCell>Value</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {getMatchRules().map(row => (
              <TableRow key={row.Index}>
                <TableCell>{row.Property}</TableCell>
                <TableCell>{row.Value}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionBox>

      <SectionBox title={`Violations (${constraint.status?.totalViolations || 0})`}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Resource</TableCell>
              <TableCell>Namespace</TableCell>
              <TableCell>Message</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {getViolationRows().map(row => (
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
        <DialogTitle id="delete-dialog-title">Delete Constraint</DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete the {constraint.kind} constraint "
            {constraint.metadata.name}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} color="primary">
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
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
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbarState.severity}
          sx={{ width: '100%' }}
        >
          {snackbarState.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default ConstraintDetails;
