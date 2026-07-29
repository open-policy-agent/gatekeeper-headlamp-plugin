// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useApiList: vi.fn(),
}));

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
    <a data-params={JSON.stringify(params)} data-route-name={routeName} href="#connection">
      {children}
    </a>
  ),
  SectionBox: ({ children, title }: { children: React.ReactNode; title?: string }) => (
    <section>
      {title ? <h2>{title}</h2> : null}
      {children}
    </section>
  ),
  SimpleTable: ({
    columns,
    data,
  }: {
    columns: Array<{ getter: (row: any) => React.ReactNode; label: string }>;
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

vi.mock('../index', () => ({
  RouteName: {
    Connection: 'Violation Export Connection Details',
    LegacyConnection: 'Violation Export Connection Details (Legacy URL)',
  },
}));

vi.mock('../model', () => ({
  ConnectionClass: {
    useApiList: (...args: unknown[]) => mocks.useApiList(...args),
  },
}));

import { RouteName } from '../index';
import ConnectionList from './ConnectionList';

function getListCallbacks() {
  const latestCall = mocks.useApiList.mock.calls.at(-1);
  if (!latestCall) {
    throw new Error('ConnectionClass.useApiList was not called.');
  }

  return {
    onError: latestCall[1] as (error: Error) => void,
    onSuccess: latestCall[0] as (items: any[]) => void,
  };
}

beforeEach(() => {
  mocks.useApiList.mockReset();
});

afterEach(() => {
  cleanup();
});

describe('ConnectionList', () => {
  it('preserves the namespace and uses the canonical Violation Export detail route', () => {
    render(<ConnectionList />);

    act(() => {
      getListCallbacks().onSuccess([
        {
          metadata: {
            creationTimestamp: '2026-07-27T13:00:00Z',
            name: 'audit-export',
            namespace: 'gatekeeper-audit',
          },
          jsonData: {
            spec: {
              driver: 'pubsub',
            },
          },
        },
      ]);
    });

    const connectionLink = screen.getByRole('link', { name: 'audit-export' });
    expect(connectionLink).toHaveAttribute('data-route-name', RouteName.Connection);
    expect(connectionLink).not.toHaveAttribute('data-route-name', RouteName.LegacyConnection);
    expect(JSON.parse(connectionLink.getAttribute('data-params') ?? '{}')).toEqual({
      name: 'audit-export',
      namespace: 'gatekeeper-audit',
    });
    expect(screen.getByText('gatekeeper-audit')).toBeInTheDocument();
    expect(screen.getByText('2026-07-27T13:00:00Z')).toBeInTheDocument();
  });

  it('reports a missing optional Connection CRD instead of leaving the view loading', () => {
    render(<ConnectionList hideTitle />);

    act(() => {
      getListCallbacks().onError(
        Object.assign(new Error('the server could not find the requested resource'), {
          status: 404,
        })
      );
    });

    expect(screen.getByText('Connection API unavailable')).toBeInTheDocument();
    expect(
      screen.getByText(/CustomResourceDefinition may not be installed or served/i)
    ).toBeInTheDocument();
    expect(screen.queryByText('Loading Connection...')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Connection' })).not.toBeInTheDocument();
  });
});
