import { SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Box, Chip, Table, TableBody, TableCell, TableRow, Typography } from '@mui/material';
import React from 'react';
import { useParams } from 'react-router-dom';
import { NoPerResourceStatus } from '../components/GatekeeperResourceStatus';
import ResourceDeleteButton from '../components/ResourceDeleteButton';
import {
  ResourceDetailsError,
  ResourceDetailsLoading,
  useResourceDetails,
} from '../components/ResourceDetailsState';
import { RoutingPath } from '../index';
import { SyncSetClass } from '../model';

export default function SyncSetDetails() {
  const { name } = useParams<{ name: string }>();
  const { item, error } = useResourceDetails(SyncSetClass, name);

  if (error) {
    return <ResourceDetailsError error={error} kind="SyncSet" name={name} />;
  }

  if (!item) {
    return <ResourceDetailsLoading kind="SyncSet" />;
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
      value: (
        <Chip
          label={`${gvk.group || 'core'}/${gvk.version} ${gvk.kind}`}
          size="small"
          variant="outlined"
        />
      ),
    }));
  }

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
        <ResourceDeleteButton resource={item} kind="SyncSet" redirectUrl={RoutingPath.SyncSets} />
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

      {getGvksRows().length > 0 && (
        <SectionBox title="Synced GVKs">
          <Table>
            <TableBody>
              {getGvksRows().map(row => (
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

      <NoPerResourceStatus kind="SyncSet" />
    </Box>
  );
}
