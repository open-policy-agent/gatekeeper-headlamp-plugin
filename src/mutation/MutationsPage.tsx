import { SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Tabs, Tab, Box } from '@mui/material';
import React, { useState } from 'react';
import AssignList from './AssignList';
import AssignMetadataList from './AssignMetadataList';
import AssignImageList from './AssignImageList';
import ModifySetList from './ModifySetList';

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

export default function MutationsPage() {
  const [value, setValue] = useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <SectionBox title="Mutations">
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={handleChange} aria-label="mutations tabs">
          <Tab label="Assign" />
          <Tab label="AssignMetadata" />
          <Tab label="AssignImage" />
          <Tab label="ModifySet" />
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
