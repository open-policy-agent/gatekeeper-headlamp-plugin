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
  Chip
} from '@mui/material';
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { SyncSetClass } from '../model';
import ResourceDeleteButton from '../components/ResourceDeleteButton';
import { RoutingPath } from '../index';

export default function SyncSetDetails() {
  const { name } = useParams<{ name: string }>();
  const [item, setItem] = useState<KubeObject | null>(null);

  SyncSetClass.useApiGet(setItem, name);

  if (!item) {
    return <Typography>Loading SyncSet details...</Typography>;
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
        value: data.kind || 'SyncSet',
      },
    ];
  }
  
  function getGvksRows() {
    const gvks = data.spec?.gvks;
    if (!Array.isArray(gvks)) return [];
    return gvks.map((gvk: any, i: number) => ({
      name: `Synced GVK ${i + 1}`,
      value: <Chip label={`${gvk.group || 'core'}/${gvk.version} ${gvk.kind}`} size="small" variant="outlined" />
    }));
  }

  const apiUrl = data.metadata.namespace 
      ? `/apis/syncset.gatekeeper.sh/v1alpha1/namespaces/${data.metadata.namespace}/syncsets/${data.metadata.name}`
      : `/apis/syncset.gatekeeper.sh/v1alpha1/syncsets/${data.metadata.name}`;

  return (
    <Box sx={{ pt: 2, pb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            {data.metadata.name}
          </Typography>
          <Typography variant="subtitle1" color="textSecondary" gutterBottom>
            SyncSet
          </Typography>
        </Box>
        <ResourceDeleteButton
          name={data.metadata.name}
          kind="SyncSet"
          apiUrl={apiUrl}
          redirectUrl={RoutingPath.Configuration}
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

      {getGvksRows().length > 0 && (
        <SectionBox title="Synced GVKs">
          <Table>
            <TableBody>
              {getGvksRows().map((row) => (
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
        ) : (
          <Alert severity="success">
            Active and successfully synced.
          </Alert>
        )}
      </SectionBox>
    </Box>
  );
}
