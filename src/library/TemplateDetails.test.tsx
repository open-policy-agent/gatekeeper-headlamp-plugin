// @vitest-environment jsdom

import * as ApiProxy from '@kinvolk/headlamp-plugin/lib/ApiProxy';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearGitHubToken } from './libraryData';
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

const templateWithParametersYAML = `
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
      validation:
        openAPIV3Schema:
          type: object
          properties:
            message:
              type: string
`;

function useTemplateRoute(rawYAML: string = validTemplateYAML) {
  routeContext.params = { category: 'general', name: 'k8srequiredlabels' };
  routeContext.state = {
    template: {
      id: 'general-k8srequiredlabels',
      category: 'general',
      templateName: 'k8srequiredlabels',
      name: 'k8srequiredlabels',
      description: 'Requires labels',
      sourceUrl: 'https://example.invalid/template.yaml',
      rawYAML,
    },
  };
}

function establishedCRD() {
  return {
    status: {
      conditions: [{ type: 'Established', status: 'True' }],
    },
  };
}

function compatibleExistingTemplate(apiVersion = 'templates.gatekeeper.sh/v1') {
  return {
    apiVersion,
    kind: 'ConstraintTemplate',
    metadata: {
      name: 'k8srequiredlabels',
      resourceVersion: '123',
    },
    spec: {
      crd: {
        spec: {
          names: {
            plural: 'k8srequiredlabels',
            kind: 'K8sRequiredLabels',
          },
        },
      },
    },
    status: { created: true },
  };
}

async function generateConstraintPreview() {
  expect(await screen.findByText('Library Template: k8srequiredlabels')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Preview Constraint YAML' }));
  const applyButton = screen.getByRole('button', {
    name: 'Apply Template & Constraint to Cluster',
  });
  await waitFor(() => expect((applyButton as HTMLButtonElement).disabled).toBe(false));
  return applyButton as HTMLButtonElement;
}

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
    const fetchMock = vi.fn().mockResolvedValue(new Response(validTemplateYAML, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    render(<LibraryTemplateDetails />);

    expect(await screen.findByText('Library Template: k8srequiredlabels')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(
      'https://raw.githubusercontent.com/open-policy-agent/gatekeeper-library/master/library/general/k8srequiredlabels/template.yaml',
      {
        headers: {
          Accept: 'text/plain, application/yaml;q=0.9, */*;q=0.1',
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

describe('LibraryTemplateDetails apply safety', () => {
  it('uses the ConstraintTemplate object v1beta1 apiVersion for the POST URL', async () => {
    useTemplateRoute(
      validTemplateYAML.replace('templates.gatekeeper.sh/v1', 'templates.gatekeeper.sh/v1beta1')
    );
    const requestMock = vi.mocked(ApiProxy.request);
    requestMock
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce(establishedCRD())
      .mockResolvedValueOnce({});

    render(<LibraryTemplateDetails />);
    const applyButton = await generateConstraintPreview();
    fireEvent.click(applyButton);

    expect(
      await screen.findByText('ConstraintTemplate and Constraint applied successfully!')
    ).toBeTruthy();
    expect(requestMock).toHaveBeenNthCalledWith(
      1,
      '/apis/templates.gatekeeper.sh/v1beta1/constrainttemplates',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('rejects unsupported ConstraintTemplate apiVersions before making an API request', async () => {
    useTemplateRoute(
      validTemplateYAML.replace('templates.gatekeeper.sh/v1', 'templates.gatekeeper.sh/v2')
    );

    render(<LibraryTemplateDetails />);
    const applyButton = await generateConstraintPreview();
    fireEvent.click(applyButton);

    expect(
      await screen.findByText(
        /Unsupported ConstraintTemplate apiVersion "templates\.gatekeeper\.sh\/v2"/i
      )
    ).toBeTruthy();
    expect(ApiProxy.request).not.toHaveBeenCalled();
  });

  it('stops after a 409 when the existing ConstraintTemplate spec is incompatible', async () => {
    useTemplateRoute();
    const requestMock = vi.mocked(ApiProxy.request);
    requestMock
      .mockRejectedValueOnce(Object.assign(new Error('Already exists'), { status: 409 }))
      .mockResolvedValueOnce({
        ...compatibleExistingTemplate(),
        spec: {
          crd: {
            spec: {
              names: {
                kind: 'K8sDifferentPolicy',
                plural: 'k8srequiredlabels',
              },
            },
          },
        },
      });

    render(<LibraryTemplateDetails />);
    const applyButton = await generateConstraintPreview();
    fireEvent.click(applyButton);

    expect(
      await screen.findByText(
        /already exists, but its spec is not semantically equivalent.*The Constraint was not created/i
      )
    ).toBeTruthy();
    expect(requestMock).toHaveBeenCalledTimes(2);
    expect(requestMock).toHaveBeenNthCalledWith(
      2,
      '/apis/templates.gatekeeper.sh/v1/constrainttemplates/k8srequiredlabels',
      { method: 'GET' }
    );
    expect(requestMock).not.toHaveBeenCalledWith(
      '/apis/constraints.gatekeeper.sh/v1beta1/k8srequiredlabels',
      expect.anything()
    );
  });

  it('continues after a 409 when the existing ConstraintTemplate spec is equivalent', async () => {
    useTemplateRoute(
      validTemplateYAML.replace('templates.gatekeeper.sh/v1', 'templates.gatekeeper.sh/v1beta1')
    );
    const requestMock = vi.mocked(ApiProxy.request);
    requestMock
      .mockRejectedValueOnce(Object.assign(new Error('Already exists'), { status: 409 }))
      .mockResolvedValueOnce(compatibleExistingTemplate('templates.gatekeeper.sh/v1beta1'))
      .mockResolvedValueOnce(establishedCRD())
      .mockResolvedValueOnce({});

    render(<LibraryTemplateDetails />);
    const applyButton = await generateConstraintPreview();
    fireEvent.click(applyButton);

    expect(
      await screen.findByText('ConstraintTemplate and Constraint applied successfully!')
    ).toBeTruthy();
    expect(requestMock).toHaveBeenCalledTimes(4);
    expect(requestMock).toHaveBeenNthCalledWith(
      1,
      '/apis/templates.gatekeeper.sh/v1beta1/constrainttemplates',
      expect.objectContaining({ method: 'POST' })
    );
    expect(requestMock).toHaveBeenNthCalledWith(
      2,
      '/apis/templates.gatekeeper.sh/v1beta1/constrainttemplates/k8srequiredlabels',
      { method: 'GET' }
    );
    expect(requestMock).toHaveBeenNthCalledWith(
      4,
      '/apis/constraints.gatekeeper.sh/v1beta1/k8srequiredlabels',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it.each([
    {
      field: 'constraint name',
      label: /Constraint Name/i,
      value: 'updated-constraint-name',
    },
    {
      field: 'match JSON',
      label: /Match Criteria \(JSON format\)/i,
      value: JSON.stringify({ kinds: [{ apiGroups: ['apps'], kinds: ['Deployment'] }] }),
    },
    {
      field: 'parameters JSON',
      label: /Parameters \(JSON format\)/i,
      value: JSON.stringify({ message: 'updated' }),
    },
  ])('invalidates the generated preview after changing $field', async ({ label, value }) => {
    useTemplateRoute(templateWithParametersYAML);
    render(<LibraryTemplateDetails />);
    const applyButton = await generateConstraintPreview();

    expect(screen.getByRole('heading', { name: 'Generated Constraint YAML' })).toBeTruthy();
    fireEvent.change(screen.getByLabelText(label), { target: { value } });

    expect(screen.queryByRole('heading', { name: 'Generated Constraint YAML' })).toBeNull();
    expect(applyButton.disabled).toBe(true);
    fireEvent.click(applyButton);
    expect(ApiProxy.request).not.toHaveBeenCalled();
  });
});
