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
import { ConfigClass } from '../model';
import ResourceDeleteButton from '../components/ResourceDeleteButton';
import { RoutingPath } from '../index';

export default function ConfigDetails() {
  const { namespace, name } = useParams<{ namespace: string; name: string }>();
  const [item, setItem] = useState<KubeObject | null>(null);

  ConfigClass.useApiGet(setItem, name, namespace || 'gatekeeper-system');

  if (!item) {
    return <Typography>Loading Config details...</Typography>;
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
        value: data.metadata.namespace || '-',
      },
      {
        name: 'Created',
        value: data.metadata.creationTimestamp,
      },
      {
        name: 'Kind',
        value: data.kind || 'Config',
      },
    ];
  }
  
  function getSyncOnlyRows() {
    const syncOnly = data.spec?.sync?.syncOnly;
    if (!Array.isArray(syncOnly)) return [];
    return syncOnly.map((s: any, i: number) => ({
      name: `Sync Resource ${i + 1}`,
      value: <Chip label={`${s.group || 'core'}/${s.version} ${s.kind}`} size="small" variant="outlined" />
    }));
  }

  function getMatchRows() {
    const matches = data.spec?.match;
    if (!Array.isArray(matches)) return [];
    return matches.map((m: any, i: number) => ({
      name: `Match Config ${i + 1}`,
      value: JSON.stringify(m)
    }));
  }

  const apiUrl = data.metadata.namespace 
      ? `/apis/config.gatekeeper.sh/v1alpha1/namespaces/${data.metadata.namespace}/configs/${data.metadata.name}`
      : `/apis/config.gatekeeper.sh/v1alpha1/configs/${data.metadata.name}`;

  return (
    <Box sx={{ pt: 2, pb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            {data.metadata.name}
          </Typography>
          <Typography variant="subtitle1" color="textSecondary" gutterBottom>
            Config
          </Typography>
        </Box>
        <ResourceDeleteButton
          name={data.metadata.name}
          kind="Config"
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

      {getSyncOnlyRows().length > 0 && (
        <SectionBox title="Sync Resources (syncOnly)">
          <Table>
            <TableBody>
              {getSyncOnlyRows().map((row) => (
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

      {getMatchRows().length > 0 && (
        <SectionBox title="Match Configurations">
          <Table>
            <TableBody>
              {getMatchRows().map((row) => (
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
