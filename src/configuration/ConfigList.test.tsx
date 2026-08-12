// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  onList: null as null | ((items: any[]) => void),
  onError: null as null | ((error: Error) => void),
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
    <a href={`#${routeName}`} data-params={JSON.stringify(params)} data-route-name={routeName}>
      {children}
    </a>
  ),
  SectionBox: ({ children, title }: { children: React.ReactNode; title?: string }) => (
    <section>
      {title && <h2>{title}</h2>}
      {children}
    </section>
  ),
  SimpleTable: ({
    columns,
    data,
  }: {
    columns: Array<{ getter: (item: any) => React.ReactNode; label: string }>;
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
        {data.map((item, rowIndex) => (
          <tr key={item.metadata?.name ?? rowIndex}>
            {columns.map(column => (
              <td key={column.label}>{column.getter(item)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  ),
}));

vi.mock('../index', () => ({
  RouteName: { Config: 'Config Details' },
}));

vi.mock('../model', () => ({
  ConfigClass: {
    useApiList: (onList: (items: any[]) => void, onError: (error: Error) => void) => {
      mocks.useApiList(onList, onError);
      mocks.onList = onList;
      mocks.onError = onError;
    },
  },
}));

import { RouteName } from '../index';
import ConfigList from './ConfigList';

beforeEach(() => {
  mocks.onList = null;
  mocks.onError = null;
  mocks.useApiList.mockReset();
});

afterEach(() => {
  cleanup();
});

describe('ConfigList', () => {
  it('preserves the Config namespace in the detail link', () => {
    render(<ConfigList />);

    act(() => {
      mocks.onList?.([
        {
          metadata: {
            creationTimestamp: '2026-07-28T00:00:00Z',
            name: 'audit-config',
            namespace: 'tenant-gatekeeper',
          },
          jsonData: {
            spec: {
              match: [{ excludedNamespaces: ['kube-system'] }],
              sync: { syncOnly: [{ group: '', kind: 'Pod', version: 'v1' }] },
            },
          },
        },
      ]);
    });

    const link = screen.getByRole('link', { name: 'audit-config' });
    expect(link).toHaveAttribute('data-route-name', RouteName.Config);
    expect(JSON.parse(link.getAttribute('data-params') ?? '{}')).toEqual({
      name: 'audit-config',
      namespace: 'tenant-gatekeeper',
    });

    const row = link.closest('tr');
    expect(row).not.toBeNull();
    expect(within(row!).getByText('tenant-gatekeeper')).toBeInTheDocument();
    expect(within(row!).getByText('1 resource types')).toBeInTheDocument();
    expect(within(row!).getByText('1')).toBeInTheDocument();
  });

  it('uses ResourceListError when the optional Config CRD is not served', () => {
    render(<ConfigList />);

    act(() => {
      mocks.onError?.(
        Object.assign(new Error('the server could not find configs'), { status: 404 })
      );
    });

    expect(screen.getByText('Config API unavailable')).toBeInTheDocument();
    expect(
      screen.getByText(/CustomResourceDefinition may not be installed or served/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/HTTP 404: the server could not find configs/i)).toBeInTheDocument();
    expect(screen.queryByText('Loading Config...')).not.toBeInTheDocument();
  });

  it('clears a transient API error when a later list response succeeds', () => {
    render(<ConfigList />);

    act(() => {
      mocks.onError?.(Object.assign(new Error('Forbidden'), { status: 403 }));
    });
    expect(screen.getByText('Access denied')).toBeInTheDocument();

    act(() => {
      mocks.onList?.([]);
    });
    expect(screen.queryByText('Access denied')).not.toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(1);
  });
});
