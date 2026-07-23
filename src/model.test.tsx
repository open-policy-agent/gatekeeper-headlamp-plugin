// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import React, { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const apiMocks = vi.hoisted(() => ({
  request: vi.fn(),
}));

vi.mock('@kinvolk/headlamp-plugin/lib/ApiProxy', () => ({
  request: apiMocks.request,
}));

vi.mock('@kinvolk/headlamp-plugin/lib/lib/k8s/crd', () => ({
  makeCustomResourceClass: vi.fn(() => ({})),
}));

import { ConstraintClass } from './model';

function constraintTemplate(kind: string, plural: string) {
  return {
    spec: {
      crd: {
        spec: {
          names: { kind, plural },
        },
      },
    },
  };
}

const templatesResponse = {
  items: [
    constraintTemplate('K8sAllowedRepos', 'k8sallowedrepos'),
    constraintTemplate('K8sRequiredLabels', 'k8srequiredlabels'),
  ],
};

function ConstraintProbe({ kind, name }: { kind?: string; name: string }) {
  const [constraint, setConstraint] = useState<any>(null);
  const { constraintPlural, error, loading } = ConstraintClass.useApiGet(setConstraint, name, kind);

  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="plural">{constraintPlural || ''}</span>
      <span data-testid="kind">{constraint?.kind || ''}</span>
      <span data-testid="error-status">{error?.status || ''}</span>
      <span data-testid="error-message">{error?.message || ''}</span>
    </div>
  );
}

beforeEach(() => {
  apiMocks.request.mockReset();
});

afterEach(() => {
  cleanup();
});

describe('ConstraintClass.useApiGet', () => {
  it('resolves the route Kubernetes Kind to its REST plural before fetching', async () => {
    apiMocks.request.mockImplementation(async (url: string) => {
      if (url === '/apis/templates.gatekeeper.sh/v1/constrainttemplates') {
        return templatesResponse;
      }
      if (url === '/apis/constraints.gatekeeper.sh/v1beta1/k8srequiredlabels/shared-constraint') {
        return {
          kind: 'K8sRequiredLabels',
          metadata: { name: 'shared-constraint' },
        };
      }
      if (url === '/apis/constraints.gatekeeper.sh/v1beta1/k8sallowedrepos/shared-constraint') {
        return {
          kind: 'K8sAllowedRepos',
          metadata: { name: 'shared-constraint' },
        };
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<ConstraintProbe kind="K8sRequiredLabels" name="shared-constraint" />);

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('plural')).toHaveTextContent('k8srequiredlabels');
    expect(screen.getByTestId('kind')).toHaveTextContent('K8sRequiredLabels');
    expect(apiMocks.request).toHaveBeenCalledWith(
      '/apis/constraints.gatekeeper.sh/v1beta1/k8srequiredlabels/shared-constraint'
    );
    expect(apiMocks.request).not.toHaveBeenCalledWith(
      '/apis/constraints.gatekeeper.sh/v1beta1/k8sallowedrepos/shared-constraint'
    );
  });

  it('does not fall back to another type when the explicit kind returns 404', async () => {
    apiMocks.request.mockImplementation(async (url: string) => {
      if (url === '/apis/templates.gatekeeper.sh/v1/constrainttemplates') {
        return templatesResponse;
      }
      if (url === '/apis/constraints.gatekeeper.sh/v1beta1/k8srequiredlabels/shared-constraint') {
        throw Object.assign(new Error('Not Found'), { status: 404 });
      }
      if (url === '/apis/constraints.gatekeeper.sh/v1beta1/k8sallowedrepos/shared-constraint') {
        return {
          kind: 'K8sAllowedRepos',
          metadata: { name: 'shared-constraint' },
        };
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<ConstraintProbe kind="K8sRequiredLabels" name="shared-constraint" />);

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('kind')).toBeEmptyDOMElement();
    expect(screen.getByTestId('error-status')).toHaveTextContent('404');
    expect(apiMocks.request).not.toHaveBeenCalledWith(
      '/apis/constraints.gatekeeper.sh/v1beta1/k8sallowedrepos/shared-constraint'
    );
  });

  it.each([
    Object.assign(new Error('Forbidden'), { status: 403 }),
    Object.assign(new Error('Service Unavailable'), { status: 503 }),
    new Error('Network unavailable'),
  ])('surfaces non-404 failures without probing another type: %s', async requestError => {
    apiMocks.request.mockImplementation(async (url: string) => {
      if (url === '/apis/templates.gatekeeper.sh/v1/constrainttemplates') {
        return templatesResponse;
      }
      if (url === '/apis/constraints.gatekeeper.sh/v1beta1/k8srequiredlabels/shared-constraint') {
        throw requestError;
      }
      if (url === '/apis/constraints.gatekeeper.sh/v1beta1/k8sallowedrepos/shared-constraint') {
        return {
          kind: 'K8sAllowedRepos',
          metadata: { name: 'shared-constraint' },
        };
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<ConstraintProbe kind="K8sRequiredLabels" name="shared-constraint" />);

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('kind')).toBeEmptyDOMElement();
    expect(screen.getByTestId('error-message')).toHaveTextContent(requestError.message);
    expect(apiMocks.request).not.toHaveBeenCalledWith(
      '/apis/constraints.gatekeeper.sh/v1beta1/k8sallowedrepos/shared-constraint'
    );
  });
});
