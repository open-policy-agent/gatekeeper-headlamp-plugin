import {
  Link as HeadlampLink,
  SectionBox,
  SimpleTable,
} from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { KubeObject } from '@kinvolk/headlamp-plugin/lib/lib/k8s/cluster';
import { Chip, Typography } from '@mui/material';
import React, { useState } from 'react';
import ResourceListError from '../components/ResourceListError';
import { RoutingPath } from '../index';
import { ProviderClass } from '../model';

export default function ProviderList(props: { hideTitle?: boolean }) {
  const [items, setItems] = useState<KubeObject[] | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const handleItems = React.useCallback((nextItems: KubeObject[]) => {
    setError(null);
    setItems(nextItems);
  }, []);

  ProviderClass.useApiList(handleItems, (err: Error) => setError(err));

  if (error) {
    return (
      <ResourceListError
        error={error}
        resourceName="Provider"
        sectionTitle={props.hideTitle ? undefined : 'Provider'}
      />
    );
  }

  if (!items) {
    return <Typography>Loading Provider...</Typography>;
  }

  return (
    <SectionBox title={props.hideTitle ? undefined : 'Provider'}>
      <SimpleTable
        data={items}
        columns={[
          {
            label: 'Name',
            getter: item => (
              <HeadlampLink routeName={RoutingPath.Provider} params={{ name: item.metadata.name }}>
                {item.metadata.name}
              </HeadlampLink>
            ),
          },
          {
            label: 'URL',
            getter: item => item.jsonData?.spec?.url || '-',
          },
          {
            label: 'Timeout',
            getter: item => {
              const timeout = item.jsonData?.spec?.timeout;
              return timeout ? <Chip label={`${timeout}s`} size="small" variant="outlined" /> : '-';
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
