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
import { ConnectionClass } from '../model';
import ResourceDeleteButton from '../components/ResourceDeleteButton';
import { RoutingPath } from '../index';

export default function ConnectionDetails() {
  const { namespace, name } = useParams<{ namespace: string; name: string }>();
  const [item, setItem] = useState<KubeObject | null>(null);

  ConnectionClass.useApiGet(setItem, name, namespace || 'gatekeeper-system');

  if (!item) {
    return <Typography>Loading External Data Connection details...</Typography>;
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
        value: data.kind || 'Connection',
      },
      {
        name: 'Driver',
        value: data.spec?.driver || '-',
      }
    ];
  }
  
  function getConfigRows() {
    const config = data.spec?.config;
    if (!config || typeof config !== 'object') return [];
    
    return Object.entries(config).map(([key, value]) => ({
      name: key,
      value: String(value)
    }));
  }
  
    const configRows = getConfigRows();

  const apiUrl = data.metadata.namespace 
      ? `/apis/connection.gatekeeper.sh/v1alpha1/namespaces/${data.metadata.namespace}/connections/${data.metadata.name}`
      : `/apis/connection.gatekeeper.sh/v1alpha1/connections/${data.metadata.name}`;

  return (
    <Box sx={{ pt: 2, pb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            {data.metadata.name}
          </Typography>
          <Typography variant="subtitle1" color="textSecondary" gutterBottom>
            External Data Connection
          </Typography>
        </Box>
        <ResourceDeleteButton
          name={data.metadata.name}
          kind="Connection"
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
      
      {configRows.length > 0 && (
        <SectionBox title="Driver Configuration">
          <Table>
            <TableBody>
              {configRows.map((row) => (
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
        ) : (data.status?.byPod?.length > 0 && data.status.byPod.every((p: any) => p.active === true)) ? (
          <Alert severity="success">
            Active and successfully synced.
          </Alert>
        ) : (
          <Alert severity="info">
            Inactive or pending.
          </Alert>
        )}
      </SectionBox>
    </Box>
  );
}
