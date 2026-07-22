import {
  Link as HeadlampLink,
  SectionBox,
  SimpleTable,
} from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { KubeObject } from '@kinvolk/headlamp-plugin/lib/lib/k8s/cluster';
import { Typography, Box, Chip, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import React, { useState, useMemo } from 'react';
import { RoutingPath } from '../index';
import { SyncSetClass } from '../model';

export default function SyncSetList(props: { hideTitle?: boolean }) {
  const [items, setItems] = useState<KubeObject[] | null>(null);
  const [error, setError] = useState<Error | null>(null);

  SyncSetClass.useApiList(setItems, (err: Error) => setError(err));

  const [kindFilter, setKindFilter] = useState<string>('All');

  const uniqueKinds = useMemo(() => {
    if (!items) return ['All'];
    const kinds = new Set<string>();
    items.forEach(item => {
      const syncOnly = item.spec?.syncOnly || [];
      syncOnly.forEach((s: any) => {
         if (s.kind) kinds.add(s.kind);
      });
    });
    return ['All', ...Array.from(kinds).sort()];
  }, [items]);

  const filteredItems = useMemo(() => {
    if (!items) return [];
    if (kindFilter === 'All') return items;
    return items.filter(item => {
      const syncOnly = item.spec?.syncOnly || [];
      return syncOnly.some((s: any) => s.kind === kindFilter);
    });
  }, [items, kindFilter]);

  if (error) {
    return (
      <SectionBox title={props.hideTitle ? undefined : "SyncSet"}>
        <Typography color="textSecondary">
          Error loading SyncSet. The CustomResourceDefinition may not be installed.
        </Typography>
      </SectionBox>
    );
  }

  if (!items) {
    return <Typography>Loading SyncSet...</Typography>;
  }

  return (
    <SectionBox title={props.hideTitle ? undefined : "SyncSet"}>
      
      <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Filter by Synced Kind</InputLabel>
          <Select
            value={kindFilter}
            label="Filter by Synced Kind"
            onChange={(e) => setKindFilter(e.target.value as string)}
          >
            {uniqueKinds.map(kind => (
              <MenuItem key={kind} value={kind}>{kind}</MenuItem>
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
                routeName={RoutingPath.SyncSet}
                params={{ name: item.metadata.name }}
              >
                {item.metadata.name}
              </HeadlampLink>
            ),
          },
          {
            label: 'GVKs Synced',
            getter: (item) => {
              const gvks = item.jsonData?.spec?.gvks;
              if (Array.isArray(gvks)) {
                 return (
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {gvks.map((gvk: any, i: number) => {
                        const label = `${gvk.group || 'core'}/${gvk.version} ${gvk.kind}`;
                        return <Chip key={i} label={label} size="small" variant="outlined" />;
                      })}
                    </Box>
                 );
              }
              return '-';
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
