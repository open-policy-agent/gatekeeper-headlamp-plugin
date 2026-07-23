import { SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Box, Tab, Tabs } from '@mui/material';
import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import ConstraintList from '../constraint/List';
import ConstraintTemplateList from '../constraint-template/List';
import ViolationsList from '../violations/List';

const tabIdPrefix = 'gatekeeper-constraints';
const tabRoutes = [
  '/gatekeeper/constraint-templates',
  '/gatekeeper/constraints',
  '/gatekeeper/violations',
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

export default function ConstraintsPage() {
  const history = useHistory();
  const location = useLocation();
  const routeIndex = tabRoutes.findIndex(route => matchesRoute(location.pathname, route));
  const value = routeIndex === -1 ? 1 : routeIndex;

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    history.push(routeWithCurrentPrefix(location.pathname, tabRoutes[newValue]));
  };

  return (
    <SectionBox title="Constraints">
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={handleChange} aria-label="policies tabs">
          <Tab label="Constraint Templates" {...tabA11yProps(0)} />
          <Tab label="Constraints" {...tabA11yProps(1)} />
          <Tab label="Violations" {...tabA11yProps(2)} />
        </Tabs>
      </Box>
      <TabPanel value={value} index={0}>
        <ConstraintTemplateList hideTitle />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <ConstraintList hideTitle />
      </TabPanel>
      <TabPanel value={value} index={2}>
        <ViolationsList hideTitle />
      </TabPanel>
    </SectionBox>
  );
}
