// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import type { KubeObject } from '@kinvolk/headlamp-plugin/lib/lib/k8s/cluster';
import { cleanup, render, screen } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Route, Router } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useResourceDetails } from '../components/ResourceDetailsState';
import { ConnectionClass } from '../model';
import ConnectionDetails from './ConnectionDetails';

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
    ViolationExport: '/gatekeeper/violation-export',
  },
}));

vi.mock('../model', () => ({
  ConnectionClass: {},
}));

const mockedUseResourceDetails = vi.mocked(useResourceDetails);

beforeEach(() => {
  mockedUseResourceDetails.mockReset();
});

afterEach(() => {
  cleanup();
});

describe('ConnectionDetails', () => {
  it.each([
    {
      label: 'canonical Violation Export',
      path: '/c/test-cluster/gatekeeper/violation-export/gatekeeper-audit/audit-export',
      route: '/c/:cluster/gatekeeper/violation-export/:namespace/:name',
    },
    {
      label: 'External Data compatibility',
      path: '/c/test-cluster/gatekeeper/externaldata/connections/gatekeeper-audit/audit-export',
      route: '/c/:cluster/gatekeeper/externaldata/connections/:namespace/:name',
    },
  ])('preserves namespace and behavior on the $label route', ({ path, route }) => {
    const connection = {
      jsonData: {
        apiVersion: 'connection.gatekeeper.sh/v1alpha1',
        kind: 'Connection',
        metadata: {
          creationTimestamp: '2026-07-27T15:00:00Z',
          name: 'audit-export',
          namespace: 'gatekeeper-audit',
        },
        spec: {
          config: {
            projectId: 'sanitized-project',
            topic: 'gatekeeper-violations',
          },
          driver: 'pubsub',
        },
        status: {
          byPod: [],
        },
      },
    } as unknown as KubeObject;
    mockedUseResourceDetails.mockReturnValue({ item: connection, error: null });

    const history = createMemoryHistory({ initialEntries: [path] });

    render(
      <Router history={history}>
        <Route path={route}>
          <ConnectionDetails />
        </Route>
      </Router>
    );

    expect(mockedUseResourceDetails).toHaveBeenCalledWith(
      ConnectionClass,
      'audit-export',
      'gatekeeper-audit'
    );
    expect(screen.getByText('Violation Export Connection')).toBeInTheDocument();
    expect(screen.getByText('gatekeeper-audit')).toBeInTheDocument();
    expect(screen.getByText('pubsub')).toBeInTheDocument();
    expect(screen.getByText('sanitized-project')).toBeInTheDocument();
    expect(screen.getByText('gatekeeper-violations')).toBeInTheDocument();

    expect(screen.getByTestId('resource-status')).toHaveAttribute('data-readiness-field', 'active');
    expect(screen.getByTestId('delete-button')).toHaveAttribute(
      'data-redirect-url',
      '/gatekeeper/violation-export'
    );
    expect(screen.getByTestId('delete-button')).toHaveAttribute('data-kind', 'Connection');
  });
});
