// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  apiRequest: vi.fn(),
  historyReplace: vi.fn(),
  useApiGet: vi.fn(),
}));

vi.mock('@kinvolk/headlamp-plugin/lib/ApiProxy', () => ({
  request: mocks.apiRequest,
}));

vi.mock('@kinvolk/headlamp-plugin/lib', () => ({
  K8s: { useCluster: () => null,
  }
}));

vi.mock('@kinvolk/headlamp-plugin/lib/CommonComponents', () => ({
  SectionBox: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  ),
}));

vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useHistory: () => ({
      location: { pathname: '/gatekeeper/constraints/K8sRequiredLabels/shared-constraint' },
      replace: mocks.historyReplace,
    }),
    useParams: () => ({ kind: 'K8sRequiredLabels', name: 'shared-constraint' }),
  };
});

vi.mock('../index', () => ({
  RoutingPath: {
    Constraints: '/gatekeeper/constraints',
  },
}));

vi.mock('../model', () => ({
  ConstraintClass: {
    useApiGet: (...args: unknown[]) => mocks.useApiGet(...args),
  },
}));

import ConstraintDetails from './Details';

const constraint = {
  apiVersion: 'constraints.gatekeeper.sh/v1beta1',
  kind: 'K8sRequiredLabels',
  metadata: {
    creationTimestamp: '2026-07-23T00:00:00Z',
    name: 'shared-constraint',
  },
  spec: {
    enforcementAction: 'deny',
  },
  status: {
    totalViolations: 0,
  },
};

beforeEach(() => {
  mocks.apiRequest.mockReset().mockResolvedValue(undefined);
  mocks.historyReplace.mockReset();
  mocks.useApiGet.mockReset().mockImplementation((setData: (data: any) => void) => {
    React.useEffect(() => {
      setData(constraint);
    }, [setData]);

    return {
      constraintPlural: 'k8srequiredlabels',
      error: null,
      loading: false,
    };
  });
});

afterEach(() => {
  cleanup();
});

describe('ConstraintDetails', () => {
  it('uses the resolved REST plural for the loaded Kind when deleting', async () => {
    const user = userEvent.setup();

    render(<ConstraintDetails />);

    expect(await screen.findByRole('heading', { name: 'shared-constraint' })).toBeTruthy();
    expect(mocks.useApiGet).toHaveBeenCalledWith(
      expect.any(Function),
      'shared-constraint',
      'K8sRequiredLabels'
    );

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));

    await waitFor(() =>
      expect(mocks.apiRequest).toHaveBeenCalledWith(
        '/apis/constraints.gatekeeper.sh/v1beta1/k8srequiredlabels/shared-constraint',
        { method: 'DELETE' }
      )
    );
  });

  it('renders non-404 load failures instead of remaining in a loading state', () => {
    mocks.useApiGet.mockReturnValue({
      constraintPlural: null,
      error: Object.assign(new Error('Forbidden'), { status: 403 }),
      loading: false,
    });

    render(<ConstraintDetails />);

    expect(screen.getByText('Access denied')).toBeTruthy();
    expect(screen.getByText(/Check your RBAC permissions/)).toBeTruthy();
  });
});
