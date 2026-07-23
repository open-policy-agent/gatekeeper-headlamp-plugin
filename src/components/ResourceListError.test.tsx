// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@kinvolk/headlamp-plugin/lib/CommonComponents', () => ({
  SectionBox: ({ children, title }: { children: React.ReactNode; title?: React.ReactNode }) => (
    <section>
      {title ? <h2>{title}</h2> : null}
      {children}
    </section>
  ),
}));

import ResourceListError from './ResourceListError';

afterEach(cleanup);

describe('ResourceListError', () => {
  it('explains authentication failures and preserves the API error', () => {
    const error = Object.assign(new Error('Unauthorized - token has expired'), { status: 401 });

    render(<ResourceListError error={error} resourceName="Config" sectionTitle="Config" />);

    expect(screen.getByText('Authentication required')).toBeInTheDocument();
    expect(
      screen.getByText(/sign in again or refresh your cluster credentials/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/HTTP 401: Unauthorized - token has expired/)).toBeInTheDocument();
  });

  it('explains RBAC authorization failures', () => {
    const error = Object.assign(new Error('Forbidden - cannot list syncsets'), { status: 403 });

    render(<ResourceListError error={error} resourceName="SyncSet" sectionTitle="SyncSet" />);

    expect(screen.getByText('Access denied')).toBeInTheDocument();
    expect(
      screen.getByText(/Kubernetes RBAC does not allow you to list SyncSet/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/HTTP 403: Forbidden - cannot list syncsets/)).toBeInTheDocument();
  });

  it('identifies a missing or unserved custom resource API', () => {
    const error = Object.assign(new Error('the server could not find the requested resource'), {
      status: 404,
    });

    render(
      <ResourceListError
        error={error}
        resourceName="Expansion Template"
        sectionTitle="Expansion Templates"
      />
    );

    expect(screen.getByText('Expansion Template API unavailable')).toBeInTheDocument();
    expect(
      screen.getByText(/CustomResourceDefinition may not be installed or served/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/HTTP 404: the server could not find the requested resource/)
    ).toBeInTheDocument();
  });

  it('reports Kubernetes API server failures without blaming the CRD', () => {
    const error = Object.assign(new Error('Service Unavailable - apiserver is restarting'), {
      status: 503,
    });

    render(<ResourceListError error={error} resourceName="Provider" sectionTitle="Provider" />);

    expect(screen.getByText('Kubernetes API error')).toBeInTheDocument();
    expect(screen.getByText(/returned HTTP 503 while loading Provider/i)).toBeInTheDocument();
    expect(
      screen.getByText(/HTTP 503: Service Unavailable - apiserver is restarting/)
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/CustomResourceDefinition may not be installed/i)
    ).not.toBeInTheDocument();
  });

  it('reports connection failures when no HTTP response was received', () => {
    const error = new Error('Failed to fetch: connection refused');

    render(<ResourceListError error={error} resourceName="Connection" sectionTitle="Connection" />);

    expect(screen.getByText('Unable to reach the Kubernetes API')).toBeInTheDocument();
    expect(
      screen.getByText(/failed before the Kubernetes API returned a response/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/API error: Failed to fetch: connection refused/)).toBeInTheDocument();
    expect(
      screen.queryByText(/CustomResourceDefinition may not be installed/i)
    ).not.toBeInTheDocument();
  });
});
