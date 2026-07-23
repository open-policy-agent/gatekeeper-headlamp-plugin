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
import { ConnectionClass } from '../model';

export default function ConnectionDetails() {
  const { namespace, name } = useParams<{ namespace: string; name: string }>();
  const { item, error } = useResourceDetails(
    ConnectionClass,
    name,
    namespace || 'gatekeeper-system'
  );

  if (error) {
    return <ResourceDetailsError error={error} kind="Connection" name={name} />;
  }

  if (!item) {
    return <ResourceDetailsLoading kind="Violation Export Connection" />;
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
      },
    ];
  }

  function getConfigRows() {
    const config = data.spec?.config;
    if (!config || typeof config !== 'object') return [];

    return Object.entries(config).map(([key, value]) => ({
      name: key,
      value: String(value),
    }));
  }

  const configRows = getConfigRows();

  return (
    <Box sx={{ pt: 2, pb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            {data.metadata.name}
          </Typography>
          <Typography variant="subtitle1" color="textSecondary" gutterBottom>
            Violation Export Connection
          </Typography>
        </Box>
        <ResourceDeleteButton
          resource={item}
          kind="Connection"
          redirectUrl={RoutingPath.ViolationExport}
        />
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

      {configRows.length > 0 && (
        <SectionBox title="Driver Configuration">
          <Table>
            <TableBody>
              {configRows.map(row => (
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

      <GatekeeperResourceStatus resource={data} readinessField="active" />
    </Box>
  );
}
