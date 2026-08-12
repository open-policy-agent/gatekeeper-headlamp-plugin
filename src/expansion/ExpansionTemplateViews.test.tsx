// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  deleteProps: vi.fn(),
  detailsErrorProps: vi.fn(),
  detailsResult: {
    current: { item: null, error: null } as { item: any; error: any },
  },
  list: vi.fn(),
  routeName: { current: 'expand-workload' },
  statusProps: vi.fn(),
  useResourceDetails: vi.fn(),
}));

const resourceClasses = vi.hoisted(() => ({
  ExpansionTemplateClass: { id: 'ExpansionTemplateClass', useApiList: mocks.list },
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
      {title ? <h2>{title}</h2> : null}
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
      <tbody>
        {data.map((item, index) => (
          <tr key={item.metadata?.name ?? index}>
            {columns.map(column => (
              <td key={column.label}>{column.getter(item)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  ),
}));

vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useParams: () => ({ name: mocks.routeName.current }),
  };
});

vi.mock('../index', () => ({
  RouteName: {
    ExpansionTemplate: 'ExpansionTemplate Details',
  },
  RoutingPath: {
    ExpansionTemplates: '/gatekeeper/expansion/expansiontemplates',
  },
}));

vi.mock('../model', () => resourceClasses);

vi.mock('../components/ResourceDetailsState', () => ({
  ResourceDetailsError: (props: { error: Error; kind: string; name: string }) => {
    mocks.detailsErrorProps(props);
    return (
      <div>
        <h2>{props.kind} not found</h2>
        <span>{props.name}</span>
      </div>
    );
  },
  ResourceDetailsLoading: ({ kind }: { kind: string }) => <div>Loading {kind} details...</div>,
  useResourceDetails: (...args: unknown[]) => {
    mocks.useResourceDetails(...args);
    return mocks.detailsResult.current;
  },
}));

vi.mock('../components/ResourceDeleteButton', () => ({
  default: (props: unknown) => {
    mocks.deleteProps(props);
    return <button>Delete resource</button>;
  },
}));

vi.mock('../components/GatekeeperResourceStatus', () => ({
  GatekeeperResourceStatus: (props: unknown) => {
    mocks.statusProps(props);
    return <div data-testid="resource-status" />;
  },
}));

import { RouteName, RoutingPath } from '../index';
import { ExpansionTemplateClass } from '../model';
import ExpansionTemplateDetails from './ExpansionTemplateDetails';
import ExpansionTemplateList from './ExpansionTemplateList';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.detailsResult.current = { item: null, error: null };
  mocks.routeName.current = 'expand-workload';
});

afterEach(() => {
  cleanup();
});

describe('ExpansionTemplateList', () => {
  it('uses ExpansionTemplateClass and constructs a name-only detail link', () => {
    render(<ExpansionTemplateList hideTitle />);

    expect(mocks.list).toHaveBeenCalledTimes(1);
    const onItems = mocks.list.mock.calls[0][0] as (items: any[]) => void;
    act(() =>
      onItems([
        {
          jsonData: { spec: {} },
          metadata: {
            creationTimestamp: '2026-07-28T00:00:00Z',
            name: 'expand-workload',
          },
        },
      ])
    );

    const link = screen.getByRole('link', { name: 'expand-workload' });
    expect(link).toHaveAttribute('data-route-name', RouteName.ExpansionTemplate);
    expect(JSON.parse(link.getAttribute('data-params') ?? '{}')).toEqual({
      name: 'expand-workload',
    });
  });

  it('presents a missing optional CRD instead of an empty list', () => {
    render(<ExpansionTemplateList />);

    const onError = mocks.list.mock.calls[0][1] as (error: Error) => void;
    act(() => onError(Object.assign(new Error('not served'), { status: 404 })));

    expect(screen.getByText('Expansion Templates API unavailable')).toBeInTheDocument();
    expect(
      screen.getByText(/CustomResourceDefinition may not be installed or served by this cluster/)
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});

describe('ExpansionTemplateDetails', () => {
  it('resolves the routed name through ExpansionTemplateClass and exposes loading/not-found states', () => {
    render(<ExpansionTemplateDetails />);

    expect(mocks.useResourceDetails).toHaveBeenLastCalledWith(
      ExpansionTemplateClass,
      'expand-workload'
    );
    expect(screen.getByText('Loading Expansion Template details...')).toBeInTheDocument();

    cleanup();
    const missingError = Object.assign(new Error('missing'), { status: 404 });
    mocks.detailsResult.current = { item: null, error: missingError };
    render(<ExpansionTemplateDetails />);

    expect(screen.getByText('ExpansionTemplate not found')).toBeInTheDocument();
    expect(mocks.detailsErrorProps).toHaveBeenLastCalledWith({
      error: missingError,
      kind: 'ExpansionTemplate',
      name: 'expand-workload',
    });
    expect(screen.getByText(/expand-workload/)).toBeInTheDocument();
  });

  it('wires the loaded resource into deletion and status rendering', () => {
    const data = {
      apiVersion: 'expansion.gatekeeper.sh/v1alpha1',
      kind: 'ExpansionTemplate',
      metadata: {
        creationTimestamp: '2026-07-28T00:00:00Z',
        name: 'expand-workload',
      },
      spec: {},
    };
    const item = { jsonData: data };
    mocks.detailsResult.current = { item, error: null };

    render(<ExpansionTemplateDetails />);

    expect(mocks.useResourceDetails).toHaveBeenCalledWith(
      ExpansionTemplateClass,
      'expand-workload'
    );
    expect(mocks.deleteProps).toHaveBeenCalledWith({
      kind: 'ExpansionTemplate',
      redirectUrl: RoutingPath.ExpansionTemplates,
      resource: item,
    });
    expect(mocks.statusProps).toHaveBeenCalledWith({ resource: data });
  });
});
