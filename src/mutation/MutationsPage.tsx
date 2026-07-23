import { SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Box, Tab, Tabs } from '@mui/material';
import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import AssignImageList from './AssignImageList';
import AssignList from './AssignList';
import AssignMetadataList from './AssignMetadataList';
import ModifySetList from './ModifySetList';

const tabIdPrefix = 'gatekeeper-mutations';
const tabRoutes = [
  {
    path: '/gatekeeper/mutations/assigns',
    aliases: ['/gatekeeper/mutations'],
  },
  {
    path: '/gatekeeper/mutations/assignmetadatas',
    aliases: [],
  },
  {
    path: '/gatekeeper/mutations/assignimages',
    aliases: [],
  },
  {
    path: '/gatekeeper/mutations/modifysets',
    aliases: [],
  },
] as const;

interface TabPanelProps {
  children: React.ReactNode;
  index: number;
  value: number;
}

function normalizePathname(pathname: string) {
  return pathname.replace(/\/+$/, '') || '/';
}

function matchesRoute(pathname: string, route: string) {
  return normalizePathname(pathname).endsWith(route);
}

function routeWithCurrentPrefix(pathname: string, route: string) {
  const routeStart = pathname.lastIndexOf('/gatekeeper/');
  const prefix = routeStart === -1 ? '' : pathname.slice(0, routeStart);
  return `${prefix}${route}`;
}

function tabA11yProps(index: number) {
  return {
    id: `${tabIdPrefix}-tab-${index}`,
    'aria-controls': `${tabIdPrefix}-tabpanel-${index}`,
  };
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`${tabIdPrefix}-tabpanel-${index}`}
      aria-labelledby={`${tabIdPrefix}-tab-${index}`}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function MutationsPage() {
  const history = useHistory();
  const location = useLocation();
  const routeIndex = tabRoutes.findIndex(({ path, aliases }) =>
    [path, ...aliases].some(route => matchesRoute(location.pathname, route))
  );
  const value = routeIndex === -1 ? 0 : routeIndex;

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    history.push(routeWithCurrentPrefix(location.pathname, tabRoutes[newValue].path));
  };

  return (
    <SectionBox title="Mutations">
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={handleChange} aria-label="mutations tabs">
          <Tab label="Assign" {...tabA11yProps(0)} />
          <Tab label="AssignMetadata" {...tabA11yProps(1)} />
          <Tab label="AssignImage" {...tabA11yProps(2)} />
          <Tab label="ModifySet" {...tabA11yProps(3)} />
        </Tabs>
      </Box>
      <TabPanel value={value} index={0}>
        <AssignList hideTitle />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <AssignMetadataList hideTitle />
      </TabPanel>
      <TabPanel value={value} index={2}>
        <AssignImageList hideTitle />
      </TabPanel>
      <TabPanel value={value} index={3}>
        <ModifySetList hideTitle />
      </TabPanel>
    </SectionBox>
  );
}
