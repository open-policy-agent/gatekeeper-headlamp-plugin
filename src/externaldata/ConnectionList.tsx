import {
  Link as HeadlampLink,
  SectionBox,
  SimpleTable,
} from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { KubeObject } from '@kinvolk/headlamp-plugin/lib/lib/k8s/cluster';
import { Box, FormControl, InputLabel, MenuItem, Select, Typography } from '@mui/material';
import React, { useMemo, useState } from 'react';
import ResourceListError from '../components/ResourceListError';
import { RouteName } from '../index';
import { ConnectionClass } from '../model';
import { getConnectionDriver } from '../resourceData';

const DRIVER_FILTER_LABEL_ID = 'connection-driver-filter-label';
const DRIVER_FILTER_ID = 'connection-driver-filter';

export default function ConnectionList(props: { hideTitle?: boolean }) {
  const [items, setItems] = useState<KubeObject[] | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const handleItems = React.useCallback((nextItems: KubeObject[]) => {
    setError(null);
    setItems(nextItems);
  }, []);

  ConnectionClass.useApiList(handleItems, (err: Error) => setError(err));

  const [driverFilter, setDriverFilter] = useState<string>('All');

  const uniqueDrivers = useMemo(() => {
    if (!items) return ['All'];
    const drivers = new Set<string>();
    items.forEach(item => {
      const driver = getConnectionDriver(item);
      if (driver) drivers.add(driver);
    });
    return ['All', ...Array.from(drivers).sort()];
  }, [items]);

  const filteredItems = useMemo(() => {
    if (!items) return [];
    if (driverFilter === 'All') return items;
    return items.filter(item => getConnectionDriver(item) === driverFilter);
  }, [items, driverFilter]);

  if (error) {
    return (
      <ResourceListError
        error={error}
        resourceName="Connection"
        sectionTitle={props.hideTitle ? undefined : 'Connection'}
      />
    );
  }

  if (!items) {
    return <Typography>Loading Connection...</Typography>;
  }

  return (
    <SectionBox title={props.hideTitle ? undefined : 'Connection'}>
      <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel id={DRIVER_FILTER_LABEL_ID}>Filter by Driver</InputLabel>
          <Select
            id={DRIVER_FILTER_ID}
            labelId={DRIVER_FILTER_LABEL_ID}
            value={driverFilter}
            label="Filter by Driver"
            onChange={e => setDriverFilter(e.target.value as string)}
          >
            {uniqueDrivers.map(driver => (
              <MenuItem key={driver} value={driver}>
                {driver}
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
                routeName={RouteName.Connection}
                params={{ namespace: item.metadata.namespace || '-', name: item.metadata.name }}
              >
                {item.metadata.name}
              </HeadlampLink>
            ),
          },
          {
            label: 'Namespace',
            getter: item => item.metadata.namespace || '-',
          },
          {
            label: 'Driver',
            getter: item => getConnectionDriver(item) || '-',
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
