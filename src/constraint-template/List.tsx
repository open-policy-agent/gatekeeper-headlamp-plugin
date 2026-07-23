import {
  Link as HeadlampLink,
  SectionBox,
  SimpleTable,
} from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { KubeObject } from '@kinvolk/headlamp-plugin/lib/lib/k8s/cluster';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Typography,
} from '@mui/material';
import React, { useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { RoutingPath } from '../index';
import { ConstraintTemplateClass, requestConstraintTemplates } from '../model';
import { ConstraintTemplate } from '../types';

interface ConstraintTemplateListProps {
  hideTitle?: boolean;
}

function ConstraintTemplateList(props: ConstraintTemplateListProps) {
  const [constraintTemplates, setConstraintTemplates] = useState<KubeObject[] | null>(null);
  const [selectedTargetFilter, setSelectedTargetFilter] = useState<string>('');
  const [gatekeeperNotInstalled, setGatekeeperNotInstalled] = useState(false);
  const history = useHistory();
  const location = useLocation();

  ConstraintTemplateClass.useApiList(setConstraintTemplates);

  // Check if Gatekeeper CRD is installed
  useEffect(() => {
    const checkGatekeeperCRD = async () => {
      try {
        await requestConstraintTemplates();
      } catch (error: any) {
        // Check if it's a 404 or connection error indicating CRD doesn't exist
        if (
          error?.status === 404 ||
          error?.message?.includes('404') ||
          error?.message?.includes('not found') ||
          error?.message?.includes('no matches')
        ) {
          console.log('[ConstraintTemplateList] Gatekeeper CRDs not found');
          setGatekeeperNotInstalled(true);
        }
      }
    };

    checkGatekeeperCRD();
  }, []);

  const uniqueTargets = useMemo(() => {
    if (!constraintTemplates) return [];
    const allTargets = new Set<string>();
    constraintTemplates.forEach(ctObj => {
      const template = ctObj.jsonData as ConstraintTemplate;
      template.spec?.targets?.forEach(targetSpec => {
        if (targetSpec.target) {
          allTargets.add(targetSpec.target);
        }
      });
    });
    return ['', ...Array.from(allTargets).sort()]; // Add '' for "All Targets"
  }, [constraintTemplates]);

  const handleTargetFilterChange = (event: SelectChangeEvent<string>) => {
    setSelectedTargetFilter(event.target.value as string);
  };

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
      <SectionBox title={props.hideTitle ? undefined : 'Constraint Templates'}>
        <Alert severity="warning" sx={{ margin: 2 }}>
          <AlertTitle>Gatekeeper Not Found</AlertTitle>
          <Typography variant="body2" sx={{ marginBottom: 2 }}>
            Gatekeeper does not appear to be installed in your cluster. Install Gatekeeper to start
            using policy enforcement and constraint templates.
          </Typography>
          <Button variant="contained" color="primary" onClick={handleInstallGatekeeper}>
            Install Gatekeeper
          </Button>
        </Alert>
      </SectionBox>
    );
  }

  // Show loading state while waiting for data
  if (!constraintTemplates) {
    return <Typography>Loading constraint templates...</Typography>;
  }

  const templates = constraintTemplates
    .map((item: KubeObject) => item.jsonData as ConstraintTemplate)
    .filter(template => {
      if (!selectedTargetFilter) return true; // Show all if no filter selected
      return template.spec?.targets?.some(targetSpec => targetSpec.target === selectedTargetFilter);
    });

  function makeStatusLabel(item: ConstraintTemplate) {
    const status = item.status;
    if (!status) {
      return 'Unknown';
    }
    return status.created ? 'Ready' : 'Not Ready';
  }

  function getTargets(item: ConstraintTemplate) {
    return item.spec?.targets?.map(target => target.target).join(', ') || '';
  }

  return (
    <SectionBox title={props.hideTitle ? undefined : 'Constraint Templates'}>
      <Box sx={{ marginBottom: 2, maxWidth: 300 }}>
        <FormControl fullWidth size="small">
          <InputLabel id="target-filter-label">Filter by Target</InputLabel>
          <Select
            labelId="target-filter-label"
            id="target-filter-select"
            value={selectedTargetFilter}
            label="Filter by Target"
            onChange={handleTargetFilterChange}
          >
            {uniqueTargets.map(target => (
              <MenuItem key={target || 'all'} value={target}>
                {target || 'All Targets'}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      {templates.length === 0 && constraintTemplates.length > 0 ? (
        <Typography sx={{ padding: 2 }}>
          No constraint templates found for the selected target.
        </Typography>
      ) : templates.length === 0 && constraintTemplates.length === 0 ? (
        <Typography sx={{ padding: 2 }}>No constraint templates found.</Typography>
      ) : (
        <SimpleTable
          data={templates}
          columns={[
            {
              label: 'Name',
              getter: (template: any) => (
                <HeadlampLink
                  routeName={RoutingPath.ConstraintTemplate}
                  params={{
                    name: template.metadata.name,
                  }}
                >
                  {template.metadata.name}
                </HeadlampLink>
              ),
            },
            {
              label: 'Kind',
              getter: (template: any) => template.spec?.crd?.spec?.names?.kind || '',
            },
            {
              label: 'Targets',
              getter: (template: any) => getTargets(template),
            },
            {
              label: 'Status',
              getter: (template: any) => makeStatusLabel(template),
            },
            {
              label: 'Age',
              getter: (template: any) => template.metadata.creationTimestamp,
            },
          ]}
        />
      )}
    </SectionBox>
  );
}

export default ConstraintTemplateList;
