// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import type { KubeObject } from '@kinvolk/headlamp-plugin/lib/lib/k8s/cluster';
import { cleanup, render, screen } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Route, Router } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useResourceDetails } from '../components/ResourceDetailsState';
import { RoutingPath } from '../index';
import { SyncSetClass } from '../model';
import SyncSetDetails from './SyncSetDetails';

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
  RoutingPath: { SyncSets: '/gatekeeper/configuration/syncsets' },
}));

vi.mock('../model', () => ({
  SyncSetClass: {},
}));

const mockedUseResourceDetails = vi.mocked(useResourceDetails);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('SyncSetDetails', () => {
  it('loads the cluster-scoped SyncSet and explicitly avoids claiming per-resource readiness', () => {
    const resource = {
      jsonData: {
        apiVersion: 'syncset.gatekeeper.sh/v1alpha1',
        kind: 'SyncSet',
        metadata: {
          creationTimestamp: '2026-07-28T00:00:00Z',
          name: 'sync-workloads',
        },
        spec: {
          gvks: [
            { group: '', kind: 'Pod', version: 'v1' },
            { group: 'apps', kind: 'Deployment', version: 'v1' },
          ],
        },
        status: {
          active: true,
        },
      },
    } as unknown as KubeObject;
    mockedUseResourceDetails.mockReturnValue({ item: resource, error: null });

    const history = createMemoryHistory({
      initialEntries: ['/gatekeeper/configuration/syncsets/sync-workloads'],
    });
    render(
      <Router history={history}>
        <Route path="/gatekeeper/configuration/syncsets/:name">
          <SyncSetDetails />
        </Route>
      </Router>
    );

    expect(mockedUseResourceDetails).toHaveBeenCalledWith(SyncSetClass, 'sync-workloads');
    expect(screen.getByRole('heading', { name: 'sync-workloads', level: 4 })).toBeInTheDocument();
    expect(screen.getByText('Cluster Scoped')).toBeInTheDocument();
    expect(screen.getByText('core/v1 Pod')).toBeInTheDocument();
    expect(screen.getByText('apps/v1 Deployment')).toBeInTheDocument();

    expect(screen.getByText('Per-resource status unavailable')).toBeInTheDocument();
    expect(
      screen.getByText(/does not prove that Gatekeeper has synchronized it/i)
    ).toBeInTheDocument();
    expect(screen.queryByText('Active')).not.toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Delete' })).toHaveAttribute(
      'data-redirect-url',
      RoutingPath.SyncSets
    );
  });
});
