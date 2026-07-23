import { SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Box, Chip, Paper, Table, TableBody, TableCell, TableRow, Typography } from '@mui/material';
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
import { ExpansionTemplateClass } from '../model';

export default function ExpansionTemplateDetails() {
  const { name } = useParams<{ name: string }>();
  const { item, error } = useResourceDetails(ExpansionTemplateClass, name);

  if (error) {
    return <ResourceDetailsError error={error} kind="ExpansionTemplate" name={name} />;
  }

  if (!item) {
    return <ResourceDetailsLoading kind="Expansion Template" />;
  }

  const data = item.jsonData as any;

  function getTargetKinds(item: any) {
    const kinds = new Set<string>();
    const applyTo = item?.spec?.applyTo;
    if (Array.isArray(applyTo)) {
      applyTo.forEach((a: any) => {
        if (Array.isArray(a.kinds)) {
          a.kinds.forEach((k: string) => kinds.add(k));
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
        value: data.kind || 'ExpansionTemplate',
      },
      {
        name: 'Target Kinds (applyTo)',
        value: getTargetKinds(data),
      },
      {
        name: 'Generated GVK',
        value: data.spec?.generatedGVK ? (
          <Chip
            label={`${data.spec.generatedGVK.group || 'core'}/${data.spec.generatedGVK.version} ${
              data.spec.generatedGVK.kind
            }`}
            size="small"
            color="primary"
            variant="outlined"
          />
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
            Expansion Template
          </Typography>
        </Box>
        <ResourceDeleteButton
          resource={item}
          kind="ExpansionTemplate"
          redirectUrl={RoutingPath.ExpansionTemplates}
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

      {data.spec?.templateSource && (
        <SectionBox title="Template Source (Rego)">
          <Paper elevation={1} sx={{ p: 2, bgcolor: '#f5f5f5', overflowX: 'auto' }}>
            <Box component="pre" sx={{ margin: 0, fontFamily: 'monospace', fontSize: '0.875rem' }}>
              {data.spec.templateSource}
            </Box>
          </Paper>
        </SectionBox>
      )}

      <GatekeeperResourceStatus resource={data} />
    </Box>
  );
}
