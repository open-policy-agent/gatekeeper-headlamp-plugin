import {
  registerRoute,
  registerSidebarEntry,
} from '@kinvolk/headlamp-plugin/lib';
import ConstraintDetails from './constraint/Details';
import ConstraintTemplateDetails from './constraint-template/Details';
import ViolationsDetails from './violations/Details';

import LibraryList from './library/List';
import LibraryTemplateDetails from './library/TemplateDetails';

import ConstraintsPage from './constraints/ConstraintsPage';

export namespace RoutingPath {
  // Library
  export const Library = '/gatekeeper/library';
  export const LibraryTemplate = '/gatekeeper/library/:category/:name';

  // Policies / Constraints
  export const ConstraintTemplate = '/gatekeeper/constraint-templates/:name';
  export const Constraints = '/gatekeeper/constraints';
  export const Constraint = '/gatekeeper/constraints/:kind/:name';
  export const Violation = '/gatekeeper/violations/:kind/:name';
}

// Register sidebar items
registerSidebarEntry({
  parent: null,
  name: 'gatekeeper',
  label: 'Gatekeeper',
  icon: 'mdi:shield-check',
  url: RoutingPath.Constraints,
});

registerSidebarEntry({
  parent: 'gatekeeper',
  name: 'gatekeeper-constraints',
  label: 'Constraints',
  url: RoutingPath.Constraints,
});

registerSidebarEntry({
  parent: 'gatekeeper',
  name: 'gatekeeper-library',
  label: 'Policy Library',
  url: RoutingPath.Library,
});

// Register routes for main Tab Pages
registerRoute({
  path: RoutingPath.Library,
  sidebar: 'gatekeeper-library',
  name: 'Policy Library',
  exact: true,
  component: () => <LibraryList />,
});

registerRoute({
  path: RoutingPath.Constraints,
  sidebar: 'gatekeeper-constraints',
  name: 'Constraints',
  exact: true,
  component: () => <ConstraintsPage />,
});

// --- Details Pages Routes ---
registerRoute({
  path: RoutingPath.LibraryTemplate,
  name: 'Library Template Details',
  exact: true,
  sidebar: 'gatekeeper-library',
  component: () => <LibraryTemplateDetails />,
});

registerRoute({
  path: RoutingPath.ConstraintTemplate,
  name: 'Constraint Template Details',
  exact: true,
  sidebar: 'gatekeeper-constraints',
  component: () => <ConstraintTemplateDetails />,
});

registerRoute({
  path: RoutingPath.Constraint,
  name: 'Constraint Details',
  exact: true,
  sidebar: 'gatekeeper-constraints',
  component: () => <ConstraintDetails />,
});

registerRoute({
  path: RoutingPath.Violation,
  name: 'Violation Details',
  exact: true,
  sidebar: 'gatekeeper-constraints',
  component: () => <ViolationsDetails />,
});

// Export plugin info for Headlamp recognition
export default {
  name: 'gatekeeper-headlamp-plugin',
  version: '0.2.0',
  description: 'Headlamp plugin for OPA Gatekeeper policies and violations',
};
