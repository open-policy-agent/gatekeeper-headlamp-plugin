import {
  Link as HeadlampLink,
  SectionBox,
  SimpleTable,
} from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { KubeObject } from '@kinvolk/headlamp-plugin/lib/lib/k8s/cluster';
import { Typography, Box, FormControl, InputLabel, Select, MenuItem, Chip } from '@mui/material';
import React, { useState, useMemo } from 'react';
import { RoutingPath } from '../index';
import { AssignMetadataClass } from '../model';

function getTargetKinds(item: any): string[] {
  const kinds = new Set<string>();
  const matchKinds = item.jsonData?.spec?.match?.kinds;
  if (Array.isArray(matchKinds)) {
    matchKinds.forEach((m: any) => {
      if (Array.isArray(m.kinds)) {
        m.kinds.forEach((k: string) => kinds.add(k));
      }
    });
  }
  return Array.from(kinds);
}

export default function AssignMetadataList(props: { hideTitle?: boolean }) {
  const [items, setItems] = useState<KubeObject[] | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [kindFilter, setKindFilter] = useState<string>('All');

  AssignMetadataClass.useApiList(setItems, (err: Error) => setError(err));

  const uniqueKinds = useMemo(() => {
    if (!items) return ['All'];
    const kinds = new Set<string>();
    items.forEach(item => {
      getTargetKinds(item).forEach(k => kinds.add(k));
    });
    return ['All', ...Array.from(kinds).sort()];
  }, [items]);

  const filteredItems = useMemo(() => {
    if (!items) return [];
    if (kindFilter === 'All') return items;
    return items.filter(item => getTargetKinds(item).includes(kindFilter));
  }, [items, kindFilter]);

  if (error) {
    return (
      <SectionBox title={props.hideTitle ? undefined : "AssignMetadata Mutation"}>
        <Typography color="textSecondary">
          Error loading AssignMetadata Mutation. The CustomResourceDefinition may not be installed.
        </Typography>
      </SectionBox>
    );
  }

  if (!items) {
    return <Typography>Loading AssignMetadata Mutation...</Typography>;
  }

  return (
    <SectionBox title={props.hideTitle ? undefined : "AssignMetadata Mutation"}>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
        <FormControl sx={{ minWidth: 200 }} size="small">
          <InputLabel id="kind-filter-label">Target Kind</InputLabel>
          <Select
            labelId="kind-filter-label"
            value={kindFilter}
            label="Target Kind"
            onChange={(e) => setKindFilter(e.target.value as string)}
          >
            {uniqueKinds.map((k) => (
              <MenuItem key={k} value={k}>
                {k}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <SimpleTable
        data={filteredItems}
        columns={[
          {
            label: 'Name',
            getter: (item) => (
              <HeadlampLink
                routeName={RoutingPath.AssignMetadata}
                params={{ name: item.metadata.name }}
              >
                {item.metadata.name}
              </HeadlampLink>
            ),
          },
          {
            label: 'Target Kinds',
            getter: (item) => {
              const kinds = getTargetKinds(item);
              if (kinds.length === 0) return '-';
              return (
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {kinds.map(k => <Chip key={k} label={k} size="small" variant="outlined" />)}
                </Box>
              );
            },
          },
          {
            label: 'Location',
            getter: (item) => item.jsonData?.spec?.location || '-',
          },
          {
            label: 'Assign Value',
            getter: (item) => {
              const val = item.jsonData?.spec?.parameters?.assign?.value;
              return val !== undefined ? JSON.stringify(val) : '-';
            },
          },
          {
            label: 'Age',
            getter: (item) => item.metadata.creationTimestamp,
          },
        ]}
      />
    </SectionBox>
  );
}
