import {
  Link,
  Loader,
  SectionBox,
  SimpleTable,
} from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import {
  Alert,
  AlertTitle,
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import React, { useCallback, useEffect, useState } from 'react';
import GitHubRequestControls from './GitHubRequestControls';
import {
  fetchLibraryTemplates,
  getCanonicalTemplateRouteParams,
  getErrorMessage,
  isOfflineError,
  LibraryLoadFailure,
  LibraryTemplate,
} from './libraryData';

function FailureSummary({
  failures,
  hasTemplates,
}: {
  failures: LibraryLoadFailure[];
  hasTemplates: boolean;
}) {
  const visibleFailures = failures.slice(0, 5);
  const hiddenFailureCount = failures.length - visibleFailures.length;

  return (
    <Alert severity={hasTemplates ? 'warning' : 'error'} sx={{ mb: 2 }}>
      <AlertTitle>
        {hasTemplates ? 'Policy Library Loaded Partially' : 'Policy Library Could Not Be Loaded'}
      </AlertTitle>
      <Typography variant="body2">
        {hasTemplates
          ? `${failures.length} category or template could not be loaded. Only templates with fetched, valid YAML are listed below.`
          : 'No deployable templates were loaded because category or template requests failed.'}
      </Typography>
      <Box component="ul" sx={{ mt: 1, mb: hiddenFailureCount > 0 ? 1 : 0, pl: 3 }}>
        {visibleFailures.map(failure => {
          const location = failure.templateName
            ? `${failure.category}/${failure.templateName}`
            : failure.category;
          return (
            <li key={`${failure.scope}-${location}-${failure.message}`}>
              <Typography variant="body2">
                <strong>{location}</strong>: {failure.message}
              </Typography>
            </li>
          );
        })}
      </Box>
      {hiddenFailureCount > 0 && (
        <Typography variant="body2">
          …and {hiddenFailureCount} more failure{hiddenFailureCount === 1 ? '' : 's'}.
        </Typography>
      )}
    </Alert>
  );
}

function LibraryList() {
  const [templates, setTemplates] = useState<LibraryTemplate[]>([]);
  const [failures, setFailures] = useState<LibraryLoadFailure[]>([]);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setFailures([]);

    try {
      const result = await fetchLibraryTemplates();
      setTemplates(result.templates);
      setFailures(result.failures);
    } catch (error) {
      setTemplates([]);
      setLoadError(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const categories = Array.from(new Set(templates.map(template => template.category))).sort();
  const filteredTemplates = selectedCategory
    ? templates.filter(template => template.category === selectedCategory)
    : templates;

  const handleCategoryChange = (event: SelectChangeEvent<string>) => {
    setSelectedCategory(event.target.value);
  };

  if (loading) {
    return (
      <SectionBox title="Gatekeeper Library">
        <Loader title="Loading Gatekeeper Library..." />
      </SectionBox>
    );
  }

  if (loadError) {
    const offline = isOfflineError(loadError);
    return (
      <SectionBox title="Policy Library">
        <Alert severity={offline ? 'warning' : 'error'} sx={{ mb: 3 }}>
          <AlertTitle>
            {offline ? 'Network Offline or Air-gapped Environment' : 'Error Loading Library'}
          </AlertTitle>
          {offline
            ? 'Unable to reach GitHub. The Policy Library relies on external data from the open-policy-agent GitHub repository.'
            : `Failed to load library templates: ${getErrorMessage(loadError)}`}
        </Alert>
        <GitHubRequestControls onRetry={loadData} />
      </SectionBox>
    );
  }

  if (templates.length === 0 && failures.length === 0) {
    return (
      <SectionBox title="Gatekeeper Library">
        <Typography>No templates were found in the library.</Typography>
      </SectionBox>
    );
  }

  return (
    <SectionBox title="Gatekeeper Library">
      {failures.length > 0 && (
        <>
          <FailureSummary failures={failures} hasTemplates={templates.length > 0} />
          <Box sx={{ mb: 3 }}>
            <GitHubRequestControls onRetry={loadData} />
          </Box>
        </>
      )}

      {templates.length > 0 && (
        <>
          <Box mb={2}>
            <FormControl fullWidth sx={{ maxWidth: 300 }}>
              <InputLabel id="category-filter-label">Filter by Category</InputLabel>
              <Select
                labelId="category-filter-label"
                id="category-filter-select"
                value={selectedCategory}
                label="Filter by Category"
                onChange={handleCategoryChange}
              >
                <MenuItem value="">
                  <em>All Categories</em>
                </MenuItem>
                {categories.map(category => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <SimpleTable
            data={filteredTemplates}
            columns={[
              {
                label: 'Name',
                getter: item => (
                  <Link
                    routeName="Library Template Details"
                    params={getCanonicalTemplateRouteParams(item)}
                    state={{ template: item }}
                  >
                    {item.name}
                  </Link>
                ),
              },
              {
                label: 'Category',
                getter: item => item.category,
              },
              {
                label: 'Description',
                getter: item => item.description,
              },
            ]}
          />
        </>
      )}
    </SectionBox>
  );
}

export default LibraryList;
