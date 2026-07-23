import {
  Link as HeadlampLink,
  SectionBox,
  SimpleTable,
} from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { KubeObject } from '@kinvolk/headlamp-plugin/lib/lib/k8s/cluster';
import { Typography, Box, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import React, { useState, useMemo } from 'react';
import { RoutingPath } from '../index';
import { ConnectionClass } from '../model';

export default function ConnectionList(props: { hideTitle?: boolean }) {
  const [items, setItems] = useState<KubeObject[] | null>(null);
  const [error, setError] = useState<Error | null>(null);

  ConnectionClass.useApiList(setItems, (err: Error) => setError(err));

  const [driverFilter, setDriverFilter] = useState<string>('All');

  const uniqueDrivers = useMemo(() => {
    if (!items) return ['All'];
    const drivers = new Set<string>();
    items.forEach(item => {
      if (item.jsonData?.spec?.driver) {
        drivers.add(item.jsonData?.spec?.driver);
      }
    });
    return ['All', ...Array.from(drivers).sort()];
  }, [items]);

  const filteredItems = useMemo(() => {
    if (!items) return [];
    if (driverFilter === 'All') return items;
    return items.filter(item => item.jsonData?.spec?.driver === driverFilter);
  }, [items, driverFilter]);

  if (error) {
    return (
      <SectionBox title={props.hideTitle ? undefined : "Connection"}>
        <Typography color="textSecondary">
          Error loading Connection. The CustomResourceDefinition may not be installed.
        </Typography>
      </SectionBox>
    );
  }

  if (!items) {
    return <Typography>Loading Connection...</Typography>;
  }

  return (
    <SectionBox title={props.hideTitle ? undefined : "Connection"}>
      
      <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Filter by Driver</InputLabel>
          <Select
            value={driverFilter}
            label="Filter by Driver"
            onChange={(e) => setDriverFilter(e.target.value as string)}
          >
            {uniqueDrivers.map(driver => (
              <MenuItem key={driver} value={driver}>{driver}</MenuItem>
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
                routeName={RoutingPath.Connection}
                params={{ namespace: item.metadata.namespace || '-', name: item.metadata.name }}
              >
                {item.metadata.name}
              </HeadlampLink>
            ),
          },
          {
            label: 'Namespace',
            getter: (item) => item.metadata.namespace || '-',
          },
          {
            label: 'Driver',
            getter: (item) => item.jsonData?.spec?.driver || '-',
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
