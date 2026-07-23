import yaml from 'js-yaml';

export interface LibraryTemplate {
  id: string;
  name: string;
  templateName: string;
  description: string;
  category: string;
  sourceUrl: string;
  rawYAML: string;
}

export interface LibraryTemplateRoute {
  category?: string;
  name?: string;
  id?: string;
}

export interface ResolvedLibraryTemplateRoute {
  category: string;
  templateName: string;
  id: string;
}

export interface LibraryLoadFailure {
  scope: 'category' | 'template';
  category: string;
  templateName?: string;
  message: string;
}

export interface LibraryLoadResult {
  templates: LibraryTemplate[];
  failures: LibraryLoadFailure[];
  discoveredCategoryCount: number;
  loadedCategoryCount: number;
}

interface GitHubContentEntry {
  name?: string;
  path?: string;
  type?: string;
}

interface KubernetesDocument {
  kind?: unknown;
  metadata?: unknown;
}

interface LoadedCategory {
  category: string;
  entries: GitHubContentEntry[];
}

interface TemplateFetchTask {
  category: string;
  templateName: string;
}

const GITHUB_OWNER = 'open-policy-agent';
const GITHUB_REPO = 'gatekeeper-library';
const GITHUB_BRANCH = 'master';
const LIBRARY_BASE_PATH = 'library';

export const LIBRARY_LIMITS = Object.freeze({
  maxCategories: 16,
  maxTemplatesPerCategory: 50,
  maxTemplates: 100,
  maxTemplateBytes: 256 * 1024,
  maxDirectoryListingBytes: 512 * 1024,
  maxErrorBodyBytes: 16 * 1024,
  requestConcurrency: 4,
});

let inMemoryGitHubToken = '';

export class GitHubRequestError extends Error {
  readonly status: number;
  readonly resource: string;

  constructor(resource: string, status: number, statusText: string, responseBody = '') {
    const detail = responseBody.trim().replace(/\s+/g, ' ').slice(0, 300);
    super(
      `GitHub request failed for "${resource}": ${status} ${statusText}${
        detail ? `. ${detail}` : ''
      }`
    );
    this.name = 'GitHubRequestError';
    this.status = status;
    this.resource = resource;
  }
}

class ResponseSizeLimitError extends Error {
  constructor(resource: string, maxBytes: number, observedBytes?: number) {
    super(
      `${resource} exceeds the ${maxBytes} byte limit${
        observedBytes === undefined ? '' : ` (${observedBytes} bytes received or advertised)`
      }.`
    );
    this.name = 'ResponseSizeLimitError';
  }
}

export function getGitHubToken(): string {
  return inMemoryGitHubToken;
}

export function setGitHubToken(token: string): void {
  inMemoryGitHubToken = token.trim();
}

export function clearGitHubToken(): void {
  inMemoryGitHubToken = '';
}

export function buildTemplateId(category: string, templateName: string): string {
  return `${category}-${templateName}`;
}

export function getCanonicalTemplateRouteParams(template: LibraryTemplate): {
  category: string;
  name: string;
} {
  return {
    category: template.category,
    name: template.templateName,
  };
}

export function buildTemplateSourceUrl(category: string, templateName: string): string {
  const encodedPath = [LIBRARY_BASE_PATH, category, templateName, 'template.yaml']
    .map(segment => encodeURIComponent(segment))
    .join('/');

  return `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${encodedPath}`;
}

function buildGitHubContentsUrl(path: string): string {
  const encodedPath = path
    .split('/')
    .filter(Boolean)
    .map(segment => encodeURIComponent(segment))
    .join('/');

  return `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${encodedPath}?ref=${encodeURIComponent(
    GITHUB_BRANCH
  )}`;
}

function getAdvertisedContentLength(response: Response): number | undefined {
  const value = response.headers.get('content-length');
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

async function readResponseTextWithLimit(
  response: Response,
  maxBytes: number,
  resource: string
): Promise<string> {
  const advertisedLength = getAdvertisedContentLength(response);
  if (advertisedLength !== undefined && advertisedLength > maxBytes) {
    throw new ResponseSizeLimitError(resource, maxBytes, advertisedLength);
  }

  if (!response.body) {
    throw new Error(
      `${resource} could not be read safely because response streaming is unavailable.`
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let byteLength = 0;
  let text = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      byteLength += value.byteLength;
      if (byteLength > maxBytes) {
        await reader.cancel();
        throw new ResponseSizeLimitError(resource, maxBytes, byteLength);
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return text;
  } finally {
    reader.releaseLock();
  }
}

async function readErrorResponseBody(response: Response, resource: string): Promise<string> {
  try {
    return await readResponseTextWithLimit(
      response,
      LIBRARY_LIMITS.maxErrorBodyBytes,
      `Error response for "${resource}"`
    );
  } catch (error) {
    return getErrorMessage(error);
  }
}

async function fetchGitHubContents(
  path: string,
  token = getGitHubToken()
): Promise<GitHubContentEntry[]> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(buildGitHubContentsUrl(path), { headers });
  if (!response.ok) {
    throw new GitHubRequestError(
      path,
      response.status,
      response.statusText,
      await readErrorResponseBody(response, path)
    );
  }

  const responseText = await readResponseTextWithLimit(
    response,
    LIBRARY_LIMITS.maxDirectoryListingBytes,
    `GitHub directory listing for "${path}"`
  );

  let body: unknown;
  try {
    body = JSON.parse(responseText);
  } catch (error) {
    throw new Error(
      `GitHub returned invalid JSON for directory listing "${path}": ${getErrorMessage(error)}`
    );
  }

  if (!Array.isArray(body)) {
    throw new Error(`GitHub returned an invalid directory listing for "${path}".`);
  }

  return body as GitHubContentEntry[];
}

async function fetchFileContent(category: string, templateName: string): Promise<string> {
  const sourceUrl = buildTemplateSourceUrl(category, templateName);
  const response = await fetch(sourceUrl, {
    headers: { Accept: 'text/plain, application/yaml;q=0.9, */*;q=0.1' },
  });
  if (!response.ok) {
    throw new GitHubRequestError(
      sourceUrl,
      response.status,
      response.statusText,
      await readErrorResponseBody(response, sourceUrl)
    );
  }

  const content = await readResponseTextWithLimit(
    response,
    LIBRARY_LIMITS.maxTemplateBytes,
    `Template YAML at "${sourceUrl}"`
  );
  if (!content.trim()) {
    throw new Error(`Template YAML at "${sourceUrl}" was empty.`);
  }

  return content;
}

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) {
    return [];
  }

  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) {
        return;
      }
      results[index] = await mapper(items[index], index);
    }
  }

  const workerCount = Math.min(Math.max(1, concurrency), items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function generateFallbackName(dirName: string): string {
  if (dirName.startsWith('k8s')) {
    return `K8s${dirName.charAt(3).toUpperCase()}${dirName.slice(4)}`;
  }
  if (dirName.startsWith('psp')) {
    return `PSP${dirName.charAt(3).toUpperCase()}${dirName.slice(4)}`;
  }
  return dirName.charAt(0).toUpperCase() + dirName.slice(1);
}

function readTemplateMetadata(
  rawYAML: string,
  templateName: string
): { name: string; description: string } {
  const documents = yaml.loadAll(rawYAML) as KubernetesDocument[];
  const constraintTemplate = documents.find(
    document => isRecord(document) && document.kind === 'ConstraintTemplate'
  );

  if (!constraintTemplate || !isRecord(constraintTemplate)) {
    throw new Error('YAML does not contain a ConstraintTemplate document.');
  }

  const metadata = isRecord(constraintTemplate.metadata) ? constraintTemplate.metadata : undefined;
  const annotations = metadata && isRecord(metadata.annotations) ? metadata.annotations : undefined;
  const parsedName = metadata?.name;
  const parsedDescription = annotations?.description;

  return {
    name: typeof parsedName === 'string' ? parsedName : generateFallbackName(templateName),
    description:
      typeof parsedDescription === 'string' ? parsedDescription : 'No description available.',
  };
}

export async function fetchLibraryTemplate(
  category: string,
  templateName: string
): Promise<LibraryTemplate> {
  const sourceUrl = buildTemplateSourceUrl(category, templateName);
  const rawYAML = await fetchFileContent(category, templateName);
  const metadata = readTemplateMetadata(rawYAML, templateName);

  return {
    id: buildTemplateId(category, templateName),
    name: metadata.name,
    templateName,
    description: metadata.description,
    category,
    sourceUrl,
    rawYAML,
  };
}

export async function fetchLibraryTemplates(token = getGitHubToken()): Promise<LibraryLoadResult> {
  const categoryEntries = await fetchGitHubContents(LIBRARY_BASE_PATH, token);
  const discoveredCategories = categoryEntries.filter(
    entry =>
      entry.type === 'dir' && typeof entry.name === 'string' && typeof entry.path === 'string'
  );
  const categories = discoveredCategories.slice(0, LIBRARY_LIMITS.maxCategories);
  const templates: LibraryTemplate[] = [];
  const failures: LibraryLoadFailure[] = [];

  if (discoveredCategories.length > categories.length) {
    failures.push({
      scope: 'category',
      category: 'Additional categories',
      message: `Skipped ${
        discoveredCategories.length - categories.length
      } categories because the Policy Library category limit is ${LIBRARY_LIMITS.maxCategories}.`,
    });
  }

  const categoryResults = await mapWithConcurrency(
    categories,
    LIBRARY_LIMITS.requestConcurrency,
    async categoryEntry => {
      const category = categoryEntry.name as string;
      try {
        const entries = await fetchGitHubContents(categoryEntry.path as string, token);
        return { category, entries } satisfies LoadedCategory;
      } catch (error) {
        failures.push({
          scope: 'category',
          category,
          message: getErrorMessage(error),
        });
        return null;
      }
    }
  );
  const loadedCategories = categoryResults.filter(
    (result): result is LoadedCategory => result !== null
  );
  const templateTasks: TemplateFetchTask[] = [];
  let remainingTemplateCapacity = LIBRARY_LIMITS.maxTemplates;

  for (const { category, entries } of loadedCategories) {
    const discoveredTemplates = entries.filter(
      entry => entry.type === 'dir' && typeof entry.name === 'string'
    );
    const categoryTemplates = discoveredTemplates.slice(0, LIBRARY_LIMITS.maxTemplatesPerCategory);

    if (discoveredTemplates.length > categoryTemplates.length) {
      failures.push({
        scope: 'template',
        category,
        templateName: 'Additional templates',
        message: `Skipped ${
          discoveredTemplates.length - categoryTemplates.length
        } templates because the per-category limit is ${LIBRARY_LIMITS.maxTemplatesPerCategory}.`,
      });
    }

    const acceptedTemplates = categoryTemplates.slice(0, remainingTemplateCapacity);
    if (categoryTemplates.length > acceptedTemplates.length) {
      failures.push({
        scope: 'template',
        category,
        templateName: 'Additional templates',
        message: `Skipped ${
          categoryTemplates.length - acceptedTemplates.length
        } templates because the Policy Library total template limit is ${
          LIBRARY_LIMITS.maxTemplates
        }.`,
      });
    }

    templateTasks.push(
      ...acceptedTemplates.map(entry => ({
        category,
        templateName: entry.name as string,
      }))
    );
    remainingTemplateCapacity -= acceptedTemplates.length;
  }

  await mapWithConcurrency(
    templateTasks,
    LIBRARY_LIMITS.requestConcurrency,
    async ({ category, templateName }) => {
      try {
        templates.push(await fetchLibraryTemplate(category, templateName));
      } catch (error) {
        failures.push({
          scope: 'template',
          category,
          templateName,
          message: getErrorMessage(error),
        });
      }
    }
  );

  templates.sort((left, right) => left.name.localeCompare(right.name));
  failures.sort((left, right) => {
    const leftKey = `${left.category}/${left.templateName ?? ''}`;
    const rightKey = `${right.category}/${right.templateName ?? ''}`;
    return leftKey.localeCompare(rightKey);
  });

  return {
    templates,
    failures,
    discoveredCategoryCount: discoveredCategories.length,
    loadedCategoryCount: loadedCategories.length,
  };
}

export async function resolveLibraryTemplateRoute(
  route: LibraryTemplateRoute,
  token = getGitHubToken()
): Promise<ResolvedLibraryTemplateRoute> {
  if (route.category && route.name) {
    return {
      category: route.category,
      templateName: route.name,
      id: buildTemplateId(route.category, route.name),
    };
  }

  if (!route.id) {
    throw new Error('The library template route is missing category/name or a legacy id.');
  }

  const categoryEntries = await fetchGitHubContents(LIBRARY_BASE_PATH, token);
  const categoryNames = categoryEntries
    .filter(entry => entry.type === 'dir' && typeof entry.name === 'string')
    .slice(0, LIBRARY_LIMITS.maxCategories)
    .map(entry => entry.name as string)
    .sort((left, right) => right.length - left.length);
  const category = categoryNames.find(candidate => route.id?.startsWith(`${candidate}-`));

  if (!category) {
    throw new Error(`Could not resolve legacy library template id "${route.id}".`);
  }

  const templateName = route.id.slice(category.length + 1);
  if (!templateName) {
    throw new Error(`Legacy library template id "${route.id}" is missing a template name.`);
  }

  return {
    category,
    templateName,
    id: route.id,
  };
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export function isOfflineError(error: unknown): boolean {
  if (error instanceof TypeError) {
    return true;
  }
  const message = getErrorMessage(error).toLowerCase();
  return message.includes('failed to fetch') || message.includes('network');
}

export function isRateLimitOrAuthenticationError(error: unknown): boolean {
  return (
    error instanceof GitHubRequestError &&
    (error.status === 401 || error.status === 403 || error.status === 429)
  );
}
