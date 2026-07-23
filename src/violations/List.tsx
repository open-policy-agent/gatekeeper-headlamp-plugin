import {
  Link,
  Loader,
  SectionBox,
  SimpleTable,
} from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import {
  Chip,
  Paper,
  TableContainer,
  Typography,
  Box, // Added Box
  Select, // Added Select
  MenuItem, // Added MenuItem
  FormControl, // Added FormControl
  InputLabel, // Added InputLabel
  TextField, // Added TextField
  Button,
  Alert,
  AlertTitle,
} from '@mui/material';
import React, { useState, useMemo, useEffect } from 'react'; // Added useMemo, useEffect
import { useHistory, useLocation } from 'react-router-dom';
import { RoutingPath } from '../index';
import { ConstraintClass } from '../model';
import { Constraint, Violation } from '../types';
import * as ApiProxy from '@kinvolk/headlamp-plugin/lib/ApiProxy';

interface ViolationsListProps { hideTitle?: boolean; }

interface ViolationWithConstraint extends Violation {
  constraintName: string;
  constraintKind: string;
  enforcementAction: string;
}

function ViolationsList(props: ViolationsListProps) {
  const [constraintObjects, setConstraintObjects] = useState<any[] | null>(null);
  // Filter states
  const [resourceKindFilter, setResourceKindFilter] = useState<string>('All');
  const [constraintKindFilter, setConstraintKindFilter] = useState<string>('All');
  const [enforcementActionFilter, setEnforcementActionFilter] = useState<string>('All');
  const [resourceNameFilter, setResourceNameFilter] = useState<string>('');

  // State for unique values for dropdowns
  const [uniqueResourceKinds, setUniqueResourceKinds] = useState<string[]>(['All']);
  const [uniqueConstraintKinds, setUniqueConstraintKinds] = useState<string[]>(['All']);
  const [uniqueEnforcementActions, setUniqueEnforcementActions] = useState<string[]>(['All']);
  const [gatekeeperNotInstalled, setGatekeeperNotInstalled] = useState(false);
  const history = useHistory();
  const location = useLocation();

  console.log('🔍 [ViolationsList] component mounted');

  const handleSetConstraintObjects = React.useCallback((data: any[] | null) => {
    console.log('🎯 [ViolationsList] ConstraintClass.useApiList received data:', data);
    setConstraintObjects(data);
  }, []); // Empty dependency array: callback is created once

  // Use only the dynamic ConstraintClass
  ConstraintClass.useApiList(handleSetConstraintObjects);

  // Check if Gatekeeper CRD is installed
  useEffect(() => {
    const checkGatekeeperCRD = async () => {
      try {
        // Get the request function from ApiProxy
        const apiProxyModule = ApiProxy as any;
        let requestFunc: ((url: string) => Promise<any>) | undefined;

        if (typeof apiProxyModule.request === 'function') {
          requestFunc = apiProxyModule.request;
        } else if (typeof apiProxyModule.default === 'function') {
          requestFunc = apiProxyModule.default;
        } else if (apiProxyModule.default && typeof apiProxyModule.default.request === 'function') {
          requestFunc = apiProxyModule.default.request;
        }

        if (!requestFunc) {
          console.error('[ViolationsList] Could not find API request function');
          return;
        }

        // Try to fetch constraint templates - if this fails, Gatekeeper is likely not installed
        await requestFunc('/apis/templates.gatekeeper.sh/v1beta1/constrainttemplates');
      } catch (error: any) {
        // Check if it's a 404 or connection error indicating CRD doesn't exist
        if (error?.status === 404 || error?.message?.includes('404') ||
            error?.message?.includes('not found') || error?.message?.includes('no matches')) {
          console.log('[ViolationsList] Gatekeeper CRDs not found');
          setGatekeeperNotInstalled(true);
        }
      }
    };

    checkGatekeeperCRD();
  }, []);

  // Flatten violations from all constraints
  const violations: ViolationWithConstraint[] = React.useMemo(() => {
    if (!constraintObjects) {
      console.log('[ViolationsList] No constraint objects yet, returning empty violations.');
      return [];
    }

    console.log('[ViolationsList] Processing constraintObjects:', constraintObjects);
    const allViolations: ViolationWithConstraint[] = [];

    constraintObjects.forEach((constraintObj: any) => {
      // Handle both KubeObject instances and raw constraint objects
      const constraint = constraintObj.jsonData ? (constraintObj.jsonData as Constraint) : (constraintObj as Constraint);

      if (constraint.status?.violations) {
        constraint.status.violations.forEach((violation) => {
          allViolations.push({
            ...violation,
            constraintName: constraint.metadata.name,
            constraintKind: constraint.kind,
            enforcementAction: constraint.spec?.enforcementAction || 'warn',
          });
        });
      }
    });

    console.log('[ViolationsList] Processed violations:', allViolations);
    return allViolations;
  }, [constraintObjects]);

  // Effect to populate filter dropdown options
  useEffect(() => {
    if (violations.length > 0) {
      const rKinds = new Set<string>(['All']);
      const cKinds = new Set<string>(['All']);
      const actions = new Set<string>(['All']);

      violations.forEach(v => {
        if (v.kind) rKinds.add(v.kind);
        if (v.constraintKind) cKinds.add(v.constraintKind);
        if (v.enforcementAction) actions.add(v.enforcementAction);
      });

      setUniqueResourceKinds(Array.from(rKinds).sort());
      setUniqueConstraintKinds(Array.from(cKinds).sort());
      setUniqueEnforcementActions(Array.from(actions).sort());
    }
  }, [violations]);

  const filteredViolations = useMemo(() => {
    return violations.filter(v => {
      const resourceKindMatch = resourceKindFilter === 'All' || v.kind === resourceKindFilter;
      const constraintKindMatch = constraintKindFilter === 'All' || v.constraintKind === constraintKindFilter;
      const enforcementActionMatch = enforcementActionFilter === 'All' || v.enforcementAction === enforcementActionFilter;
      const fullResourceName = v.namespace ? `${v.namespace}/${v.name}` : v.name;
      const resourceNameMatch = resourceNameFilter === '' || fullResourceName.toLowerCase().includes(resourceNameFilter.toLowerCase());

      return resourceKindMatch && constraintKindMatch && enforcementActionMatch && resourceNameMatch;
    });
  }, [violations, resourceKindFilter, constraintKindFilter, enforcementActionFilter, resourceNameFilter]);

  function makeEnforcementActionChip(violation: ViolationWithConstraint) {
    const action = violation.enforcementAction;
    const color = {
      deny: 'error',
      dryrun: 'warning',
      warn: 'info',
    }[action] as 'error' | 'warning' | 'info';

    return <Chip label={action} color={color} size="small" />;
  }

  function getResourceName(violation: ViolationWithConstraint) {
    return violation.namespace
      ? `${violation.namespace}/${violation.name}`
      : violation.name;
  }

  // Show install prompt if Gatekeeper is not installed
  if (gatekeeperNotInstalled) {
    const handleInstallGatekeeper = () => {
      // Navigate to Gatekeeper Helm chart with cluster context
      // Extract cluster from current URL (format: /c/:cluster/...)
      const clusterMatch = location.pathname.match(/\/c\/([^\/]+)/);
      const cluster = clusterMatch ? clusterMatch[1] : null;

      if (cluster) {
        history.push(`/c/${cluster}/helm/gatekeeper/charts/gatekeeper`);
      }
    };

    return (
      <SectionBox title={props.hideTitle ? undefined : "Violations"}>
        <Alert severity="warning" sx={{ margin: 2 }}>
          <AlertTitle>Gatekeeper Not Found</AlertTitle>
          <Typography variant="body2" sx={{ marginBottom: 2 }}>
            Gatekeeper does not appear to be installed in your cluster.
            Install Gatekeeper to start using policy enforcement and track violations.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={handleInstallGatekeeper}
          >
            Install Gatekeeper
          </Button>
        </Alert>
      </SectionBox>
    );
  }

  return (
    <SectionBox title={props.hideTitle ? undefined : "Violations"}>
      {!constraintObjects ? (
        <Loader title={props.hideTitle ? undefined : "Loading violations..."} />
      ) : (
          <>
            <Box sx={{ display: 'flex', gap: 2, p: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <FormControl sx={{ minWidth: 180 }} size="small">
                <InputLabel id="resource-kind-filter-label">Resource Kind</InputLabel>
                <Select
                  labelId="resource-kind-filter-label"
                  value={resourceKindFilter}
                  label="Resource Kind"
                  onChange={(e) => setResourceKindFilter(e.target.value as string)}
                >
                  {uniqueResourceKinds.map(kind => (
                    <MenuItem key={kind} value={kind}>{kind}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl sx={{ minWidth: 180 }} size="small">
                <InputLabel id="constraint-kind-filter-label">Constraint Kind</InputLabel>
                <Select
                  labelId="constraint-kind-filter-label"
                  value={constraintKindFilter}
                  label="Constraint Kind"
                  onChange={(e) => setConstraintKindFilter(e.target.value as string)}
                >
                  {uniqueConstraintKinds.map(kind => (
                    <MenuItem key={kind} value={kind}>{kind}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl sx={{ minWidth: 180 }} size="small">
                <InputLabel id="enforcement-action-filter-label">Enforcement Action</InputLabel>
                <Select
                  labelId="enforcement-action-filter-label"
                  value={enforcementActionFilter}
                  label="Enforcement Action"
                  onChange={(e) => setEnforcementActionFilter(e.target.value as string)}
                >
                  {uniqueEnforcementActions.map(action => (
                    <MenuItem key={action} value={action}>{action}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Resource Name (ns/name or name)"
                variant="outlined"
                size="small"
                value={resourceNameFilter}
                onChange={(e) => setResourceNameFilter(e.target.value)}
                sx={{ minWidth: 250 }}
              />
            </Box>
            {violations.length === 0 && constraintObjects.length > 0 && (
              <Typography sx={{ padding: 2 }}>No violations found across {constraintObjects.length} constraints.</Typography>
            )}
            {/* Update empty messages based on filters */}
            {violations.length > 0 && filteredViolations.length === 0 && (
                <Typography sx={{ padding: 2 }}>No violations match the current filters.</Typography>
            )}
            {constraintObjects.length === 0 && violations.length === 0 && (
              <Typography sx={{ padding: 2 }}>No violations found.</Typography>
            )}
            {filteredViolations.length > 0 && (
              <TableContainer component={Paper}>
                <SimpleTable
                  data={filteredViolations}
                  columns={[
                    {
                      label: 'Resource',
                      getter: (violation: any) => (
                        <Link
                          routeName={RoutingPath.Violation}
                          params={{
                            kind: violation.constraintKind,
                            name: violation.constraintName,
                          }}
                        >
                          {getResourceName(violation)}
                        </Link>
                      ),
                    },
                    {
                      label: 'Kind',
                      getter: (violation: any) => violation.kind,
                    },
                    {
                      label: 'Constraint',
                      getter: (violation: any) => (
                          <Link
                            routeName={RoutingPath.Constraint}
                            params={{
                              kind: violation.constraintKind,
                              name: violation.constraintName,
                            }}
                          >
                            {violation.constraintName}
                          </Link>
                      )
                    },
                    {
                      label: 'Constraint Kind',
                      getter: (violation: any) => violation.constraintKind,
                    },
                    {
                      label: 'Enforcement',
                      getter: (violation: any) => makeEnforcementActionChip(violation),
                    },
                    {
                      label: 'Message',
                      getter: (violation: any) => violation.message,
                    },
                  ]}
                />
              </TableContainer>
            )}
          </>
      )}
    </SectionBox>
  );
}

export default ViolationsList;
