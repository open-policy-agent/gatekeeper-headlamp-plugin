import { SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Box, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import React from 'react';
import { useParams } from 'react-router-dom';
import ResourceDeleteButton from '../components/ResourceDeleteButton';
import {
  ResourceDetailsError,
  ResourceDetailsLoading,
  useResourceDetails,
} from '../components/ResourceDetailsState';
import { RoutingPath } from '../index';
import { ConstraintTemplateClass } from '../model';
import { ConstraintTemplate } from '../types';

export default function ConstraintTemplateDetails() {
  const { name } = useParams<{ name: string }>();
  const { item, error } = useResourceDetails(ConstraintTemplateClass, name);

  if (error) {
    return <ResourceDetailsError error={error} kind="ConstraintTemplate" name={name} />;
  }

  if (!item) {
    return <ResourceDetailsLoading kind="ConstraintTemplate" />;
  }

  const constraintTemplate = item.jsonData as ConstraintTemplate;
  const mainInfoRows = [
    { name: 'Name', value: constraintTemplate.metadata.name },
    { name: 'Created', value: constraintTemplate.metadata.creationTimestamp },
    { name: 'Kind', value: constraintTemplate.spec?.crd?.spec?.names?.kind || '' },
    { name: 'Plural', value: constraintTemplate.spec?.crd?.spec?.names?.plural || '' },
    { name: 'Status', value: constraintTemplate.status?.created ? 'Ready' : 'Not Ready' },
  ];
  const targetRows =
    constraintTemplate.spec?.targets?.map(target => ({
      target: target.target,
      hasRego: target.rego ? 'Yes' : 'No',
      hasLibs: target.libs && target.libs.length > 0 ? 'Yes' : 'No',
    })) ?? [];

  return (
    <Box sx={{ pt: 2, pb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            {constraintTemplate.metadata.name}
          </Typography>
          <Typography variant="subtitle1" color="textSecondary" gutterBottom>
            Constraint Template
          </Typography>
        </Box>
        <ResourceDeleteButton
          resource={item}
          kind="ConstraintTemplate"
          redirectUrl={RoutingPath.ConstraintTemplates}
        />
      </Box>

      <SectionBox title="Overview">
        <Table>
          <TableBody>
            {mainInfoRows.map(row => (
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

      <SectionBox title="Targets">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Target</TableCell>
              <TableCell>Has Rego</TableCell>
              <TableCell>Has Libs</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {targetRows.map(row => (
              <TableRow key={row.target}>
                <TableCell>{row.target}</TableCell>
                <TableCell>{row.hasRego}</TableCell>
                <TableCell>{row.hasLibs}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionBox>
    </Box>
  );
}
