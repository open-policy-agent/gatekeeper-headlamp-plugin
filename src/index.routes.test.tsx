import React from 'react';
import { describe, expect, it, vi } from 'vitest';

const registry = vi.hoisted(() => ({
  registerRoute: vi.fn(),
  registerSidebarEntry: vi.fn(),
}));

vi.mock('@kinvolk/headlamp-plugin/lib', () => registry);

vi.mock('./constraint/Details', () => ({ default: () => <div>Constraint details</div> }));
vi.mock('./constraint-template/Details', () => ({
  default: () => <div>Constraint template details</div>,
}));
vi.mock('./violations/Details', () => ({ default: () => <div>Violation details</div> }));
vi.mock('./mutation/AssignDetails', () => ({ default: () => <div>Assign details</div> }));
vi.mock('./mutation/AssignMetadataDetails', () => ({
  default: () => <div>AssignMetadata details</div>,
}));
vi.mock('./mutation/AssignImageDetails', () => ({
  default: () => <div>AssignImage details</div>,
}));
vi.mock('./mutation/ModifySetDetails', () => ({
  default: () => <div>ModifySet details</div>,
}));
vi.mock('./configuration/ConfigDetails', () => ({ default: () => <div>Config details</div> }));
vi.mock('./configuration/SyncSetDetails', () => ({ default: () => <div>SyncSet details</div> }));
vi.mock('./externaldata/ProviderDetails', () => ({
  default: () => <div>Provider details</div>,
}));
vi.mock('./externaldata/ConnectionDetails', () => ({
  default: () => <div>Connection details</div>,
}));
vi.mock('./expansion/ExpansionTemplateList', () => ({
  default: () => <div>Expansion templates</div>,
}));
vi.mock('./expansion/ExpansionTemplateDetails', () => ({
  default: () => <div>Expansion template details</div>,
}));
vi.mock('./library/List', () => ({ default: () => <div>Library</div> }));
vi.mock('./library/TemplateDetails', () => ({
  default: () => <div>Library template details</div>,
}));
vi.mock('./constraints/ConstraintsPage', () => ({
  default: () => <div>Constraints page</div>,
}));
vi.mock('./mutation/MutationsPage', () => ({ default: () => <div>Mutations page</div> }));
vi.mock('./configuration/ConfigurationPage', () => ({
  default: () => <div>Configuration page</div>,
}));
vi.mock('./externaldata/ExternalDataPage', () => ({
  default: () => <div>External data page</div>,
}));
vi.mock('./externaldata/ViolationExportPage', () => ({
  default: () => <div>Violation export page</div>,
}));

import { RouteName, RoutingPath } from './index';

interface RegisteredRoute {
  component: () => React.ReactElement;
  exact?: boolean;
  name: string;
  path: string;
  sidebar: string;
}

interface RegisteredSidebarEntry {
  label: string;
  name: string;
  url: string;
}

const registeredRoutes = registry.registerRoute.mock.calls.map(
  ([route]) => route as RegisteredRoute
);
const registeredSidebarEntries = registry.registerSidebarEntry.mock.calls.map(
  ([entry]) => entry as RegisteredSidebarEntry
);

function getRoute(path: string) {
  const route = registeredRoutes.find(candidate => candidate.path === path);
  expect(route, `Expected route ${path} to be registered`).toBeDefined();
  return route as RegisteredRoute;
}

describe('Gatekeeper route registration', () => {
  it('keeps every registered route name aligned with its exported route-name constant', () => {
    expect(Object.keys(RouteName).sort()).toEqual(Object.keys(RoutingPath).sort());

    Object.entries(RoutingPath).forEach(([key, path]) => {
      expect(getRoute(path).name).toBe(RouteName[key as keyof typeof RouteName]);
    });
  });

  it('registers every route-addressable tab and compatibility URL', () => {
    [
      RoutingPath.ConstraintTemplates,
      RoutingPath.Constraints,
      RoutingPath.Violations,
      RoutingPath.Mutations,
      RoutingPath.Assigns,
      RoutingPath.AssignMetadatas,
      RoutingPath.AssignImages,
      RoutingPath.ModifySets,
      RoutingPath.Configuration,
      RoutingPath.Configs,
      RoutingPath.SyncSets,
      RoutingPath.ExternalData,
      RoutingPath.Providers,
    ].forEach(path => expect(getRoute(path).exact).toBe(true));
  });

  it('registers canonical and legacy Policy Library details with the same component', () => {
    const legacyRoute = getRoute(RoutingPath.LegacyLibraryTemplate);
    const canonicalRoute = getRoute(RoutingPath.LibraryTemplate);

    expect(legacyRoute.component().type).toBe(canonicalRoute.component().type);
    expect(registeredRoutes.indexOf(legacyRoute)).toBeLessThan(
      registeredRoutes.indexOf(canonicalRoute)
    );
  });

  it('places Connection list and detail routes under Violation Export', () => {
    const violationExportSidebar = registeredSidebarEntries.find(
      entry => entry.name === 'gatekeeper-violation-export'
    );

    expect(violationExportSidebar).toMatchObject({
      label: 'Violation Export',
      url: RoutingPath.ViolationExport,
    });

    [
      RoutingPath.ViolationExport,
      RoutingPath.Connections,
      RoutingPath.Connection,
      RoutingPath.LegacyConnection,
    ].forEach(path => {
      expect(getRoute(path)).toMatchObject({
        exact: true,
        sidebar: 'gatekeeper-violation-export',
      });
    });

    expect(getRoute(RoutingPath.Provider).sidebar).toBe('gatekeeper-externaldata');
  });
});
