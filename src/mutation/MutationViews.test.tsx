// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  assignList: vi.fn(),
  assignMetadataList: vi.fn(),
  assignImageList: vi.fn(),
  modifySetList: vi.fn(),
  deleteProps: vi.fn(),
  detailsErrorProps: vi.fn(),
  detailsResult: {
    current: { item: null, error: null } as { item: any; error: any },
  },
  routeName: { current: 'example-mutation' },
  statusProps: vi.fn(),
  useResourceDetails: vi.fn(),
}));

const resourceClasses = vi.hoisted(() => ({
  AssignClass: { id: 'AssignClass', useApiList: mocks.assignList },
  AssignMetadataClass: { id: 'AssignMetadataClass', useApiList: mocks.assignMetadataList },
  AssignImageClass: { id: 'AssignImageClass', useApiList: mocks.assignImageList },
  ModifySetClass: { id: 'ModifySetClass', useApiList: mocks.modifySetList },
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
      <thead>
        <tr>
          {columns.map(column => (
            <th key={column.label}>{column.label}</th>
          ))}
        </tr>
      </thead>
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
    Assign: 'Assign Details',
    AssignImage: 'AssignImage Details',
    AssignMetadata: 'AssignMetadata Details',
    ModifySet: 'ModifySet Details',
  },
  RoutingPath: {
    AssignImages: '/gatekeeper/mutations/assignimages',
    AssignMetadatas: '/gatekeeper/mutations/assignmetadatas',
    Assigns: '/gatekeeper/mutations/assigns',
    ModifySets: '/gatekeeper/mutations/modifysets',
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
import { AssignClass, AssignImageClass, AssignMetadataClass, ModifySetClass } from '../model';
import AssignDetails from './AssignDetails';
import AssignImageDetails from './AssignImageDetails';
import AssignImageList from './AssignImageList';
import AssignList from './AssignList';
import AssignMetadataDetails from './AssignMetadataDetails';
import AssignMetadataList from './AssignMetadataList';
import ModifySetDetails from './ModifySetDetails';
import ModifySetList from './ModifySetList';

const cases = [
  {
    Detail: AssignDetails,
    List: AssignList,
    detailKind: 'Assign',
    listHook: mocks.assignList,
    loadingKind: 'Assign Mutation',
    redirectUrl: RoutingPath.Assigns,
    resourceClass: AssignClass,
    resourceName: 'Assign mutations',
    routeName: RouteName.Assign,
  },
  {
    Detail: AssignMetadataDetails,
    List: AssignMetadataList,
    detailKind: 'AssignMetadata',
    listHook: mocks.assignMetadataList,
    loadingKind: 'AssignMetadata Mutation',
    redirectUrl: RoutingPath.AssignMetadatas,
    resourceClass: AssignMetadataClass,
    resourceName: 'AssignMetadata mutations',
    routeName: RouteName.AssignMetadata,
  },
  {
    Detail: AssignImageDetails,
    List: AssignImageList,
    detailKind: 'AssignImage',
    listHook: mocks.assignImageList,
    loadingKind: 'AssignImage Mutation',
    redirectUrl: RoutingPath.AssignImages,
    resourceClass: AssignImageClass,
    resourceName: 'AssignImage mutations',
    routeName: RouteName.AssignImage,
  },
  {
    Detail: ModifySetDetails,
    List: ModifySetList,
    detailKind: 'ModifySet',
    listHook: mocks.modifySetList,
    loadingKind: 'ModifySet Mutation',
    redirectUrl: RoutingPath.ModifySets,
    resourceClass: ModifySetClass,
    resourceName: 'ModifySet mutations',
    routeName: RouteName.ModifySet,
  },
];

function makeListItem(name: string) {
  return {
    jsonData: { spec: {} },
    metadata: { creationTimestamp: '2026-07-28T00:00:00Z', name },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.detailsResult.current = { item: null, error: null };
  mocks.routeName.current = 'example-mutation';
});

afterEach(() => {
  cleanup();
});

describe('mutation lists', () => {
  it.each(cases)(
    '$detailKind uses its resource class and constructs a name-only detail link',
    ({ List, listHook, routeName }) => {
      render(<List hideTitle />);

      expect(listHook).toHaveBeenCalledTimes(1);
      const onItems = listHook.mock.calls[0][0] as (items: any[]) => void;

      act(() => onItems([makeListItem('sample-mutation')]));

      const link = screen.getByRole('link', { name: 'sample-mutation' });
      expect(link).toHaveAttribute('data-route-name', routeName);
      expect(JSON.parse(link.getAttribute('data-params') ?? '{}')).toEqual({
        name: 'sample-mutation',
      });
    }
  );

  it.each(cases)(
    '$detailKind presents a missing optional CRD without hiding it as an empty list',
    ({ List, listHook, resourceName }) => {
      render(<List />);

      const onError = listHook.mock.calls[0][1] as (error: Error) => void;
      act(() =>
        onError(Object.assign(new Error('the server could not find the resource'), { status: 404 }))
      );

      expect(screen.getByText(`${resourceName} API unavailable`)).toBeInTheDocument();
      expect(
        screen.getByText(/CustomResourceDefinition may not be installed or served by this cluster/)
      ).toBeInTheDocument();
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    }
  );
});

describe('mutation details', () => {
  it.each(cases)(
    '$detailKind resolves the routed name through its resource class and exposes loading/not-found states',
    ({ Detail, detailKind, loadingKind, resourceClass }) => {
      render(<Detail />);

      expect(mocks.useResourceDetails).toHaveBeenLastCalledWith(resourceClass, 'example-mutation');
      expect(screen.getByText(`Loading ${loadingKind} details...`)).toBeInTheDocument();

      cleanup();
      const missingError = Object.assign(new Error('missing'), { status: 404 });
      mocks.detailsResult.current = { item: null, error: missingError };
      render(<Detail />);

      expect(screen.getByText(`${detailKind} not found`)).toBeInTheDocument();
      expect(mocks.detailsErrorProps).toHaveBeenLastCalledWith({
        error: missingError,
        kind: detailKind,
        name: 'example-mutation',
      });
      expect(screen.getByText(/example-mutation/)).toBeInTheDocument();
    }
  );

  it.each(cases)(
    '$detailKind wires the loaded resource into deletion and readiness status',
    ({ Detail, detailKind, redirectUrl, resourceClass }) => {
      const data = {
        apiVersion: 'mutations.gatekeeper.sh/v1',
        kind: detailKind,
        metadata: {
          creationTimestamp: '2026-07-28T00:00:00Z',
          name: 'example-mutation',
        },
        spec: {},
      };
      const item = { jsonData: data };
      mocks.detailsResult.current = { item, error: null };

      render(<Detail />);

      expect(mocks.useResourceDetails).toHaveBeenCalledWith(resourceClass, 'example-mutation');
      expect(mocks.deleteProps).toHaveBeenCalledWith({
        kind: detailKind,
        redirectUrl,
        resource: item,
      });
      expect(mocks.statusProps).toHaveBeenCalledWith({
        readinessField: 'enforced',
        resource: data,
      });
    }
  );
});
