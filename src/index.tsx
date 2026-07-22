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
import ConfigDetails from './configuration/ConfigDetails';
import SyncSetDetails from './configuration/SyncSetDetails';
import ProviderDetails from './externaldata/ProviderDetails';
import ConnectionDetails from './externaldata/ConnectionDetails';
import ExpansionTemplateList from './expansion/ExpansionTemplateList';
import ExpansionTemplateDetails from './expansion/ExpansionTemplateDetails';

import LibraryList from './library/List';
import LibraryTemplateDetails from './library/TemplateDetails';

import ConstraintsPage from './constraints/ConstraintsPage';
import MutationsPage from './mutation/MutationsPage';
import ConfigurationPage from './configuration/ConfigurationPage';
import ExternalDataPage from './externaldata/ExternalDataPage';

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

  // Configuration
  export const Configuration = '/gatekeeper/configuration';
  export const Configs = '/gatekeeper/configuration/configs';
  export const Config = '/gatekeeper/configuration/configs/:namespace/:name';
  export const SyncSets = '/gatekeeper/configuration/syncsets';
  export const SyncSet = '/gatekeeper/configuration/syncsets/:name';

  // External Data
  export const ExternalData = '/gatekeeper/externaldata';
  export const Providers = '/gatekeeper/externaldata/providers';
  export const Provider = '/gatekeeper/externaldata/providers/:name';
  export const Connections = '/gatekeeper/externaldata/connections';
  export const Connection = '/gatekeeper/externaldata/connections/:namespace/:name';

  // Expansion
  export const ExpansionTemplates = '/gatekeeper/expansion/expansiontemplates';
  export const ExpansionTemplate = '/gatekeeper/expansion/expansiontemplates/:name';
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
  name: 'gatekeeper-configuration',
  label: 'Configurations',
  url: RoutingPath.Configuration,
});

registerSidebarEntry({
  parent: 'gatekeeper',
  name: 'gatekeeper-externaldata',
  label: 'External Data',
  url: RoutingPath.ExternalData,
});

registerSidebarEntry({
  parent: 'gatekeeper',
  name: 'gatekeeper-expansion',
  label: 'Expansion Templates',
  url: RoutingPath.ExpansionTemplates,
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

registerRoute({
  path: RoutingPath.Configuration,
  sidebar: 'gatekeeper-configuration',
  name: 'Configurations',
  exact: true,
  component: () => <ConfigurationPage />,
});

registerRoute({
  path: RoutingPath.ExternalData,
  sidebar: 'gatekeeper-externaldata',
  name: 'External Data',
  exact: true,
  component: () => <ExternalDataPage />,
});

registerRoute({
  path: RoutingPath.ExpansionTemplates,
  sidebar: 'gatekeeper-expansion',
  name: 'Expansion Templates',
  exact: true,
  component: () => <ExpansionTemplateList />,
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

registerRoute({
  path: RoutingPath.Config,
  sidebar: 'gatekeeper-configuration',
  name: 'Config Details',
  exact: true,
  component: () => <ConfigDetails />,
});

registerRoute({
  path: RoutingPath.SyncSet,
  sidebar: 'gatekeeper-configuration',
  name: 'SyncSet Details',
  exact: true,
  component: () => <SyncSetDetails />,
});

registerRoute({
  path: RoutingPath.Provider,
  sidebar: 'gatekeeper-externaldata',
  name: 'Provider Details',
  exact: true,
  component: () => <ProviderDetails />,
});

registerRoute({
  path: RoutingPath.Connection,
  sidebar: 'gatekeeper-externaldata',
  name: 'Connection Details',
  exact: true,
  component: () => <ConnectionDetails />,
});

registerRoute({
  path: RoutingPath.ExpansionTemplate,
  sidebar: 'gatekeeper-expansion',
  name: 'ExpansionTemplate Details',
  exact: true,
  component: () => <ExpansionTemplateDetails />,
});

// Export plugin info for Headlamp recognition
export default {
  name: 'gatekeeper-headlamp-plugin',
  version: '0.2.0',
  description: 'Headlamp plugin for OPA Gatekeeper policies and violations',
};
