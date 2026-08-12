// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import type { KubeObject } from '@kinvolk/headlamp-plugin/lib/lib/k8s/cluster';
import { cleanup, render, screen } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Route, Router } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useResourceDetails } from '../components/ResourceDetailsState';
import { ProviderClass } from '../model';
import ProviderDetails from './ProviderDetails';

vi.mock('@kinvolk/headlamp-plugin/lib/CommonComponents', () => ({
  SectionBox: ({ children, title }: { children: React.ReactNode; title?: string }) => (
    <section>
      {title ? <h2>{title}</h2> : null}
      {children}
    </section>
  ),
}));

vi.mock('../components/GatekeeperResourceStatus', () => ({
  GatekeeperResourceStatus: ({
    readinessField,
    resource,
  }: {
    readinessField?: string;
    resource: any;
  }) => (
    <div data-readiness-field={readinessField} data-testid="resource-status">
      {resource.metadata.name}
    </div>
  ),
}));

vi.mock('../components/ResourceDeleteButton', () => ({
  default: ({ kind, redirectUrl }: { kind: string; redirectUrl: string }) => (
    <div data-kind={kind} data-redirect-url={redirectUrl} data-testid="delete-button" />
  ),
}));

vi.mock('../components/ResourceDetailsState', () => ({
  ResourceDetailsError: ({ kind, name }: { kind: string; name: string }) => (
    <div>{`${kind} ${name} error`}</div>
  ),
  ResourceDetailsLoading: ({ kind }: { kind: string }) => <div>{`Loading ${kind}`}</div>,
  useResourceDetails: vi.fn(),
}));

vi.mock('../index', () => ({
  RoutingPath: {
    Providers: '/gatekeeper/externaldata/providers',
  },
}));

vi.mock('../model', () => ({
  ProviderClass: {},
}));

const mockedUseResourceDetails = vi.mocked(useResourceDetails);

beforeEach(() => {
  mockedUseResourceDetails.mockReset();
});

afterEach(() => {
  cleanup();
});

describe('ProviderDetails', () => {
  it('loads a cluster-scoped provider by name and renders its external-data settings', () => {
    const provider = {
      jsonData: {
        apiVersion: 'externaldata.gatekeeper.sh/v1beta1',
        kind: 'Provider',
        metadata: {
          creationTimestamp: '2026-07-27T14:00:00Z',
          name: 'image-verifier',
        },
        spec: {
          caBundle: 'sanitized-ca-bundle',
          timeout: 5,
          url: 'https://provider.example.test/verify',
        },
        status: {
          byPod: [],
        },
      },
    } as unknown as KubeObject;
    mockedUseResourceDetails.mockReturnValue({ item: provider, error: null });

    const history = createMemoryHistory({
      initialEntries: ['/c/test-cluster/gatekeeper/externaldata/providers/image-verifier'],
    });

    render(
      <Router history={history}>
        <Route path="/c/:cluster/gatekeeper/externaldata/providers/:name">
          <ProviderDetails />
        </Route>
      </Router>
    );

    expect(mockedUseResourceDetails).toHaveBeenCalledWith(ProviderClass, 'image-verifier');
    expect(screen.getByText('External Data Provider')).toBeInTheDocument();
    expect(screen.getByText('Cluster Scoped')).toBeInTheDocument();
    expect(screen.getByText('https://provider.example.test/verify')).toBeInTheDocument();
    expect(screen.getByText('5s')).toBeInTheDocument();
    expect(screen.getByText('sanitized-ca-bundle')).toBeInTheDocument();

    expect(screen.getByTestId('resource-status')).toHaveAttribute('data-readiness-field', 'active');
    expect(screen.getByTestId('delete-button')).toHaveAttribute(
      'data-redirect-url',
      '/gatekeeper/externaldata/providers'
    );
    expect(screen.getByTestId('delete-button')).toHaveAttribute('data-kind', 'Provider');
  });
});
