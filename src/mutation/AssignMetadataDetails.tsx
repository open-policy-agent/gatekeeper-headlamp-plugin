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
import { AssignMetadataClass } from '../model';

export default function AssignMetadataDetails() {
  const { name } = useParams<{ name: string }>();
  const { item, error } = useResourceDetails(AssignMetadataClass, name);

  if (error) {
    return <ResourceDetailsError error={error} kind="AssignMetadata" name={name} />;
  }

  if (!item) {
    return <ResourceDetailsLoading kind="AssignMetadata Mutation" />;
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
        {kindsArr.map(k => (
          <Chip key={k} label={k} size="small" variant="outlined" />
        ))}
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
        value:
          data.spec?.parameters?.assign?.value !== undefined
            ? JSON.stringify(data.spec.parameters.assign.value)
            : '-',
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
            AssignMetadata Mutation
          </Typography>
        </Box>
        <ResourceDeleteButton
          resource={item}
          kind="AssignMetadata"
          redirectUrl={RoutingPath.AssignMetadatas}
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

      <GatekeeperResourceStatus resource={data} readinessField="enforced" />
    </Box>
  );
}
