import {
  registerRoute,
  registerSidebarEntry,
} from '@kinvolk/headlamp-plugin/lib';
import ConstraintDetails from './constraint/Details';
import ConstraintTemplateDetails from './constraint-template/Details';
import ViolationsDetails from './violations/Details';

import AssignDetails from './mutation/AssignDetails';
import AssignMetadataDetails from './mutation/AssignMetadataDetails';
import AssignImageDetails from './mutation/AssignImageDetails';
import ModifySetDetails from './mutation/ModifySetDetails';

import LibraryList from './library/List';
import LibraryTemplateDetails from './library/TemplateDetails';

import ConstraintsPage from './constraints/ConstraintsPage';
import MutationsPage from './mutation/MutationsPage';

export namespace RoutingPath {
  // Library
  export const Library = '/gatekeeper/library';
  export const LibraryTemplate = '/gatekeeper/library/:category/:name';

  // Policies / Constraints
  export const ConstraintTemplate = '/gatekeeper/constraint-templates/:name';
  export const Constraints = '/gatekeeper/constraints';
  export const Constraint = '/gatekeeper/constraints/:kind/:name';
  export const Violation = '/gatekeeper/violations/:kind/:name';

  // Mutations
  export const Mutations = '/gatekeeper/mutations';
  export const Assigns = '/gatekeeper/mutations/assigns';
  export const Assign = '/gatekeeper/mutations/assigns/:name';
  export const AssignMetadatas = '/gatekeeper/mutations/assignmetadatas';
  export const AssignMetadata = '/gatekeeper/mutations/assignmetadatas/:name';
  export const AssignImages = '/gatekeeper/mutations/assignimages';
  export const AssignImage = '/gatekeeper/mutations/assignimages/:name';
  export const ModifySets = '/gatekeeper/mutations/modifysets';
  export const ModifySet = '/gatekeeper/mutations/modifysets/:name';
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
  name: 'gatekeeper-mutations',
  label: 'Mutations',
  url: RoutingPath.Mutations,
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

registerRoute({
  path: RoutingPath.Mutations,
  sidebar: 'gatekeeper-mutations',
  name: 'Mutations',
  exact: true,
  component: () => <MutationsPage />,
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

registerRoute({
  path: RoutingPath.Assign,
  sidebar: 'gatekeeper-mutations',
  name: 'Assign Details',
  exact: true,
  component: () => <AssignDetails />,
});

registerRoute({
  path: RoutingPath.AssignMetadata,
  sidebar: 'gatekeeper-mutations',
  name: 'AssignMetadata Details',
  exact: true,
  component: () => <AssignMetadataDetails />,
});

registerRoute({
  path: RoutingPath.AssignImage,
  sidebar: 'gatekeeper-mutations',
  name: 'AssignImage Details',
  exact: true,
  component: () => <AssignImageDetails />,
});

registerRoute({
  path: RoutingPath.ModifySet,
  sidebar: 'gatekeeper-mutations',
  name: 'ModifySet Details',
  exact: true,
  component: () => <ModifySetDetails />,
});

// Export plugin info for Headlamp recognition
export default {
  name: 'gatekeeper-headlamp-plugin',
  version: '0.2.0',
  description: 'Headlamp plugin for OPA Gatekeeper policies and violations',
};
