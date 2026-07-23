import {
  Link as HeadlampLink,
  SectionBox,
  SimpleTable,
} from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { KubeObject } from '@kinvolk/headlamp-plugin/lib/lib/k8s/cluster';
import { Box, Chip, FormControl, InputLabel, MenuItem, Select, Typography } from '@mui/material';
import React, { useMemo, useState } from 'react';
import ResourceListError from '../components/ResourceListError';
import { RouteName } from '../index';
import { SyncSetClass } from '../model';
import { getSyncSetGVKs } from '../resourceData';

const KIND_FILTER_LABEL_ID = 'sync-set-kind-filter-label';
const KIND_FILTER_ID = 'sync-set-kind-filter';

export default function SyncSetList(props: { hideTitle?: boolean }) {
  const [items, setItems] = useState<KubeObject[] | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const handleItems = React.useCallback((nextItems: KubeObject[]) => {
    setError(null);
    setItems(nextItems);
  }, []);

  SyncSetClass.useApiList(handleItems, (err: Error) => setError(err));

  const [kindFilter, setKindFilter] = useState<string>('All');

  const uniqueKinds = useMemo(() => {
    if (!items) return ['All'];
    const kinds = new Set<string>();
    items.forEach(item => {
      getSyncSetGVKs(item).forEach(gvk => {
        if (gvk.kind) kinds.add(gvk.kind);
      });
    });
    return ['All', ...Array.from(kinds).sort()];
  }, [items]);

  const filteredItems = useMemo(() => {
    if (!items) return [];
    if (kindFilter === 'All') return items;
    return items.filter(item => getSyncSetGVKs(item).some(gvk => gvk.kind === kindFilter));
  }, [items, kindFilter]);

  if (error) {
    return (
      <ResourceListError
        error={error}
        resourceName="SyncSet"
        sectionTitle={props.hideTitle ? undefined : 'SyncSet'}
      />
    );
  }

  if (!items) {
    return <Typography>Loading SyncSet...</Typography>;
  }

  return (
    <SectionBox title={props.hideTitle ? undefined : 'SyncSet'}>
      <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel id={KIND_FILTER_LABEL_ID}>Filter by Synced Kind</InputLabel>
          <Select
            id={KIND_FILTER_ID}
            labelId={KIND_FILTER_LABEL_ID}
            value={kindFilter}
            label="Filter by Synced Kind"
            onChange={e => setKindFilter(e.target.value as string)}
          >
            {uniqueKinds.map(kind => (
              <MenuItem key={kind} value={kind}>
                {kind}
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
              <HeadlampLink routeName={RouteName.SyncSet} params={{ name: item.metadata.name }}>
                {item.metadata.name}
              </HeadlampLink>
            ),
          },
          {
            label: 'GVKs Synced',
            getter: item => {
              const gvks = getSyncSetGVKs(item);
              if (gvks.length > 0) {
                return (
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {gvks.map((gvk, i) => {
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
            getter: item => item.metadata.creationTimestamp,
          },
        ]}
      />
    </SectionBox>
  );
}
