import {
  Link as HeadlampLink,
  SectionBox,
  SimpleTable,
} from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import {
  Chip,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Button,
  Alert,
  AlertTitle,
} from '@mui/material';
import React, { useState, useEffect, useMemo } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { RoutingPath } from '../index';
import { ConstraintClass, ConstraintTemplateClass } from '../model';
import { Constraint } from '../types';
import * as ApiProxy from '@kinvolk/headlamp-plugin/lib/ApiProxy';

interface ConstraintListProps { hideTitle?: boolean; }

function ConstraintList(props: ConstraintListProps) {
  const [constraints, setConstraints] = useState<any[] | null>(null);
  const [kindFilter, setKindFilter] = useState<string>('All');
  const [enforcementActionFilter, setEnforcementActionFilter] = useState<string>('All');
  const [uniqueKinds, setUniqueKinds] = useState<string[]>(['All']);
  const [uniqueEnforcementActions, setUniqueEnforcementActions] = useState<string[]>(['All']);
  const [gatekeeperNotInstalled, setGatekeeperNotInstalled] = useState(false);
  const history = useHistory();
  const location = useLocation();

  console.log('🔍 [ConstraintList] component mounted');

  const handleSetConstraints = React.useCallback((data: any[] | null) => {
    console.log('🎯 [ConstraintList] ConstraintClass.useApiList received constraint data:', data);
    setConstraints(data);
  }, []); // Empty dependency array: callback is created once

  ConstraintClass.useApiList(handleSetConstraints);

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
          console.error('[ConstraintList] Could not find API request function');
          return;
        }

        // Try to fetch constraint templates - if this fails, Gatekeeper is likely not installed
        await requestFunc('/apis/templates.gatekeeper.sh/v1beta1/constrainttemplates');
      } catch (error: any) {
        // Check if it's a 404 or connection error indicating CRD doesn't exist
        if (error?.status === 404 || error?.message?.includes('404') ||
            error?.message?.includes('not found') || error?.message?.includes('no matches')) {
          console.log('[ConstraintList] Gatekeeper CRDs not found');
          setGatekeeperNotInstalled(true);
        }
      }
    };

    checkGatekeeperCRD();
  }, []);

  useEffect(() => {
    if (constraints) {
      const kinds = new Set<string>(['All']);
      const actions = new Set<string>(['All']);
      constraints.forEach(item => {
        const constraint = item.jsonData || item;
        if (constraint.kind) {
          kinds.add(constraint.kind);
        }
        actions.add(constraint.spec?.enforcementAction || 'warn');
      });
      setUniqueKinds(Array.from(kinds).sort());
      setUniqueEnforcementActions(Array.from(actions).sort());
    }
  }, [constraints]);

  const filteredConstraints = useMemo(() => {
    if (!constraints) return [];
    return constraints
      .map(item => (item.jsonData || item) as Constraint)
      .filter(constraint => {
        const kindMatch = kindFilter === 'All' || constraint.kind === kindFilter;
        const enforcementActionMatch = enforcementActionFilter === 'All' || (constraint.spec?.enforcementAction || 'warn') === enforcementActionFilter;
        return kindMatch && enforcementActionMatch;
      });
  }, [constraints, kindFilter, enforcementActionFilter]);

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
      <SectionBox title={props.hideTitle ? undefined : "Constraints"}>
        <Alert severity="warning" sx={{ margin: 2 }}>
          <AlertTitle>Gatekeeper Not Found</AlertTitle>
          <Typography variant="body2" sx={{ marginBottom: 2 }}>
            Gatekeeper does not appear to be installed in your cluster.
            Install Gatekeeper to start using policy enforcement and constraints.
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

  if (!constraints) {
    console.log('⏳ [ConstraintList] Loading constraints...');
    return (
      <div>
        <Typography>Loading constraints...</Typography>
      </div>
    );
  }

  console.log('✅ Constraints loaded, count:', constraints.length);
  console.log('Applied filters - Kind:', kindFilter, 'Enforcement:', enforcementActionFilter);
  console.log('Filtered constraints count:', filteredConstraints.length);

  function makeEnforcementActionChip(item: Constraint) {
    const action = item.spec?.enforcementAction || 'warn';
    const color = {
      deny: 'error',
      dryrun: 'warning',
      warn: 'info',
    }[action] as 'error' | 'warning' | 'info';

    return <Chip label={action} color={color} size="small" />;
  }

  function getViolationCount(item: Constraint) {
    return item.status?.totalViolations?.toString() || '0';
  }

  function getMatchedKinds(item: Constraint) {
    if (!item.spec?.match?.kinds) {
      return '';
    }
    return item.spec.match.kinds
      .map(kind => kind.kinds.join(', '))
      .join('; ');
  }

  return (
    <SectionBox title={props.hideTitle ? undefined : "Constraints"}>
      <Box sx={{ display: 'flex', gap: 2, p: 2, alignItems: 'center' }}>
        <FormControl sx={{ minWidth: 150 }} size="small">
          <InputLabel id="kind-filter-label">Kind</InputLabel>
          <Select
            labelId="kind-filter-label"
            value={kindFilter}
            label="Kind"
            onChange={(e) => setKindFilter(e.target.value as string)}
          >
            {uniqueKinds.map(kind => (
              <MenuItem key={kind} value={kind}>{kind}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 200 }} size="small">
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
      </Box>
      {filteredConstraints.length === 0 ? (
        <Typography sx={{ padding: 2 }}>
          {constraints.length > 0 ? 'No constraints match the current filters.' : 'No constraints found.'}
        </Typography>
      ) : (
          <SimpleTable
            data={filteredConstraints}
            columns={[
              {
                label: 'Name',
                getter: (constraint) => (
                  <HeadlampLink
                    routeName={RoutingPath.Constraint}
                    params={{
                      kind: constraint.kind,
                      name: constraint.metadata.name,
                    }}
                  >
                    {constraint.metadata.name}
                  </HeadlampLink>
                ),
              },
              {
                label: 'Kind',
                getter: (constraint) => constraint.kind,
              },
              {
                label: 'Enforcement Action',
                getter: (constraint) => makeEnforcementActionChip(constraint),
              },
              {
                label: 'Target Kinds',
                getter: (constraint) => getMatchedKinds(constraint) || '-',
              },
              {
                label: 'Violations',
                getter: (constraint) => getViolationCount(constraint),
              },
              {
                label: 'Age',
                getter: (constraint) => constraint.metadata.creationTimestamp,
              },
            ]}
          />
      )}
    </SectionBox>
  );
}

export default ConstraintList;
