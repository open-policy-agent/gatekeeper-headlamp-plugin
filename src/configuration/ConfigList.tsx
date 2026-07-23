import {
  Link as HeadlampLink,
  SectionBox,
  SimpleTable,
} from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { KubeObject } from '@kinvolk/headlamp-plugin/lib/lib/k8s/cluster';
import { Box, Chip, Typography } from '@mui/material';
import React, { useState } from 'react';
import ResourceListError from '../components/ResourceListError';
import { RoutingPath } from '../index';
import { ConfigClass } from '../model';

export default function ConfigList(props: { hideTitle?: boolean }) {
  const [items, setItems] = useState<KubeObject[] | null>(null);
  const [error, setError] = useState<Error | null>(null);

  ConfigClass.useApiList(setItems, (err: Error) => setError(err));

  if (error) {
    return (
      <ResourceListError
        error={error}
        resourceName="Config"
        sectionTitle={props.hideTitle ? undefined : 'Config'}
      />
    );
  }

  if (!items) {
    return <Typography>Loading Config...</Typography>;
  }

  return (
    <SectionBox title={props.hideTitle ? undefined : 'Config'}>
      <SimpleTable
        data={items}
        columns={[
          {
            label: 'Name',
            getter: item => (
              <HeadlampLink
                routeName={RoutingPath.Config}
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
            label: 'Sync Resources Configured',
            getter: item => {
              const syncOnly = item.jsonData?.spec?.sync?.syncOnly;
              if (Array.isArray(syncOnly)) {
                return (
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    <Chip
                      label={`${syncOnly.length} resource types`}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                );
              }
              return '0';
            },
          },
          {
            label: 'Matches Configured',
            getter: item => {
              const match = item.jsonData?.spec?.match;
              if (Array.isArray(match)) {
                return match.length.toString();
              }
              return '0';
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
