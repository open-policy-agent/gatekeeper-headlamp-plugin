import React, { useEffect, useState } from 'react';
import { SectionBox, SimpleTable, Link, Loader } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Typography, Select, MenuItem, FormControl, InputLabel, Box, TextField, Button, Alert, AlertTitle } from '@mui/material';
import yaml from 'js-yaml'; // Import js-yaml

// Define a type for the structure of a library item (template)
interface LibraryTemplate {
  name: string;
  description: string;
  category: string;
  sourceUrl: string; // URL to the YAML file in the GitHub repo
  id: string; // Unique ID for routing, e.g., "general-k8srequiredlabels"
  // Store the raw YAML content for later use in TemplateDetails
  rawYAML?: string;
}

const GITHUB_OWNER = 'open-policy-agent';
const GITHUB_REPO = 'gatekeeper-library';
const GITHUB_BRANCH = 'master'; // The Gatekeeper Library uses 'master'
const LIBRARY_BASE_PATH = 'library';

// Helper to generate a fallback name if metadata.name is not found in YAML
function generateFallbackName(dirName: string): string {
  // Simple capitalize, e.g., "k8srequiredlabels" -> "K8srequiredlabels"
  // More sophisticated formatting can be added if needed.
  if (dirName.startsWith('k8s')) {
    return 'K8s' + dirName.charAt(3).toUpperCase() + dirName.slice(4);
  }
  if (dirName.startsWith('psp')) {
    return 'PSP' + dirName.charAt(3).toUpperCase() + dirName.slice(4);
  }
  return dirName.charAt(0).toUpperCase() + dirName.slice(1);
}

// Fetches directory contents or file metadata from GitHub API
async function fetchGitHubAPI(path: string, token: string = ''): Promise<any> {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}?ref=${GITHUB_BRANCH}`;
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
  };
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }
  const response = await fetch(url, {
    headers,
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `GitHub API request failed for path "${path}": ${response.status} ${response.statusText}. Body: ${errorBody}`
    );
  }
  return response.json();
}

// Fetches raw file content
async function fetchFileContent(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch file content from ${url}: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

const fetchLibraryTemplates = async (token: string = ''): Promise<LibraryTemplate[]> => {
  console.log('[LibraryList] Starting to fetch library templates from GitHub...');
  const collectedTemplates: LibraryTemplate[] = [];

  let categoriesDirs: any[];
  try {
    // 1. Fetch categories (subdirectories under LIBRARY_BASE_PATH)
    categoriesDirs = await fetchGitHubAPI(LIBRARY_BASE_PATH, token);
    if (!Array.isArray(categoriesDirs)) {
      console.error('[LibraryList] Expected an array for categories, got:', categoriesDirs);
      throw new Error('Invalid response when fetching library categories.');
    }
  } catch (error) {
    console.error('[LibraryList] Failed to fetch library categories:', error);
    throw error; // Re-throw to be caught by the caller
  }

  const categoryProcessingPromises = categoriesDirs
    .filter(item => item.type === 'dir')
    .map(async categoryDir => {
      const categoryName = categoryDir.name;
      console.log(`[LibraryList] Processing category: ${categoryName}`);
      let templateDirs: any[];
      // 2. Fetch template directories
        templateDirs = await fetchGitHubAPI(categoryDir.path, token);
        if (!Array.isArray(templateDirs)) {
          console.error(`[LibraryList] Expected an array for templates in category ${categoryName}, got:`, templateDirs);
          return; // Skip this category
        }

      const templateDetailPromises = templateDirs
        .filter(item => item.type === 'dir') // These are the actual template directories
        .map(async templateDir => {
          const templateDirName = templateDir.name; // e.g., "k8srequiredlabels"
          // ID format: "categoryName-templateDirName"
          const id = `${categoryName}-${templateDirName}`;
          // Raw URL to the template.yaml file
          const sourceUrl = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${LIBRARY_BASE_PATH}/${categoryName}/${templateDirName}/template.yaml`;

          let name = generateFallbackName(templateDirName); // Fallback name
          let description = 'No description available.';
          let rawYAML = '';

          try {
            // 3. Fetch and parse the template.yaml to get its actual name and description
            const yamlContent = await fetchFileContent(sourceUrl);
            rawYAML = yamlContent;
            // Use js-yaml to parse
            const parsedDocs = yaml.loadAll(yamlContent) as any[]; // loadAll for multi-document YAML
            if (parsedDocs && parsedDocs.length > 0) {
              const templateKubeObj = parsedDocs[0]; // Assuming ConstraintTemplate is the first doc
              if (templateKubeObj?.metadata?.name) {
                name = templateKubeObj.metadata.name; // Use name from YAML
              }
              description =
                templateKubeObj?.metadata?.annotations?.['description'] || description;
            }
          } catch (yamlError: any) {
            console.warn(
              `[LibraryList] Could not fetch or parse YAML for ${templateDirName} from ${sourceUrl}: ${yamlError.message}`
            );
            // Keep fallback name and default description
          }

          collectedTemplates.push({
            id,
            name,
            description,
            category: categoryName,
            sourceUrl,
            rawYAML, // Store the raw YAML
          });
        });
      // Process all templates within this category
      await Promise.allSettled(templateDetailPromises);
    });

  // Process all categories
  await Promise.all(categoryProcessingPromises);

  console.log(`[LibraryList] Finished fetching templates. Total found: ${collectedTemplates.length}`);
  // Sort templates by name for consistent display
  collectedTemplates.sort((a, b) => a.name.localeCompare(b.name));
  return collectedTemplates;
};

function LibraryList() {
  const [templates, setTemplates] = useState<LibraryTemplate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>(''); // '' for All Categories
  const [githubToken, setGithubToken] = useState<string>('');
  const [isOffline, setIsOffline] = useState<boolean>(false);

  const handleSaveToken = () => {
    
    loadData();
  };

  const loadData = () => {
    setLoading(true);
    setError(null);
    setIsOffline(false);
    fetchLibraryTemplates(githubToken)
      .then(data => {
        setTemplates(data);
        setLoading(false);
      })
      .catch(err => {
        const msg = err.message || '';
        if (msg.includes('rate limit exceeded') || msg.includes('403')) {
          setError(`GitHub API rate limit exceeded. Please provide a GitHub token to authenticate your requests and increase your limit.`);
        } else if (msg.includes('fetch') || msg.includes('network') || msg.includes('Failed to fetch')) {
          setIsOffline(true);
          setError(`Network error: Unable to reach GitHub. You might be in an air-gapped environment or offline.`);
        } else {
          setError(`Failed to load library templates: ${msg}`);
        }
        setTemplates([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const categories = Array.from(new Set(templates.map(t => t.category))).sort();

  const handleCategoryChange = (event: any) => {
    setSelectedCategory(event.target.value as string);
  };

  const filteredTemplates = selectedCategory
    ? templates.filter(t => t.category === selectedCategory)
    : templates;

  if (loading) {
    return (
      <SectionBox title="Gatekeeper Library">
        <Loader title="Loading Gatekeeper Library..." />
      </SectionBox>
    );
  }

  if (error) {
    return (
      <SectionBox title="Policy Library">
        <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            label="GitHub Personal Access Token"
            variant="outlined"
            size="small"
            type="password"
            value={githubToken}
            onChange={(e) => setGithubToken(e.target.value)}
            sx={{ minWidth: 300 }}
          />
          <Button variant="contained" onClick={handleSaveToken}>
            Save & Retry
          </Button>
        </Box>
        
        {isOffline ? (
          <Alert severity="warning">
            <AlertTitle>Network Offline or Air-gapped Environment</AlertTitle>
            {error}
            <br />
            The Policy Library relies on fetching external data from the open-policy-agent GitHub repository.
          </Alert>
        ) : (
          <Alert severity="error">
            <AlertTitle>Error Loading Library</AlertTitle>
            {error}
          </Alert>
        )}
      </SectionBox>
    );
  }

  if (templates.length === 0) {
    return (
      <SectionBox title="Gatekeeper Library">
        <Typography>No templates found in the library, or failed to load all of them.</Typography>
      </SectionBox>
    );
  }

  return (
    <SectionBox title="Gatekeeper Library">
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
            getter: item => {
              return (
                <Link
                  routeName="Library Template Details"
                  params={{ id: item.id }}
                  state={{ template: item }} // Pass the full template object
                >
                  {item.name}
                </Link>
              );
            },
          },
          {
            label: 'Category',
            getter: item => item.category,
          },
          {
            label: 'Description',
            getter: item => item.description,
          },
          // Remove the Source column
          // {
          //   label: 'Source',
          //   getter: item => (
          //     <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">
          //       View on GitHub
          //     </a>
          //   ),
          // },
        ]}
        // You might want to add a custom emptyListComponent if templates array is empty
        // emptyListComponent={() => <Typography>No templates found.</Typography>}
      />
    </SectionBox>
  );
}

export default LibraryList;
