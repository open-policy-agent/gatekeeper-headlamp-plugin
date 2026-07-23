import { SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Tabs, Tab, Box } from '@mui/material';
import React, { useState } from 'react';
import ConstraintTemplateList from '../constraint-template/List';
import ConstraintList from '../constraint/List';
import ViolationsList from '../violations/List';

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

export default function ConstraintsPage() {
  const [value, setValue] = useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <SectionBox title="Constraints">
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={handleChange} aria-label="policies tabs">
          <Tab label="Constraint Templates" {...a11yProps(0)} />
          <Tab label="Constraints" {...a11yProps(1)} />
          <Tab label="Violations" {...a11yProps(2)} />
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
