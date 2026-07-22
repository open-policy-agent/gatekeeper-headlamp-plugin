import { SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Tabs, Tab, Box } from '@mui/material';
import React, { useState } from 'react';
import ProviderList from './ProviderList';
import ConnectionList from './ConnectionList';

function TabPanel(props: any) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
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

export default function ExternalDataPage() {
  const [value, setValue] = useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <SectionBox title="External Data">
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={handleChange} aria-label="external data tabs">
          <Tab label="Provider" />
          <Tab label="Connection" />
        </Tabs>
      </Box>
      <TabPanel value={value} index={0}>
        <ProviderList hideTitle />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <ConnectionList hideTitle />
      </TabPanel>
    </SectionBox>
  );
}
