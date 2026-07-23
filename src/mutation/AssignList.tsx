import {
  Link as HeadlampLink,
  SectionBox,
  SimpleTable,
} from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { KubeObject } from '@kinvolk/headlamp-plugin/lib/lib/k8s/cluster';
import { Box, Chip, FormControl, InputLabel, MenuItem, Select, Typography } from '@mui/material';
import React, { useMemo, useState } from 'react';
import ResourceListError from '../components/ResourceListError';
import { RoutingPath } from '../index';
import { AssignClass } from '../model';

function getTargetKinds(item: any): string[] {
  const kinds = new Set<string>();
  const applyTo = item.jsonData?.spec?.applyTo;
  if (Array.isArray(applyTo)) {
    applyTo.forEach((a: any) => {
      if (Array.isArray(a.kinds)) {
        a.kinds.forEach((k: string) => kinds.add(k));
      }
    });
  }
  return Array.from(kinds);
}

export default function AssignList(props: { hideTitle?: boolean }) {
  const [items, setItems] = useState<KubeObject[] | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [kindFilter, setKindFilter] = useState<string>('All');

  AssignClass.useApiList(setItems, (err: Error) => setError(err));

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
      <ResourceListError
        error={error}
        resourceName="Assign mutations"
        sectionTitle={props.hideTitle ? undefined : 'Assign Mutation'}
      />
    );
  }

  if (!items) {
    return <Typography>Loading Assign Mutation...</Typography>;
  }

  return (
    <SectionBox title={props.hideTitle ? undefined : 'Assign Mutation'}>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
        <FormControl sx={{ minWidth: 200 }} size="small">
          <InputLabel id="kind-filter-label">Target Kind</InputLabel>
          <Select
            labelId="kind-filter-label"
            value={kindFilter}
            label="Target Kind"
            onChange={e => setKindFilter(e.target.value as string)}
          >
            {uniqueKinds.map(k => (
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
            getter: item => (
              <HeadlampLink routeName={RoutingPath.Assign} params={{ name: item.metadata.name }}>
                {item.metadata.name}
              </HeadlampLink>
            ),
          },
          {
            label: 'Target Kinds',
            getter: item => {
              const kinds = getTargetKinds(item);
              if (kinds.length === 0) return '-';
              return (
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {kinds.map(k => (
                    <Chip key={k} label={k} size="small" variant="outlined" />
                  ))}
                </Box>
              );
            },
          },
          {
            label: 'Location',
            getter: item => item.jsonData?.spec?.location || '-',
          },
          {
            label: 'Assign Value',
            getter: item => {
              const val = item.jsonData?.spec?.parameters?.assign?.value;
              return val !== undefined ? JSON.stringify(val) : '-';
            },
          },
          {
            label: 'Age',
            getter: item => item.metadata.creationTimestamp,
          },
        ]}
      />
    </SectionBox>
  );
}
