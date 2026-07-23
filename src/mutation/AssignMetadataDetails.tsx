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
import { AssignMetadataClass } from '../model';
import ResourceDeleteButton from '../components/ResourceDeleteButton';
import { RoutingPath } from '../index';

export default function AssignMetadataDetails() {
  const { name } = useParams<{ name: string }>();
  const [item, setItem] = useState<KubeObject | null>(null);

  AssignMetadataClass.useApiGet(setItem, name);

  if (!item) {
    return <Typography>Loading AssignMetadata Mutation details...</Typography>;
  }

  const data = item.jsonData as any;

  function getTargetKinds(item: any) {
    const kinds = new Set<string>();
    const matchKinds = item?.spec?.match?.kinds;
    if (Array.isArray(matchKinds)) {
      matchKinds.forEach((m: any) => {
        if (Array.isArray(m.kinds)) {
          m.kinds.forEach((k: string) => kinds.add(k));
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
        value: data.kind || 'AssignMetadata',
      },
      {
        name: 'Target Kinds (Match)',
        value: getTargetKinds(data),
      },
      {
        name: 'Location',
        value: data.spec?.location || '-',
      },
      {
        name: 'Assign Value',
        value: data.spec?.parameters?.assign?.value !== undefined ? JSON.stringify(data.spec.parameters.assign.value) : '-',
      }
    ];
  }
  
  
  const apiUrl = data.metadata.namespace 
      ? `/apis/mutations.gatekeeper.sh/v1beta1/namespaces/${data.metadata.namespace}/assignmetadata/${data.metadata.name}`
      : `/apis/mutations.gatekeeper.sh/v1beta1/assignmetadata/${data.metadata.name}`;

  return (
    <Box sx={{ pt: 2, pb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            {data.metadata.name}
          </Typography>
          <Typography variant="subtitle1" color="textSecondary" gutterBottom>
            AssignMetadata Mutation
          </Typography>
        </Box>
        <ResourceDeleteButton
          name={data.metadata.name}
          kind="AssignMetadata"
          apiUrl={apiUrl}
          redirectUrl={RoutingPath.Mutations}
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
        ) : (data.status?.byPod?.length > 0 && data.status.byPod.every((p: any) => p.enforced === true)) ? (
          <Alert severity="success">
            Active and successfully synced (enforced).
          </Alert>
        ) : (
          <Alert severity="info">
            Pending or not enforced.
          </Alert>
        )}
      </SectionBox>
    </Box>
  );
}
