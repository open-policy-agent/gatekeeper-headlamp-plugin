// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@kinvolk/headlamp-plugin/lib/CommonComponents', () => ({
  Link: ({
    children,
    params,
    routeName,
  }: {
    children: React.ReactNode;
    params: Record<string, string>;
    routeName: string;
  }) => (
    <a href={`#${routeName}`} data-params={JSON.stringify(params)} data-route-name={routeName}>
      {children}
    </a>
  ),
  Loader: ({ title }: { title: string }) => <div>{title}</div>,
  SectionBox: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  SimpleTable: ({
    columns,
    data,
  }: {
    columns: Array<{
      getter: (row: any) => React.ReactNode;
      label: string;
    }>;
    data: any[];
  }) => (
    <table>
      <thead>
        <tr>
          {columns.map(column => (
            <th key={column.label}>{column.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, rowIndex) => (
          <tr key={rowIndex}>
            {columns.map(column => (
              <td key={column.label}>{column.getter(row)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  ),
}));

vi.mock('react-router-dom', () => ({
  useHistory: () => ({ push: vi.fn() }),
  useLocation: () => ({ pathname: '/c/test-cluster/gatekeeper/violations' }),
}));

vi.mock('../index', () => ({
  RoutingPath: {
    Constraint: '/gatekeeper/constraints/:kind/:name',
    Violation: '/gatekeeper/violations/:kind/:name',
  },
}));

vi.mock('../model', async () => {
  const { useEffect } = await import('react');

  return {
    ConstraintClass: {
      useApiList(setData: (data: any[]) => void) {
        useEffect(() => {
          setData([
            {
              kind: 'K8sRequiredLabels',
              metadata: { name: 'require-team-label' },
              spec: { enforcementAction: 'deny' },
              status: {
                violations: [
                  {
                    apiVersion: 'v1',
                    kind: 'Pod',
                    message: 'team label is required',
                    name: 'restricted-pod',
                    namespace: 'team-a',
                  },
                ],
              },
            },
          ]);
        }, [setData]);
      },
    },
    requestConstraintTemplates: () => Promise.resolve([]),
  };
});

import { RoutingPath } from '../index';
import ViolationsList from './List';

afterEach(cleanup);

describe('ViolationsList', () => {
  it('renders the violating resource as text and exposes a separate constraint violations link', async () => {
    render(<ViolationsList />);

    const resourceName = await screen.findByText('team-a/restricted-pod');
    expect(resourceName.closest('a')).toBeNull();
    expect(screen.queryByRole('link', { name: 'team-a/restricted-pod' })).not.toBeInTheDocument();

    const viewViolationsLink = screen.getByRole('link', { name: 'View Violations' });
    expect(viewViolationsLink).toHaveAttribute('data-route-name', RoutingPath.Violation);
    expect(JSON.parse(viewViolationsLink.getAttribute('data-params') ?? '{}')).toEqual({
      kind: 'K8sRequiredLabels',
      name: 'require-team-label',
    });
  });
});
