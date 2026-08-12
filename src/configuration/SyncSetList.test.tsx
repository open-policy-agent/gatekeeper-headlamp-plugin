// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

vi.mock('@mui/material', async importOriginal => {
  const actual = await importOriginal<typeof import('@mui/material')>();

  return {
    ...actual,
    FormControl: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    InputLabel: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    MenuItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
      <option value={value}>{children}</option>
    ),
    Select: ({
      children,
      id,
      label,
      onChange,
      value,
    }: {
      children: React.ReactNode;
      id?: string;
      label?: string;
      onChange: React.ChangeEventHandler<HTMLSelectElement>;
      value: string;
    }) => (
      <select id={id} aria-label={label} value={value} onChange={onChange}>
        {children}
      </select>
    ),
  };
});

vi.mock('../index', () => ({
  RouteName: { SyncSet: 'SyncSet Details' },
}));

vi.mock('../model', () => ({
  SyncSetClass: {
    useApiList: (onList: (items: any[]) => void, onError: (error: Error) => void) => {
      mocks.useApiList(onList, onError);
      mocks.onList = onList;
      mocks.onError = onError;
    },
  },
}));

import { RouteName } from '../index';
import SyncSetList from './SyncSetList';

const syncSets = [
  {
    metadata: {
      creationTimestamp: '2026-07-28T00:00:00Z',
      name: 'sync-pods',
    },
    jsonData: {
      spec: {
        gvks: [{ group: '', kind: 'Pod', version: 'v1' }],
      },
    },
  },
  {
    metadata: {
      creationTimestamp: '2026-07-28T00:00:00Z',
      name: 'sync-namespaces',
    },
    jsonData: {
      spec: {
        gvks: [{ group: '', kind: 'Namespace', version: 'v1' }],
      },
    },
  },
];

beforeEach(() => {
  mocks.onList = null;
  mocks.onError = null;
  mocks.useApiList.mockReset();
});

afterEach(() => {
  cleanup();
});

describe('SyncSetList', () => {
  it('links cluster-scoped SyncSets and filters by synced Kind', async () => {
    const user = userEvent.setup();
    render(<SyncSetList />);

    act(() => {
      mocks.onList?.(syncSets);
    });

    const podLink = screen.getByRole('link', { name: 'sync-pods' });
    expect(podLink).toHaveAttribute('data-route-name', RouteName.SyncSet);
    expect(JSON.parse(podLink.getAttribute('data-params') ?? '{}')).toEqual({
      name: 'sync-pods',
    });
    expect(screen.getByText('core/v1 Pod')).toBeInTheDocument();
    expect(screen.getByText('core/v1 Namespace')).toBeInTheDocument();

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Filter by Synced Kind' }),
      'Pod'
    );

    expect(screen.getByRole('link', { name: 'sync-pods' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'sync-namespaces' })).not.toBeInTheDocument();
  });

  it('uses ResourceListError when the optional SyncSet CRD is not served', () => {
    render(<SyncSetList />);

    act(() => {
      mocks.onError?.(
        Object.assign(new Error('the server could not find syncsets'), { status: 404 })
      );
    });

    expect(screen.getByText('SyncSet API unavailable')).toBeInTheDocument();
    expect(
      screen.getByText(/CustomResourceDefinition may not be installed or served/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/HTTP 404: the server could not find syncsets/i)).toBeInTheDocument();
    expect(screen.queryByText('Loading SyncSet...')).not.toBeInTheDocument();
  });
});
