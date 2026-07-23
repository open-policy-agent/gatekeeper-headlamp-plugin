// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useApiGet: vi.fn(),
}));

vi.mock('@kinvolk/headlamp-plugin/lib/lib/k8s', () => ({
  useCluster: () => null,
}));

vi.mock('@kinvolk/headlamp-plugin/lib/CommonComponents', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SectionBox: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SimpleTable: () => null,
}));

vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useParams: () => ({ kind: 'K8sRequiredLabels', name: 'shared-constraint' }),
  };
});

vi.mock('../index', () => ({
  RouteName: {
    Constraint: 'Constraint Details',
  },
}));

vi.mock('../model', () => ({
  ConstraintClass: {
    useApiGet: (...args: unknown[]) => mocks.useApiGet(...args),
  },
}));

import ViolationsDetails from './Details';

beforeEach(() => {
  mocks.useApiGet.mockReset().mockReturnValue({
    constraintPlural: null,
    error: Object.assign(new Error('Service unavailable'), { status: 503 }),
    loading: false,
  });
});

afterEach(() => {
  cleanup();
});

describe('ViolationsDetails', () => {
  it('passes the route Kubernetes Kind to the constraint lookup and renders load errors', () => {
    render(<ViolationsDetails />);

    expect(mocks.useApiGet).toHaveBeenCalledWith(
      expect.any(Function),
      'shared-constraint',
      'K8sRequiredLabels'
    );
    expect(screen.getByText('Unable to load K8sRequiredLabels Constraint')).toBeTruthy();
    expect(screen.getByText('Service unavailable')).toBeTruthy();
  });
});
