import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearGitHubToken,
  fetchLibraryTemplates,
  getCanonicalTemplateRouteParams,
  getGitHubToken,
  LIBRARY_LIMITS,
  resolveLibraryTemplateRoute,
  setGitHubToken,
} from './libraryData';

const validTemplateYAML = `
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8srequiredlabels
  annotations:
    description: Requires labels
spec:
  crd:
    spec:
      names:
        kind: K8sRequiredLabels
        plural: k8srequiredlabels
`;

function jsonResponse(body: unknown, status = 200, statusText = 'OK'): Response {
  return new Response(JSON.stringify(body), {
    status,
    statusText,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  clearGitHubToken();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Policy Library data loading', () => {
  it('returns canonical category/name route parameters', () => {
    expect(
      getCanonicalTemplateRouteParams({
        id: 'general-k8srequiredlabels',
        category: 'general',
        templateName: 'k8srequiredlabels',
        name: 'K8sRequiredLabels',
        description: 'Requires labels',
        sourceUrl: 'https://example.invalid/template.yaml',
        rawYAML: validTemplateYAML,
      })
    ).toEqual({ category: 'general', name: 'k8srequiredlabels' });
  });

  it('resolves canonical routes without a GitHub request', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      resolveLibraryTemplateRoute({ category: 'general', name: 'k8srequiredlabels' })
    ).resolves.toEqual({
      category: 'general',
      templateName: 'k8srequiredlabels',
      id: 'general-k8srequiredlabels',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('resolves a legacy id using the longest matching category name', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse([
          { type: 'dir', name: 'pod', path: 'library/pod' },
          { type: 'dir', name: 'pod-security', path: 'library/pod-security' },
        ])
      )
    );

    await expect(
      resolveLibraryTemplateRoute({ id: 'pod-security-k8sallowedrepos' })
    ).resolves.toEqual({
      category: 'pod-security',
      templateName: 'k8sallowedrepos',
      id: 'pod-security-k8sallowedrepos',
    });
  });

  it('reports category and template failures while listing only deployable templates', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/contents/library?')) {
        return jsonResponse([
          { type: 'dir', name: 'general', path: 'library/general' },
          { type: 'dir', name: 'unavailable', path: 'library/unavailable' },
        ]);
      }
      if (url.includes('/contents/library/general?')) {
        return jsonResponse([
          { type: 'dir', name: 'good-template', path: 'library/general/good-template' },
          {
            type: 'dir',
            name: 'missing-template',
            path: 'library/general/missing-template',
          },
        ]);
      }
      if (url.includes('/contents/library/unavailable?')) {
        return jsonResponse({ message: 'service unavailable' }, 503, 'Service Unavailable');
      }
      if (url.includes('/general/good-template/template.yaml')) {
        return new Response(validTemplateYAML, { status: 200 });
      }
      if (url.includes('/general/missing-template/template.yaml')) {
        return new Response('not found', { status: 404, statusText: 'Not Found' });
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchLibraryTemplates();

    expect(result.templates).toHaveLength(1);
    expect(result.templates[0]).toMatchObject({
      category: 'general',
      templateName: 'good-template',
      name: 'k8srequiredlabels',
      rawYAML: validTemplateYAML,
    });
    expect(result.failures).toHaveLength(2);
    expect(result.failures).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ scope: 'category', category: 'unavailable' }),
        expect.objectContaining({
          scope: 'template',
          category: 'general',
          templateName: 'missing-template',
        }),
      ])
    );
    expect(result.discoveredCategoryCount).toBe(2);
    expect(result.loadedCategoryCount).toBe(1);
  });

  it('keeps GitHub credentials in module memory rather than browser storage', async () => {
    const storage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(),
      length: 0,
    };
    vi.stubGlobal('localStorage', storage);

    setGitHubToken('  secret-token  ');
    expect(getGitHubToken()).toBe('secret-token');
    expect(storage.setItem).not.toHaveBeenCalled();

    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
    vi.stubGlobal('fetch', fetchMock);
    await fetchLibraryTemplates();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/contents/library?'),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer secret-token' }),
      })
    );
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('uses raw GitHub content for template YAML without spending REST quota or forwarding the token', async () => {
    setGitHubToken('secret-token');
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      void init;
      if (url.includes('/contents/library?')) {
        return jsonResponse([{ type: 'dir', name: 'general', path: 'library/general' }]);
      }
      if (url.includes('/contents/library/general?')) {
        return jsonResponse([
          { type: 'dir', name: 'raw-template', path: 'library/general/raw-template' },
        ]);
      }
      if (url.includes('/general/raw-template/template.yaml')) {
        return new Response(validTemplateYAML, { status: 200 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchLibraryTemplates();

    expect(result.templates).toHaveLength(1);
    const rawRequest = fetchMock.mock.calls.find(([input]) =>
      String(input).includes('/general/raw-template/template.yaml')
    );
    expect(String(rawRequest?.[0])).toMatch(
      /^https:\/\/raw\.githubusercontent\.com\/open-policy-agent\/gatekeeper-library\/master\//
    );
    expect(rawRequest?.[1]).toEqual(
      expect.objectContaining({
        headers: expect.not.objectContaining({ Authorization: expect.any(String) }),
      })
    );
  });

  it('rejects oversized template YAML before reading the response body and reports a partial failure', async () => {
    const readOversizedBody = vi.fn();
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/contents/library?')) {
        return jsonResponse([{ type: 'dir', name: 'general', path: 'library/general' }]);
      }
      if (url.includes('/contents/library/general?')) {
        return jsonResponse([
          { type: 'dir', name: 'oversized', path: 'library/general/oversized' },
        ]);
      }
      if (url.includes('/general/oversized/template.yaml')) {
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Headers({
            'Content-Length': String(LIBRARY_LIMITS.maxTemplateBytes + 1),
          }),
          body: null,
          text: readOversizedBody,
        } as unknown as Response;
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchLibraryTemplates();

    expect(result.templates).toEqual([]);
    expect(result.failures).toEqual([
      expect.objectContaining({
        scope: 'template',
        category: 'general',
        templateName: 'oversized',
        message: expect.stringMatching(/exceeds the .* byte limit/i),
      }),
    ]);
    expect(readOversizedBody).not.toHaveBeenCalled();
  });

  it('caps discovered categories and reports skipped categories as a partial failure', async () => {
    const categoryEntries = Array.from(
      { length: LIBRARY_LIMITS.maxCategories + 2 },
      (_, index) => ({
        type: 'dir',
        name: `category-${index}`,
        path: `library/category-${index}`,
      })
    );
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/contents/library?')) {
        return jsonResponse(categoryEntries);
      }
      if (url.includes('/contents/library/category-')) {
        return jsonResponse([]);
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchLibraryTemplates();

    expect(result.discoveredCategoryCount).toBe(categoryEntries.length);
    expect(result.loadedCategoryCount).toBe(LIBRARY_LIMITS.maxCategories);
    expect(result.failures).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          scope: 'category',
          message: expect.stringMatching(/skipped 2 categories.*limit/i),
        }),
      ])
    );
    const categoryListingCalls = fetchMock.mock.calls.filter(([input]) =>
      String(input).includes('/contents/library/category-')
    );
    expect(categoryListingCalls).toHaveLength(LIBRARY_LIMITS.maxCategories);
  });

  it('caps templates per category and reports skipped templates as a partial failure', async () => {
    const templateEntries = Array.from(
      { length: LIBRARY_LIMITS.maxTemplatesPerCategory + 2 },
      (_, index) => ({
        type: 'dir',
        name: `template-${index}`,
        path: `library/general/template-${index}`,
      })
    );
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/contents/library?')) {
        return jsonResponse([{ type: 'dir', name: 'general', path: 'library/general' }]);
      }
      if (url.includes('/contents/library/general?')) {
        return jsonResponse(templateEntries);
      }
      if (url.includes('/general/template-')) {
        return new Response(validTemplateYAML, { status: 200 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchLibraryTemplates();

    expect(result.templates).toHaveLength(LIBRARY_LIMITS.maxTemplatesPerCategory);
    expect(result.failures).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          scope: 'template',
          category: 'general',
          message: expect.stringMatching(/skipped 2 templates.*per-category limit/i),
        }),
      ])
    );
  });

  it('stops streaming template YAML once the byte limit is exceeded', async () => {
    const oversizedYAML = 'x'.repeat(LIBRARY_LIMITS.maxTemplateBytes + 1);
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/contents/library?')) {
        return jsonResponse([{ type: 'dir', name: 'general', path: 'library/general' }]);
      }
      if (url.includes('/contents/library/general?')) {
        return jsonResponse([
          { type: 'dir', name: 'oversized-stream', path: 'library/general/oversized-stream' },
        ]);
      }
      if (url.includes('/general/oversized-stream/template.yaml')) {
        return new Response(oversizedYAML, { status: 200 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchLibraryTemplates();

    expect(result.templates).toEqual([]);
    expect(result.failures).toEqual([
      expect.objectContaining({
        scope: 'template',
        templateName: 'oversized-stream',
        message: expect.stringMatching(/exceeds the .* byte limit/i),
      }),
    ]);
  });

  it('caps the total templates loaded across categories', async () => {
    const categoryCount =
      Math.ceil(LIBRARY_LIMITS.maxTemplates / LIBRARY_LIMITS.maxTemplatesPerCategory) + 1;
    const categories = Array.from({ length: categoryCount }, (_, categoryIndex) => ({
      type: 'dir',
      name: `category-${categoryIndex}`,
      path: `library/category-${categoryIndex}`,
    }));
    const templates = Array.from(
      { length: LIBRARY_LIMITS.maxTemplatesPerCategory },
      (_, templateIndex) => ({
        type: 'dir',
        name: `template-${templateIndex}`,
      })
    );
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/contents/library?')) {
        return jsonResponse(categories);
      }
      if (url.includes('/template-') && url.includes('/template.yaml')) {
        return new Response(validTemplateYAML, { status: 200 });
      }
      if (url.includes('/contents/library/category-')) {
        return jsonResponse(templates);
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchLibraryTemplates();

    expect(result.templates).toHaveLength(LIBRARY_LIMITS.maxTemplates);
    expect(result.failures).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          scope: 'template',
          message: expect.stringMatching(/total template limit/i),
        }),
      ])
    );
  });

  it('limits concurrent upstream template requests', async () => {
    const templateCount = LIBRARY_LIMITS.requestConcurrency + 3;
    let activeTemplateRequests = 0;
    let maxActiveTemplateRequests = 0;
    const templateEntries = Array.from({ length: templateCount }, (_, index) => ({
      type: 'dir',
      name: `template-${index}`,
      path: `library/general/template-${index}`,
    }));
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/contents/library?')) {
        return jsonResponse([{ type: 'dir', name: 'general', path: 'library/general' }]);
      }
      if (url.includes('/contents/library/general?')) {
        return jsonResponse(templateEntries);
      }
      if (url.includes('/general/template-')) {
        activeTemplateRequests += 1;
        maxActiveTemplateRequests = Math.max(maxActiveTemplateRequests, activeTemplateRequests);
        await new Promise(resolve => setTimeout(resolve, 10));
        activeTemplateRequests -= 1;
        return new Response(validTemplateYAML, { status: 200 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchLibraryTemplates();

    expect(result.templates).toHaveLength(templateCount);
    expect(maxActiveTemplateRequests).toBe(LIBRARY_LIMITS.requestConcurrency);
  });
});
