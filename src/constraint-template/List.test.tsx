// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  historyPush: vi.fn(),
  requestConstraintTemplates: vi.fn(),
  useApiList: vi.fn(),
}));

vi.mock('@kinvolk/headlamp-plugin/lib/CommonComponents', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a href="/">{children}</a>,
  SectionBox: ({ children, title }: { children: React.ReactNode; title?: string }) => (
    <section>
      {title ? <h2>{title}</h2> : null}
      {children}
    </section>
  ),
  SimpleTable: ({ data }: { data: unknown[] }) => <div>Rows: {data.length}</div>,
}));

vi.mock('react-router-dom', () => ({
  useHistory: () => ({ push: mocks.historyPush }),
  useLocation: () => ({ pathname: '/c/test-cluster/gatekeeper/constrainttemplates' }),
}));

vi.mock('../index', () => ({
  RoutingPath: {
    ConstraintTemplate: '/gatekeeper/constrainttemplates/:name',
  },
}));

vi.mock('../model', () => ({
  ConstraintTemplateClass: {
    useApiList: (...args: unknown[]) => mocks.useApiList(...args),
  },
  isNotFoundError: (error: unknown) =>
    typeof error === 'object' &&
    error !== null &&
    ((error as { status?: unknown }).status === 404 ||
      (error as { json?: { reason?: unknown } }).json?.reason === 'NotFound'),
  requestConstraintTemplates: (...args: unknown[]) => mocks.requestConstraintTemplates(...args),
}));

import ConstraintTemplateList from './List';

function getListCallbacks() {
  const latestCall = mocks.useApiList.mock.calls.at(-1);
  if (!latestCall) {
    throw new Error('ConstraintTemplateClass.useApiList was not called.');
  }

  return {
    onError: latestCall[1] as (error: unknown) => void,
    onSuccess: latestCall[0] as (items: unknown[]) => void,
  };
}

beforeEach(() => {
  mocks.historyPush.mockReset();
  mocks.requestConstraintTemplates.mockReset().mockResolvedValue({ items: [] });
  mocks.useApiList.mockReset();
});

afterEach(() => {
  cleanup();
});

describe('ConstraintTemplateList error states', () => {
  it.each([
    {
      error: Object.assign(new Error('Unauthorized'), { status: 401 }),
      title: 'Authentication required',
    },
    {
      error: Object.assign(new Error('Forbidden'), { status: 403 }),
      title: 'Access denied',
    },
    {
      error: Object.assign(new Error('Service unavailable'), { status: 503 }),
      title: 'Kubernetes API error',
    },
    {
      error: new Error('Failed to fetch: connection refused'),
      title: 'Unable to reach the Kubernetes API',
    },
  ])('renders $title for a list failure', ({ error, title }) => {
    render(<ConstraintTemplateList />);

    act(() => {
      getListCallbacks().onError(error);
    });

    expect(screen.getByText(title)).toBeInTheDocument();
    expect(screen.queryByText('Loading constraint templates...')).not.toBeInTheDocument();
    expect(screen.queryByText('Gatekeeper Not Found')).not.toBeInTheDocument();
  });

  it('preserves the Gatekeeper installation prompt for a 404 list response', () => {
    render(<ConstraintTemplateList />);

    act(() => {
      getListCallbacks().onError(Object.assign(new Error('Not Found'), { status: 404 }));
    });

    expect(screen.getByText('Gatekeeper Not Found')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Install Gatekeeper' })).toBeInTheDocument();
    expect(screen.queryByText('ConstraintTemplate API unavailable')).not.toBeInTheDocument();
  });

  it('clears a previous list error when fresh data arrives', () => {
    render(<ConstraintTemplateList />);

    act(() => {
      getListCallbacks().onError(Object.assign(new Error('Forbidden'), { status: 403 }));
    });
    expect(screen.getByText('Access denied')).toBeInTheDocument();

    act(() => {
      getListCallbacks().onSuccess([]);
    });

    expect(screen.queryByText('Access denied')).not.toBeInTheDocument();
    expect(screen.getByText('No constraint templates found.')).toBeInTheDocument();
  });
});
