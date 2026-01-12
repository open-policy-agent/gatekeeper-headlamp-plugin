import {
  Link as HeadlampLink,
  SectionBox,
} from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { KubeObject } from '@kinvolk/headlamp-plugin/lib/lib/k8s/cluster';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  Button,
  Alert,
  AlertTitle,
} from '@mui/material';
import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory, useLocation } from 'react-router-dom';
import { RoutingPath } from '../index';
import { ConstraintTemplateClass } from '../model';
import { ConstraintTemplate } from '../types';
import * as ApiProxy from '@kinvolk/headlamp-plugin/lib/ApiProxy';

interface ConstraintTemplateListProps {}

function ConstraintTemplateList({}: ConstraintTemplateListProps) {
  const { t } = useTranslation();
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
          console.error('[ConstraintTemplateList] Could not find API request function');
          return;
        }

        // Try to fetch constraint templates - if this fails, Gatekeeper is likely not installed
        await requestFunc('/apis/templates.gatekeeper.sh/v1beta1/constrainttemplates');
      } catch (error: any) {
        // Check if it's a 404 or connection error indicating CRD doesn't exist
        if (error?.status === 404 || error?.message?.includes('404') ||
            error?.message?.includes('not found') || error?.message?.includes('no matches')) {
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
      <SectionBox title={t('Constraint Templates')}>
        <Alert severity="warning" sx={{ margin: 2 }}>
          <AlertTitle>{t('Gatekeeper Not Found')}</AlertTitle>
          <Typography variant="body2" sx={{ marginBottom: 2 }}>
            {t('Gatekeeper does not appear to be installed in your cluster. Install Gatekeeper to start using policy enforcement and constraint templates.')}
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={handleInstallGatekeeper}
          >
            {t('Install Gatekeeper')}
          </Button>
        </Alert>
      </SectionBox>
    );
  }

  // Show loading state while waiting for data
  if (!constraintTemplates) {
    return <Typography>{t('Loading constraint templates...')}</Typography>;
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
      return t('Unknown');
    }
    return status.created ? t('Ready') : t('Not Ready');
  }

  function getTargets(item: ConstraintTemplate) {
    return item.spec?.targets?.map(target => target.target).join(', ') || '';
  }

  return (
    <SectionBox title={t('Constraint Templates')}>
      <Box sx={{ marginBottom: 2, maxWidth: 300 }}>
        <FormControl fullWidth size="small">
          <InputLabel id="target-filter-label">{t('Filter by Target')}</InputLabel>
          <Select
            labelId="target-filter-label"
            id="target-filter-select"
            value={selectedTargetFilter}
            label={t('Filter by Target')}
            onChange={handleTargetFilterChange}
          >
            {uniqueTargets.map(target => (
              <MenuItem key={target || 'all'} value={target}>
                {target || t('All Targets')}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      {templates.length === 0 && constraintTemplates.length > 0 ? (
        <Typography sx={{ padding: 2 }}>
          {t('No constraint templates found for the selected target.')}
        </Typography>
      ) : templates.length === 0 && constraintTemplates.length === 0 ? (
        <Typography sx={{ padding: 2 }}>{t('No constraint templates found.')}</Typography>
      ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('Name')}</TableCell>
                  <TableCell>{t('Kind')}</TableCell>
                  <TableCell>{t('Targets')}</TableCell>
                  <TableCell>{t('Status')}</TableCell>
                  <TableCell>{t('Age')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.metadata.name}>
                    <TableCell>
                      <HeadlampLink
                        routeName={RoutingPath.ConstraintTemplate}
                        params={{
                          name: template.metadata.name,
                        }}
                      >
                        {template.metadata.name}
                      </HeadlampLink>
                    </TableCell>
                    <TableCell>{template.spec?.crd?.spec?.names?.kind || ''}</TableCell>
                    <TableCell>{getTargets(template)}</TableCell>
                    <TableCell>{makeStatusLabel(template)}</TableCell>
                    <TableCell>{template.metadata.creationTimestamp}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
      )}
    </SectionBox>
  );
}

export default ConstraintTemplateList;
