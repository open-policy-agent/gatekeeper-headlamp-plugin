import { SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Box, Table, TableBody, TableCell, TableRow, Typography } from '@mui/material';
import React from 'react';
import { useParams } from 'react-router-dom';
import { GatekeeperResourceStatus } from '../components/GatekeeperResourceStatus';
import ResourceDeleteButton from '../components/ResourceDeleteButton';
import {
  ResourceDetailsError,
  ResourceDetailsLoading,
  useResourceDetails,
} from '../components/ResourceDetailsState';
import { RoutingPath } from '../index';
import { ProviderClass } from '../model';

export default function ProviderDetails() {
  const { name } = useParams<{ name: string }>();
  const { item, error } = useResourceDetails(ProviderClass, name);

  if (error) {
    return <ResourceDetailsError error={error} kind="Provider" name={name} />;
  }

  if (!item) {
    return <ResourceDetailsLoading kind="Provider" />;
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
          <Box
            component="pre"
            sx={{ maxWidth: '600px', overflowX: 'auto', bgcolor: '#f5f5f5', p: 1, borderRadius: 1 }}
          >
            {data.spec.caBundle}
          </Box>
        ) : (
          '-'
        ),
      },
    ];
  }

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
        <ResourceDeleteButton resource={item} kind="Provider" redirectUrl={RoutingPath.Providers} />
      </Box>

      <SectionBox title="Overview">
        <Table>
          <TableBody>
            {getMainInfoRows().map(row => (
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

      <GatekeeperResourceStatus resource={data} readinessField="active" />
    </Box>
  );
}
