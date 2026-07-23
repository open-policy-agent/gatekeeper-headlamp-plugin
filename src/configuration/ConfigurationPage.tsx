import { SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Box, Tab, Tabs } from '@mui/material';
import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import ConfigList from './ConfigList';
import SyncSetList from './SyncSetList';

const tabIdPrefix = 'gatekeeper-configuration';
const tabRoutes = [
  {
    path: '/gatekeeper/configuration/configs',
    aliases: ['/gatekeeper/configuration'],
  },
  {
    path: '/gatekeeper/configuration/syncsets',
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

export default function ConfigurationPage() {
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
    <SectionBox title="Configurations">
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={handleChange} aria-label="configuration tabs">
          <Tab label="Config" {...tabA11yProps(0)} />
          <Tab label="SyncSet" {...tabA11yProps(1)} />
        </Tabs>
      </Box>
      <TabPanel value={value} index={0}>
        <ConfigList hideTitle />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <SyncSetList hideTitle />
      </TabPanel>
    </SectionBox>
  );
}
