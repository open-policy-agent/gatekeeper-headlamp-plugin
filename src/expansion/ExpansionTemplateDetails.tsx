import {
  SectionBox,
} from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { KubeObject } from '@kinvolk/headlamp-plugin/lib/lib/k8s/cluster';
import {
  Alert,
  Box,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Typography,
  Chip,
  Paper
} from '@mui/material';
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ExpansionTemplateClass } from '../model';
import ResourceDeleteButton from '../components/ResourceDeleteButton';
import { RoutingPath } from '../index';

export default function ExpansionTemplateDetails() {
  const { name } = useParams<{ name: string }>();
  const [item, setItem] = useState<KubeObject | null>(null);

  ExpansionTemplateClass.useApiGet(setItem, name);

  if (!item) {
    return <Typography>Loading Expansion Template details...</Typography>;
  }

  const data = item.jsonData as any;

  function getTargetKinds(item: any) {
    const kinds = new Set<string>();
    const applyTo = item?.spec?.applyTo;
    if (Array.isArray(applyTo)) {
      applyTo.forEach((a: any) => {
        if (Array.isArray(a.kinds)) {
          a.kinds.forEach((k: string) => kinds.add(k));
        }
      });
    }
    const kindsArr = Array.from(kinds);
    if (kindsArr.length === 0) return '-';
    return (
      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
        {kindsArr.map(k => <Chip key={k} label={k} size="small" variant="outlined" />)}
      </Box>
    );
  }

  function getMainInfoRows() {
    return [
      {
        name: 'Name',
        value: data.metadata.name,
      },
      {
        name: 'Namespace',
        value: data.metadata.namespace || 'Cluster Scoped',
      },
      {
        name: 'Created',
        value: data.metadata.creationTimestamp,
      },
      {
        name: 'Kind',
        value: data.kind || 'ExpansionTemplate',
      },
      {
        name: 'Target Kinds (applyTo)',
        value: getTargetKinds(data),
      },
      {
        name: 'Generated GVK',
        value: data.spec?.generatedGVK 
          ? <Chip label={`${data.spec.generatedGVK.group || 'core'}/${data.spec.generatedGVK.version} ${data.spec.generatedGVK.kind}`} size="small" color="primary" variant="outlined" />
          : '-',
      }
    ];
  }
  
  
  const apiUrl = data.metadata.namespace 
      ? `/apis/expansion.gatekeeper.sh/v1alpha1/namespaces/${data.metadata.namespace}/expansiontemplate/${data.metadata.name}`
      : `/apis/expansion.gatekeeper.sh/v1alpha1/expansiontemplate/${data.metadata.name}`;

  return (
    <Box sx={{ pt: 2, pb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            {data.metadata.name}
          </Typography>
          <Typography variant="subtitle1" color="textSecondary" gutterBottom>
            Expansion Template
          </Typography>
        </Box>
        <ResourceDeleteButton
          name={data.metadata.name}
          kind="ExpansionTemplate"
          apiUrl={apiUrl}
          redirectUrl={RoutingPath.ExpansionTemplates}
        />
      </Box>

      <SectionBox title="Overview">
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

      {data.spec?.templateSource && (
        <SectionBox title="Template Source (Rego)">
          <Paper elevation={1} sx={{ p: 2, bgcolor: '#f5f5f5', overflowX: 'auto' }}>
            <Box component="pre" sx={{ margin: 0, fontFamily: 'monospace', fontSize: '0.875rem' }}>
              {data.spec.templateSource}
            </Box>
          </Paper>
        </SectionBox>
      )}
      
      
      <SectionBox title="System Sync Status">
        {(data.status?.errors && data.status.errors.length > 0) || (data.status?.byPod && data.status.byPod.some((p: any) => p.errors && p.errors.length > 0)) ? (
          <Box>
            {data.status?.errors && data.status.errors.length > 0 && (
              <Alert severity="error" sx={{ mb: 2 }}>
                <strong>Global Error:</strong> {JSON.stringify(data.status.errors)}
              </Alert>
            )}
            {data.status?.byPod && data.status.byPod.some((p: any) => p.errors && p.errors.length > 0) && (
              <Alert severity="error">
                <strong>Sync Error:</strong> Failed to load this rule in Gatekeeper.
                <ul style={{ margin: 0, paddingLeft: '20px', marginTop: '8px' }}>
                  {data.status.byPod.filter((p: any) => p.errors && p.errors.length > 0).map((p: any) => (
                    <li key={p.id}>{p.id}: {JSON.stringify(p.errors)}</li>
                  ))}
                </ul>
              </Alert>
            )}
          </Box>
        ) : (
          <Alert severity="success">
            Active and successfully synced.
          </Alert>
        )}
      </SectionBox>
    </Box>
  );
}
