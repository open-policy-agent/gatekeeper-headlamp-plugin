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
    <a data-params={JSON.stringify(params)} data-route-name={routeName} href="#provider">
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
    Provider: 'Provider Details',
  },
}));

vi.mock('../model', () => ({
  ProviderClass: {
    useApiList: (...args: unknown[]) => mocks.useApiList(...args),
  },
}));

import { RouteName } from '../index';
import ProviderList from './ProviderList';

function getListCallbacks() {
  const latestCall = mocks.useApiList.mock.calls.at(-1);
  if (!latestCall) {
    throw new Error('ProviderClass.useApiList was not called.');
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

describe('ProviderList', () => {
  it('renders provider data and links names to the canonical provider detail route', () => {
    render(<ProviderList />);

    expect(screen.getByText('Loading Provider...')).toBeInTheDocument();

    act(() => {
      getListCallbacks().onSuccess([
        {
          metadata: {
            creationTimestamp: '2026-07-27T12:00:00Z',
            name: 'image-verifier',
          },
          jsonData: {
            spec: {
              timeout: 7,
              url: 'https://provider.example.test/verify',
            },
          },
        },
      ]);
    });

    const providerLink = screen.getByRole('link', { name: 'image-verifier' });
    expect(providerLink).toHaveAttribute('data-route-name', RouteName.Provider);
    expect(JSON.parse(providerLink.getAttribute('data-params') ?? '{}')).toEqual({
      name: 'image-verifier',
    });
    expect(screen.getByText('https://provider.example.test/verify')).toBeInTheDocument();
    expect(screen.getByText('7s')).toBeInTheDocument();
    expect(screen.getByText('2026-07-27T12:00:00Z')).toBeInTheDocument();
  });

  it('reports a missing optional Provider CRD instead of leaving the view loading', () => {
    render(<ProviderList hideTitle />);

    act(() => {
      getListCallbacks().onError(
        Object.assign(new Error('the server could not find the requested resource'), {
          status: 404,
        })
      );
    });

    expect(screen.getByText('Provider API unavailable')).toBeInTheDocument();
    expect(
      screen.getByText(/CustomResourceDefinition may not be installed or served/i)
    ).toBeInTheDocument();
    expect(screen.queryByText('Loading Provider...')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Provider' })).not.toBeInTheDocument();
  });
});
