import { SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Tabs, Tab, Box } from '@mui/material';
import React, { useState } from 'react';
import ConfigList from './ConfigList';
import SyncSetList from './SyncSetList';

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

function TabPanel(props: any) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function ConfigurationPage() {
  const [value, setValue] = useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <SectionBox title="Configurations">
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={handleChange} aria-label="configuration tabs">
          <Tab label="Config" {...a11yProps(0)} />
          <Tab label="SyncSet" {...a11yProps(1)} />
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
