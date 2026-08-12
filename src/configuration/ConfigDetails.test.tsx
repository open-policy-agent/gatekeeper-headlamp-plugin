// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import type { KubeObject } from '@kinvolk/headlamp-plugin/lib/lib/k8s/cluster';
import { cleanup, render, screen, within } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Route, Router } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useResourceDetails } from '../components/ResourceDetailsState';
import { RoutingPath } from '../index';
import { ConfigClass } from '../model';
import ConfigDetails from './ConfigDetails';

vi.mock('@kinvolk/headlamp-plugin/lib/CommonComponents', () => ({
  SectionBox: ({ children, title }: { children: React.ReactNode; title?: string }) => (
    <section aria-label={title}>
      {title && <h2>{title}</h2>}
      {children}
    </section>
  ),
}));

vi.mock('../components/ResourceDeleteButton', () => ({
  default: ({ kind, redirectUrl }: { kind: string; redirectUrl: string }) => (
    <button data-kind={kind} data-redirect-url={redirectUrl}>
      Delete
    </button>
  ),
}));

vi.mock('../components/ResourceDetailsState', () => ({
  ResourceDetailsError: ({ kind, name }: { kind: string; name: string }) => (
    <div>
      Unable to load {kind} {name}
    </div>
  ),
  ResourceDetailsLoading: ({ kind }: { kind: string }) => <div>Loading {kind}</div>,
  useResourceDetails: vi.fn(),
}));

vi.mock('../index', () => ({
  RoutingPath: { Configs: '/gatekeeper/configuration/configs' },
}));

vi.mock('../model', () => ({
  ConfigClass: {},
}));

const mockedUseResourceDetails = vi.mocked(useResourceDetails);

function renderDetails(path: string) {
  const history = createMemoryHistory({ initialEntries: [path] });

  render(
    <Router history={history}>
      <Route path="/gatekeeper/configuration/configs/:namespace/:name">
        <ConfigDetails />
      </Route>
    </Router>
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ConfigDetails', () => {
  it('loads the namespaced Config from the route and reports observed status without claiming readiness', () => {
    const resource = {
      jsonData: {
        apiVersion: 'config.gatekeeper.sh/v1alpha1',
        kind: 'Config',
        metadata: {
          creationTimestamp: '2026-07-28T00:00:00Z',
          generation: 3,
          name: 'audit-config',
          namespace: 'tenant-gatekeeper',
        },
        spec: {
          match: [{ excludedNamespaces: ['kube-system'] }],
          sync: {
            syncOnly: [{ group: '', kind: 'Pod', version: 'v1' }],
          },
        },
        status: {
          byPod: [{ id: 'gatekeeper-audit-0', observedGeneration: 3 }],
        },
      },
    } as unknown as KubeObject;
    mockedUseResourceDetails.mockReturnValue({ item: resource, error: null });

    renderDetails('/gatekeeper/configuration/configs/tenant-gatekeeper/audit-config');

    expect(mockedUseResourceDetails).toHaveBeenCalledWith(
      ConfigClass,
      'audit-config',
      'tenant-gatekeeper'
    );
    expect(screen.getByRole('heading', { name: 'audit-config', level: 4 })).toBeInTheDocument();

    const namespaceRow = screen.getByText('Namespace').closest('tr');
    expect(namespaceRow).not.toBeNull();
    expect(within(namespaceRow!).getByText('tenant-gatekeeper')).toBeInTheDocument();
    expect(screen.getByText('core/v1 Pod')).toBeInTheDocument();
    expect(
      screen.getByText(JSON.stringify({ excludedNamespaces: ['kube-system'] }))
    ).toBeInTheDocument();

    expect(screen.getByText('Current generation observed')).toBeInTheDocument();
    expect(screen.getByText(/active readiness cannot be confirmed/i)).toBeInTheDocument();
    expect(screen.queryByText('Active')).not.toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Delete' })).toHaveAttribute(
      'data-redirect-url',
      RoutingPath.Configs
    );
  });
});
