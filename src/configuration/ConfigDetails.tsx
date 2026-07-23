import { SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Box, Chip, Table, TableBody, TableCell, TableRow, Typography } from '@mui/material';
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
import { ConfigClass } from '../model';

export default function ConfigDetails() {
  const { namespace, name } = useParams<{ namespace: string; name: string }>();
  const { item, error } = useResourceDetails(ConfigClass, name, namespace || 'gatekeeper-system');

  if (error) {
    return <ResourceDetailsError error={error} kind="Config" name={name} />;
  }

  if (!item) {
    return <ResourceDetailsLoading kind="Config" />;
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
      value: (
        <Chip
          label={`${s.group || 'core'}/${s.version} ${s.kind}`}
          size="small"
          variant="outlined"
        />
      ),
    }));
  }

  function getMatchRows() {
    const matches = data.spec?.match;
    if (!Array.isArray(matches)) return [];
    return matches.map((m: any, i: number) => ({
      name: `Match Config ${i + 1}`,
      value: JSON.stringify(m),
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
            Config
          </Typography>
        </Box>
        <ResourceDeleteButton resource={item} kind="Config" redirectUrl={RoutingPath.Configs} />
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

      {getSyncOnlyRows().length > 0 && (
        <SectionBox title="Sync Resources (syncOnly)">
          <Table>
            <TableBody>
              {getSyncOnlyRows().map(row => (
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
              {getMatchRows().map(row => (
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

      <GatekeeperResourceStatus resource={data} />
    </Box>
  );
}
