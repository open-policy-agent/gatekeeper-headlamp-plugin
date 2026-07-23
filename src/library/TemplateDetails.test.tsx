// @vitest-environment jsdom

import * as ApiProxy from '@kinvolk/headlamp-plugin/lib/ApiProxy';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearGitHubToken, setGitHubToken } from './libraryData';
import LibraryTemplateDetails from './TemplateDetails';

const routeContext = vi.hoisted(() => ({
  params: {} as { category?: string; name?: string; id?: string },
  state: null as unknown,
}));

vi.mock('react-router-dom', () => ({
  useParams: () => routeContext.params,
  useLocation: () => ({ state: routeContext.state }),
}));

vi.mock('@kinvolk/headlamp-plugin/lib/CommonComponents', () => ({
  Loader: ({ title }: { title: string }) => <div>{title}</div>,
  SectionBox: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  ),
}));

vi.mock('@kinvolk/headlamp-plugin/lib/ApiProxy', () => ({
  request: vi.fn(),
}));

const validTemplateYAML = `
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8srequiredlabels
spec:
  crd:
    spec:
      names:
        kind: K8sRequiredLabels
        plural: k8srequiredlabels
`;

beforeEach(() => {
  routeContext.params = {};
  routeContext.state = null;
  vi.mocked(ApiProxy.request).mockReset();
});

afterEach(() => {
  cleanup();
  clearGitHubToken();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('LibraryTemplateDetails route loading', () => {
  it('loads a canonical category/name route without location state', async () => {
    routeContext.params = { category: 'general', name: 'k8srequiredlabels' };
    setGitHubToken('example-credential');
    const fetchMock = vi.fn().mockResolvedValue(new Response(validTemplateYAML, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    render(<LibraryTemplateDetails />);

    expect(await screen.findByText('Library Template: k8srequiredlabels')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.github.com/repos/open-policy-agent/gatekeeper-library/contents/library/general/k8srequiredlabels/template.yaml?ref=master',
      {
        headers: {
          Accept: 'application/vnd.github.raw+json',
          Authorization: 'Bearer example-credential',
        },
      }
    );
  });

  it('loads a legacy id route without location state', async () => {
    routeContext.params = { id: 'pod-security-k8sallowedrepos' };
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/contents/library?')) {
        return new Response(
          JSON.stringify([
            { type: 'dir', name: 'pod', path: 'library/pod' },
            { type: 'dir', name: 'pod-security', path: 'library/pod-security' },
          ]),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (url.includes('/pod-security/k8sallowedrepos/template.yaml')) {
        return new Response(validTemplateYAML, { status: 200 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<LibraryTemplateDetails />);

    expect(await screen.findByText('Library Template: k8srequiredlabels')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('fails immediately and reports partial application when CRD reads are forbidden', async () => {
    routeContext.params = { category: 'general', name: 'k8srequiredlabels' };
    routeContext.state = {
      template: {
        id: 'general-k8srequiredlabels',
        category: 'general',
        templateName: 'k8srequiredlabels',
        name: 'k8srequiredlabels',
        description: 'Requires labels',
        sourceUrl: 'https://example.invalid/template.yaml',
        rawYAML: validTemplateYAML,
      },
    };

    const requestMock = vi.mocked(ApiProxy.request);
    requestMock
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(Object.assign(new Error('Forbidden'), { status: 403 }));

    render(<LibraryTemplateDetails />);

    expect(await screen.findByText('Library Template: k8srequiredlabels')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Preview Constraint YAML' }));

    const applyButton = screen.getByRole('button', {
      name: 'Apply Template & Constraint to Cluster',
    });
    await waitFor(() => expect((applyButton as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(applyButton);

    expect(
      await screen.findByText(
        /ConstraintTemplate k8srequiredlabels was applied, but access was denied \(403\) while reading CRD .* The Constraint was not created/i
      )
    ).toBeTruthy();
    expect(requestMock).toHaveBeenCalledTimes(2);
    expect(requestMock).not.toHaveBeenCalledWith(
      '/apis/constraints.gatekeeper.sh/v1beta1/k8srequiredlabels',
      expect.anything()
    );
  });

  it.each([
    {
      label: 'authentication failures',
      error: Object.assign(new Error('Unauthorized'), { status: 401 }),
      expected: /authentication failed \(401\) while reading CRD/i,
    },
    {
      label: 'network or proxy failures',
      error: Object.assign(new Error('Unreachable'), { status: 502 }),
      expected: /network or Headlamp proxy failure occurred while reading CRD/i,
    },
    {
      label: 'server failures',
      error: Object.assign(new Error('Service Unavailable'), { status: 503 }),
      expected: /Kubernetes API or Headlamp proxy returned a server error \(503\)/i,
    },
  ])('distinguishes $label from a pending CRD', async ({ error, expected }) => {
    routeContext.params = { category: 'general', name: 'k8srequiredlabels' };
    routeContext.state = {
      template: {
        id: 'general-k8srequiredlabels',
        category: 'general',
        templateName: 'k8srequiredlabels',
        name: 'k8srequiredlabels',
        description: 'Requires labels',
        sourceUrl: 'https://example.invalid/template.yaml',
        rawYAML: validTemplateYAML,
      },
    };

    const requestMock = vi.mocked(ApiProxy.request);
    requestMock.mockResolvedValueOnce({}).mockRejectedValueOnce(error);

    render(<LibraryTemplateDetails />);

    expect(await screen.findByText('Library Template: k8srequiredlabels')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Preview Constraint YAML' }));
    const applyButton = screen.getByRole('button', {
      name: 'Apply Template & Constraint to Cluster',
    });
    await waitFor(() => expect((applyButton as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(applyButton);

    expect(await screen.findByText(expected)).toBeTruthy();
    expect(requestMock).toHaveBeenCalledTimes(2);
  });
});
