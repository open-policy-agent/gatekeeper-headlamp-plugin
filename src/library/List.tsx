import React, { useEffect, useState } from 'react';
import { SectionBox, SimpleTable, Link, Loader } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Typography, Select, MenuItem, FormControl, InputLabel, Box } from '@mui/material';
import { useTranslation } from 'react-i18next';
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
async function fetchGitHubAPI(path: string): Promise<any> {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}?ref=${GITHUB_BRANCH}`;
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github.v3+json',
    },
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

const fetchLibraryTemplates = async (): Promise<LibraryTemplate[]> => {
  console.log('[LibraryList] Starting to fetch library templates from GitHub...');
  const collectedTemplates: LibraryTemplate[] = [];

  let categoriesDirs: any[];
  try {
    // 1. Fetch categories (subdirectories under LIBRARY_BASE_PATH)
    categoriesDirs = await fetchGitHubAPI(LIBRARY_BASE_PATH);
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
      try {
        // 2. Fetch template directories within this category
        templateDirs = await fetchGitHubAPI(categoryDir.path);
        if (!Array.isArray(templateDirs)) {
          console.error(`[LibraryList] Expected an array for templates in category ${categoryName}, got:`, templateDirs);
          return; // Skip this category
        }
      } catch (error) {
        console.error(`[LibraryList] Failed to fetch templates in category ${categoryName}:`, error);
        return; // Skip this category on error
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
  await Promise.allSettled(categoryProcessingPromises);

  console.log(`[LibraryList] Finished fetching templates. Total found: ${collectedTemplates.length}`);
  // Sort templates by name for consistent display
  collectedTemplates.sort((a, b) => a.name.localeCompare(b.name));
  return collectedTemplates;
};

function LibraryList() {
  const { t } = useTranslation();
  const [templates, setTemplates] = useState<LibraryTemplate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>(''); // '' for All Categories

  useEffect(() => {
    setLoading(true);
    fetchLibraryTemplates()
      .then(data => {
        setTemplates(data);
        setError(null);
      })
      .catch(err => {
        setError(`Failed to load library templates: ${err.message}`);
        setTemplates([]);
      })
      .finally(() => {
        setLoading(false);
      });
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
      <SectionBox title={t('Gatekeeper Library')}>
        <Loader title={t('Loading Gatekeeper Library...')} />
      </SectionBox>
    );
  }

  if (error) {
    return (
      <SectionBox title={t('Gatekeeper Library')}>
        <Typography color="error">{error}</Typography>
      </SectionBox>
    );
  }

  if (templates.length === 0) {
    return (
      <SectionBox title={t('Gatekeeper Library')}>
        <Typography>{t('No templates found in the library, or failed to load all of them.')}</Typography>
      </SectionBox>
    );
  }

  return (
    <SectionBox title={t('Gatekeeper Library')}>
      <Box mb={2}>
        <FormControl fullWidth sx={{ maxWidth: 300 }}>
          <InputLabel id="category-filter-label">{t('Filter by Category')}</InputLabel>
          <Select
            labelId="category-filter-label"
            id="category-filter-select"
            value={selectedCategory}
            label={t('Filter by Category')}
            onChange={handleCategoryChange}
          >
            <MenuItem value="">
              <em>{t('All Categories')}</em>
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
            label: t('Name'),
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
            label: t('Category'),
            getter: item => item.category,
          },
          {
            label: t('Description'),
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
