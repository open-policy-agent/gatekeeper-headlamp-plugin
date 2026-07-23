import { registerRoute, registerSidebarEntry } from '@kinvolk/headlamp-plugin/lib';
import ConfigDetails from './configuration/ConfigDetails';
import ConfigurationPage from './configuration/ConfigurationPage';
import SyncSetDetails from './configuration/SyncSetDetails';
import ConstraintDetails from './constraint/Details';
import ConstraintTemplateDetails from './constraint-template/Details';
import ConstraintsPage from './constraints/ConstraintsPage';
import ExpansionTemplateDetails from './expansion/ExpansionTemplateDetails';
import ExpansionTemplateList from './expansion/ExpansionTemplateList';
import ConnectionDetails from './externaldata/ConnectionDetails';
import ExternalDataPage from './externaldata/ExternalDataPage';
import ProviderDetails from './externaldata/ProviderDetails';
import ViolationExportPage from './externaldata/ViolationExportPage';
import LibraryList from './library/List';
import LibraryTemplateDetails from './library/TemplateDetails';
import AssignDetails from './mutation/AssignDetails';
import AssignImageDetails from './mutation/AssignImageDetails';
import AssignMetadataDetails from './mutation/AssignMetadataDetails';
import ModifySetDetails from './mutation/ModifySetDetails';
import MutationsPage from './mutation/MutationsPage';
import ViolationsDetails from './violations/Details';

export namespace RoutingPath {
  // Library
  export const Library = '/gatekeeper/library';
  export const LibraryTemplate = '/gatekeeper/library/:category/:name';
  export const LegacyLibraryTemplate = '/gatekeeper/library/template/:id';

  // Policies / Constraints
  export const ConstraintTemplates = '/gatekeeper/constraint-templates';
  export const ConstraintTemplate = '/gatekeeper/constraint-templates/:name';
  export const Constraints = '/gatekeeper/constraints';
  export const Constraint = '/gatekeeper/constraints/:kind/:name';
  export const Violations = '/gatekeeper/violations';
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

  // Violation export (connection.gatekeeper.sh)
  export const ViolationExport = '/gatekeeper/violation-export';
  export const Connection = '/gatekeeper/violation-export/:namespace/:name';
  export const Connections = '/gatekeeper/externaldata/connections';
  export const LegacyConnection = '/gatekeeper/externaldata/connections/:namespace/:name';

  // Expansion
  export const ExpansionTemplates = '/gatekeeper/expansion/expansiontemplates';
  export const ExpansionTemplate = '/gatekeeper/expansion/expansiontemplates/:name';
}

export namespace RouteName {
  // Library
  export const Library = 'Policy Library';
  export const LibraryTemplate = 'Library Template Details';
  export const LegacyLibraryTemplate = 'Library Template Details (Legacy URL)';

  // Policies / Constraints
  export const ConstraintTemplates = 'Constraint Templates';
  export const ConstraintTemplate = 'Constraint Template Details';
  export const Constraints = 'Constraints';
  export const Constraint = 'Constraint Details';
  export const Violations = 'Violations';
  export const Violation = 'Violation Details';

  // Mutations
  export const Mutations = 'Mutations';
  export const Assigns = 'Assign Mutations';
  export const Assign = 'Assign Details';
  export const AssignMetadatas = 'AssignMetadata Mutations';
  export const AssignMetadata = 'AssignMetadata Details';
  export const AssignImages = 'AssignImage Mutations';
  export const AssignImage = 'AssignImage Details';
  export const ModifySets = 'ModifySet Mutations';
  export const ModifySet = 'ModifySet Details';

  // Configuration
  export const Configuration = 'Configurations';
  export const Configs = 'Gatekeeper Configs';
  export const Config = 'Config Details';
  export const SyncSets = 'Gatekeeper SyncSets';
  export const SyncSet = 'SyncSet Details';

  // External Data
  export const ExternalData = 'External Data';
  export const Providers = 'External Data Providers';
  export const Provider = 'Provider Details';

  // Violation export (connection.gatekeeper.sh)
  export const ViolationExport = 'Violation Export';
  export const Connection = 'Violation Export Connection Details';
  export const Connections = 'Violation Export (Legacy URL)';
  export const LegacyConnection = 'Violation Export Connection Details (Legacy URL)';

  // Expansion
  export const ExpansionTemplates = 'Expansion Templates';
  export const ExpansionTemplate = 'ExpansionTemplate Details';
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
  name: 'gatekeeper-violation-export',
  label: 'Violation Export',
  url: RoutingPath.ViolationExport,
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

// Register routes for main and tab list pages
registerRoute({
  path: RoutingPath.Library,
  sidebar: 'gatekeeper-library',
  name: RouteName.Library,
  exact: true,
  component: () => <LibraryList />,
});

registerRoute({
  path: RoutingPath.Constraints,
  sidebar: 'gatekeeper-constraints',
  name: RouteName.Constraints,
  exact: true,
  component: () => <ConstraintsPage />,
});

registerRoute({
  path: RoutingPath.ConstraintTemplates,
  sidebar: 'gatekeeper-constraints',
  name: RouteName.ConstraintTemplates,
  exact: true,
  component: () => <ConstraintsPage />,
});

registerRoute({
  path: RoutingPath.Violations,
  sidebar: 'gatekeeper-constraints',
  name: RouteName.Violations,
  exact: true,
  component: () => <ConstraintsPage />,
});

registerRoute({
  path: RoutingPath.Mutations,
  sidebar: 'gatekeeper-mutations',
  name: RouteName.Mutations,
  exact: true,
  component: () => <MutationsPage />,
});

registerRoute({
  path: RoutingPath.Assigns,
  sidebar: 'gatekeeper-mutations',
  name: RouteName.Assigns,
  exact: true,
  component: () => <MutationsPage />,
});

registerRoute({
  path: RoutingPath.AssignMetadatas,
  sidebar: 'gatekeeper-mutations',
  name: RouteName.AssignMetadatas,
  exact: true,
  component: () => <MutationsPage />,
});

registerRoute({
  path: RoutingPath.AssignImages,
  sidebar: 'gatekeeper-mutations',
  name: RouteName.AssignImages,
  exact: true,
  component: () => <MutationsPage />,
});

registerRoute({
  path: RoutingPath.ModifySets,
  sidebar: 'gatekeeper-mutations',
  name: RouteName.ModifySets,
  exact: true,
  component: () => <MutationsPage />,
});

registerRoute({
  path: RoutingPath.Configuration,
  sidebar: 'gatekeeper-configuration',
  name: RouteName.Configuration,
  exact: true,
  component: () => <ConfigurationPage />,
});

registerRoute({
  path: RoutingPath.Configs,
  sidebar: 'gatekeeper-configuration',
  name: RouteName.Configs,
  exact: true,
  component: () => <ConfigurationPage />,
});

registerRoute({
  path: RoutingPath.SyncSets,
  sidebar: 'gatekeeper-configuration',
  name: RouteName.SyncSets,
  exact: true,
  component: () => <ConfigurationPage />,
});

registerRoute({
  path: RoutingPath.ExternalData,
  sidebar: 'gatekeeper-externaldata',
  name: RouteName.ExternalData,
  exact: true,
  component: () => <ExternalDataPage />,
});

registerRoute({
  path: RoutingPath.Providers,
  sidebar: 'gatekeeper-externaldata',
  name: RouteName.Providers,
  exact: true,
  component: () => <ExternalDataPage />,
});

registerRoute({
  path: RoutingPath.ViolationExport,
  sidebar: 'gatekeeper-violation-export',
  name: RouteName.ViolationExport,
  exact: true,
  component: () => <ViolationExportPage />,
});

registerRoute({
  path: RoutingPath.Connections,
  sidebar: 'gatekeeper-violation-export',
  name: RouteName.Connections,
  exact: true,
  component: () => <ViolationExportPage />,
});

registerRoute({
  path: RoutingPath.ExpansionTemplates,
  sidebar: 'gatekeeper-expansion',
  name: RouteName.ExpansionTemplates,
  exact: true,
  component: () => <ExpansionTemplateList />,
});

// --- Details Pages Routes ---
// Register the legacy two-segment route first because it also matches the canonical pattern.
registerRoute({
  path: RoutingPath.LegacyLibraryTemplate,
  name: RouteName.LegacyLibraryTemplate,
  exact: true,
  sidebar: 'gatekeeper-library',
  component: () => <LibraryTemplateDetails />,
});

registerRoute({
  path: RoutingPath.LibraryTemplate,
  name: RouteName.LibraryTemplate,
  exact: true,
  sidebar: 'gatekeeper-library',
  component: () => <LibraryTemplateDetails />,
});

registerRoute({
  path: RoutingPath.ConstraintTemplate,
  name: RouteName.ConstraintTemplate,
  exact: true,
  sidebar: 'gatekeeper-constraints',
  component: () => <ConstraintTemplateDetails />,
});

registerRoute({
  path: RoutingPath.Constraint,
  name: RouteName.Constraint,
  exact: true,
  sidebar: 'gatekeeper-constraints',
  component: () => <ConstraintDetails />,
});

registerRoute({
  path: RoutingPath.Violation,
  name: RouteName.Violation,
  exact: true,
  sidebar: 'gatekeeper-constraints',
  component: () => <ViolationsDetails />,
});

registerRoute({
  path: RoutingPath.Assign,
  sidebar: 'gatekeeper-mutations',
  name: RouteName.Assign,
  exact: true,
  component: () => <AssignDetails />,
});

registerRoute({
  path: RoutingPath.AssignMetadata,
  sidebar: 'gatekeeper-mutations',
  name: RouteName.AssignMetadata,
  exact: true,
  component: () => <AssignMetadataDetails />,
});

registerRoute({
  path: RoutingPath.AssignImage,
  sidebar: 'gatekeeper-mutations',
  name: RouteName.AssignImage,
  exact: true,
  component: () => <AssignImageDetails />,
});

registerRoute({
  path: RoutingPath.ModifySet,
  sidebar: 'gatekeeper-mutations',
  name: RouteName.ModifySet,
  exact: true,
  component: () => <ModifySetDetails />,
});

registerRoute({
  path: RoutingPath.Config,
  sidebar: 'gatekeeper-configuration',
  name: RouteName.Config,
  exact: true,
  component: () => <ConfigDetails />,
});

registerRoute({
  path: RoutingPath.SyncSet,
  sidebar: 'gatekeeper-configuration',
  name: RouteName.SyncSet,
  exact: true,
  component: () => <SyncSetDetails />,
});

registerRoute({
  path: RoutingPath.Provider,
  sidebar: 'gatekeeper-externaldata',
  name: RouteName.Provider,
  exact: true,
  component: () => <ProviderDetails />,
});

registerRoute({
  path: RoutingPath.Connection,
  sidebar: 'gatekeeper-violation-export',
  name: RouteName.Connection,
  exact: true,
  component: () => <ConnectionDetails />,
});

registerRoute({
  path: RoutingPath.LegacyConnection,
  sidebar: 'gatekeeper-violation-export',
  name: RouteName.LegacyConnection,
  exact: true,
  component: () => <ConnectionDetails />,
});

registerRoute({
  path: RoutingPath.ExpansionTemplate,
  sidebar: 'gatekeeper-expansion',
  name: RouteName.ExpansionTemplate,
  exact: true,
  component: () => <ExpansionTemplateDetails />,
});

// Export plugin info for Headlamp recognition
export default {
  name: 'gatekeeper-headlamp-plugin',
  version: '0.2.0',
  description: 'Headlamp plugin for OPA Gatekeeper policies and violations',
};
