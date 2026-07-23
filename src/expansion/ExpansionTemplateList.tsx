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
import { ExpansionTemplateClass } from '../model';

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

export default function ExpansionTemplateList(props: { hideTitle?: boolean }) {
  const [items, setItems] = useState<KubeObject[] | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [kindFilter, setKindFilter] = useState<string>('All');
  const [generatedKindFilter, setGeneratedKindFilter] = useState<string>('All');

  const handleItems = React.useCallback((nextItems: KubeObject[]) => {
    setError(null);
    setItems(nextItems);
  }, []);

  ExpansionTemplateClass.useApiList(handleItems, (err: Error) => setError(err));

  const uniqueKinds = useMemo(() => {
    if (!items) return ['All'];
    const kinds = new Set<string>();
    items.forEach(item => {
      getTargetKinds(item).forEach(k => kinds.add(k));
    });
    return ['All', ...Array.from(kinds).sort()];
  }, [items]);

  const uniqueGeneratedKinds = useMemo(() => {
    if (!items) return ['All'];
    const kinds = new Set<string>();
    items.forEach(item => {
      const gvk = item.jsonData?.spec?.generatedGVK?.kind;
      if (gvk) kinds.add(gvk);
    });
    return ['All', ...Array.from(kinds).sort()];
  }, [items]);

  const filteredItems = useMemo(() => {
    if (!items) return [];
    return items.filter(item => {
      const matchKind = kindFilter === 'All' || getTargetKinds(item).includes(kindFilter);
      const gvk = item.jsonData?.spec?.generatedGVK?.kind;
      const matchGenerated = generatedKindFilter === 'All' || gvk === generatedKindFilter;
      return matchKind && matchGenerated;
    });
  }, [items, kindFilter, generatedKindFilter]);

  if (error) {
    return (
      <ResourceListError
        error={error}
        resourceName="Expansion Templates"
        sectionTitle={props.hideTitle ? undefined : 'Expansion Templates'}
      />
    );
  }

  if (!items) {
    return <Typography>Loading Expansion Template...</Typography>;
  }

  return (
    <SectionBox title={props.hideTitle ? undefined : 'Expansion Templates'}>
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

        <FormControl sx={{ minWidth: 200 }} size="small">
          <InputLabel id="generated-kind-filter-label">Generated Kind</InputLabel>
          <Select
            labelId="generated-kind-filter-label"
            value={generatedKindFilter}
            label="Generated Kind"
            onChange={e => setGeneratedKindFilter(e.target.value as string)}
          >
            {uniqueGeneratedKinds.map(k => (
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
              <HeadlampLink
                routeName={RoutingPath.ExpansionTemplate}
                params={{ name: item.metadata.name }}
              >
                {item.metadata.name}
              </HeadlampLink>
            ),
          },
          {
            label: 'Target Kinds (applyTo)',
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
            label: 'Generated GVK',
            getter: item => {
              const gvk = item.jsonData?.spec?.generatedGVK;
              if (gvk) {
                const label = `${gvk.group || 'core'}/${gvk.version} ${gvk.kind}`;
                return <Chip label={label} size="small" color="primary" variant="outlined" />;
              }
              return '-';
            },
          },
          {
            label: 'Source',
            getter: item => item.jsonData?.spec?.templateSource || '-',
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
