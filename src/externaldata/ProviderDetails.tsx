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
} from '@mui/material';
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ProviderClass } from '../model';
import ResourceDeleteButton from '../components/ResourceDeleteButton';
import { RoutingPath } from '../index';

export default function ProviderDetails() {
  const { name } = useParams<{ name: string }>();
  const [item, setItem] = useState<KubeObject | null>(null);

  ProviderClass.useApiGet(setItem, name);

  if (!item) {
    return <Typography>Loading Provider details...</Typography>;
  }

  const data = item.jsonData as any;

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
        value: data.kind || 'Provider',
      },
      {
        name: 'URL',
        value: data.spec?.url || '-',
      },
      {
        name: 'Timeout',
        value: data.spec?.timeout ? `${data.spec.timeout}s` : '-',
      },
      {
        name: 'CA Bundle',
        value: data.spec?.caBundle ? (
           <Box component="pre" sx={{ maxWidth: '600px', overflowX: 'auto', bgcolor: '#f5f5f5', p: 1, borderRadius: 1 }}>
             {data.spec.caBundle}
           </Box>
        ) : '-',
      }
    ];
  }
  
  
  const apiUrl = data.metadata.namespace 
      ? `/apis/externaldata.gatekeeper.sh/v1beta1/namespaces/${data.metadata.namespace}/providers/${data.metadata.name}`
      : `/apis/externaldata.gatekeeper.sh/v1beta1/providers/${data.metadata.name}`;

  return (
    <Box sx={{ pt: 2, pb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            {data.metadata.name}
          </Typography>
          <Typography variant="subtitle1" color="textSecondary" gutterBottom>
            External Data Provider
          </Typography>
        </Box>
        <ResourceDeleteButton
          name={data.metadata.name}
          kind="Provider"
          apiUrl={apiUrl}
          redirectUrl={RoutingPath.ExternalData}
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
