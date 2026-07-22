import {
  Link as HeadlampLink,
  SectionBox,
  SimpleTable,
} from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { KubeObject } from '@kinvolk/headlamp-plugin/lib/lib/k8s/cluster';
import { Typography, Box, FormControl, InputLabel, Select, MenuItem, Chip } from '@mui/material';
import React, { useState, useMemo } from 'react';
import { RoutingPath } from '../index';
import { ModifySetClass } from '../model';

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

export default function ModifySetList(props: { hideTitle?: boolean }) {
  const [items, setItems] = useState<KubeObject[] | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [kindFilter, setKindFilter] = useState<string>('All');
  const [operationFilter, setOperationFilter] = useState<string>('All');

  ModifySetClass.useApiList(setItems, (err: Error) => setError(err));

  const uniqueKinds = useMemo(() => {
    if (!items) return ['All'];
    const kinds = new Set<string>();
    items.forEach(item => {
      getTargetKinds(item).forEach(k => kinds.add(k));
    });
    return ['All', ...Array.from(kinds).sort()];
  }, [items]);

  const uniqueOperations = useMemo(() => {
    if (!items) return ['All'];
    const ops = new Set<string>();
    items.forEach(item => {
      const op = item.jsonData?.spec?.parameters?.operation || 'merge';
      ops.add(op);
    });
    return ['All', ...Array.from(ops).sort()];
  }, [items]);

  const filteredItems = useMemo(() => {
    if (!items) return [];
    return items.filter(item => {
      const matchKind = kindFilter === 'All' || getTargetKinds(item).includes(kindFilter);
      const op = item.jsonData?.spec?.parameters?.operation || 'merge';
      const matchOp = operationFilter === 'All' || op === operationFilter;
      return matchKind && matchOp;
    });
  }, [items, kindFilter, operationFilter]);

  if (error) {
    return (
      <SectionBox title={props.hideTitle ? undefined : "ModifySet Mutation"}>
        <Typography color="textSecondary">
          Error loading ModifySet Mutation. The CustomResourceDefinition may not be installed.
        </Typography>
      </SectionBox>
    );
  }

  if (!items) {
    return <Typography>Loading ModifySet Mutation...</Typography>;
  }

  return (
    <SectionBox title={props.hideTitle ? undefined : "ModifySet Mutation"}>
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

        <FormControl sx={{ minWidth: 200 }} size="small">
          <InputLabel id="operation-filter-label">Operation</InputLabel>
          <Select
            labelId="operation-filter-label"
            value={operationFilter}
            label="Operation"
            onChange={(e) => setOperationFilter(e.target.value as string)}
          >
            {uniqueOperations.map((o) => (
              <MenuItem key={o} value={o}>
                {o}
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
                routeName={RoutingPath.ModifySet}
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
            label: 'Operation',
            getter: (item) => item.jsonData?.spec?.parameters?.operation || 'merge',
          },
          {
            label: 'Values',
            getter: (item) => {
              const fromList = item.jsonData?.spec?.parameters?.values?.fromList;
              if (!Array.isArray(fromList)) return '-';
              return fromList.join(', ');
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
