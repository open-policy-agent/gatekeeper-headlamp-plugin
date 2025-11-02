# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Headlamp plugin for viewing and managing OPA Gatekeeper policies, violations, and constraint templates in Kubernetes clusters. Headlamp is a Kubernetes UI, and this plugin extends it with Gatekeeper-specific functionality.

## Common Commands

### Development Workflow
```bash
make setup       # First-time setup: install, build, deploy
make dev         # Build and deploy (most common during development)
make build       # Build plugin only
make deploy      # Deploy to Headlamp plugins directory
```

### Code Quality
```bash
npm run lint           # Run ESLint
npm run lint-fix       # Auto-fix ESLint issues
npm run tsc            # TypeScript type checking
npm run format         # Run Prettier
npm run test           # Run tests
```

### Testing & Validation
```bash
make validate          # Clean build with validation
make check-install     # Verify plugin is installed
make check-headlamp    # Check if Headlamp is running on localhost:4466
```

### Deployment Locations
- **macOS**: `~/Library/Application Support/Headlamp/plugins/gatekeeper-headlamp-plugin/`
- **Linux**: `~/.config/Headlamp/plugins/gatekeeper-headlamp-plugin/`
- **Windows**: `%APPDATA%/Headlamp/plugins/gatekeeper-headlamp-plugin/`

## Architecture

### Plugin Structure

The plugin is built using the Headlamp plugin framework and consists of:

1. **Entry Point** (`src/index.tsx`)
   - Registers routes and sidebar entries
   - Defines routing paths for all Gatekeeper views
   - Creates the main "Gatekeeper" sidebar item with sub-items

2. **Core Views** (organized in subdirectories):
   - `constraint-template/` - View and manage ConstraintTemplates
   - `constraint/` - View and manage Constraints
   - `violations/` - View policy violations
   - `library/` - Browse OPA Gatekeeper Library templates from GitHub

3. **Data Models** (`src/model.ts`):
   - `ConstraintTemplateClass` - Static CRD class for ConstraintTemplates
   - `ConstraintClass` - Dynamic discovery system for Constraints

   **Important**: Constraints use dynamic discovery because different ConstraintTemplates create different Constraint CRDs (e.g., K8sRequiredLabels, K8sPSPPrivilegedContainer). The `ConstraintClass.useApiList` discovers all constraint types at runtime by:
   1. Fetching all ConstraintTemplates
   2. Extracting the CRD kinds/plurals from each template
   3. Making API requests to fetch constraints of each discovered type
   4. Aggregating all results

4. **Types** (`src/types/index.ts`):
   - TypeScript definitions for Gatekeeper CRDs
   - `ConstraintTemplate`, `Constraint`, `Violation` interfaces

### Key Patterns

#### Dynamic Constraint Discovery
Unlike ConstraintTemplates which have a fixed CRD, Constraints are dynamically created based on installed ConstraintTemplates. The plugin handles this by:
- Runtime discovery of constraint types via the Gatekeeper API
- Dynamic API endpoint construction based on discovered types
- Aggregation of constraints across all discovered types

#### API Proxy
The plugin uses Headlamp's API proxy (`@kinvolk/headlamp-plugin/lib/ApiProxy`) to communicate with the Kubernetes API server. The `model.ts` file handles multiple possible API proxy function locations for compatibility.

#### Gatekeeper Library Integration
The `library/` views fetch templates directly from the [OPA Gatekeeper Library](https://github.com/open-policy-agent/gatekeeper-library) GitHub repository using the GitHub API, allowing users to browse and install community-maintained policy templates.

#### Error Handling for Missing Gatekeeper
When Gatekeeper is not installed, all list views (`constraint-template/List.tsx`, `constraint/List.tsx`, `violations/List.tsx`) detect this immediately via an API check for Gatekeeper CRDs. If the API returns a 404 or "not found" error, a warning alert is displayed with a button that navigates to the Gatekeeper Helm chart page within Headlamp. The navigation is cluster-aware, extracting the current cluster name from the URL path using `useLocation()` and navigating to `/c/{cluster}/helm/gatekeeper/charts/gatekeeper`.

### Build Process

The build follows a multi-stage process managed by the Makefile:

1. **Build**: `npm run build` creates `dist/main.js`
2. **Extract**: `npm run extract` creates `.plugins/` directory with `main.js` + `package.json`
3. **Deploy**: Copies `.plugins/*` to Headlamp's plugins directory
4. **Auto-cleanup**: `dist/` is automatically removed after extraction (use `make build-debug` to keep it)

## Important Constraints

### Headlamp Plugin Framework
- All routes must be registered via `registerRoute()`
- Sidebar entries must be registered via `registerSidebarEntry()`
- Components should use Headlamp's common components from `@kinvolk/headlamp-plugin/lib/CommonComponents`
- Material-UI v5 components are available for UI elements
- Routes are cluster-aware: URLs follow the pattern `/c/{cluster}/...` - use `useLocation()` from react-router-dom to extract the current cluster name from the path

### API Interactions
- All Kubernetes API calls go through the Headlamp API proxy
- The proxy function location varies by Headlamp version (handled in `model.ts`)
- CRD classes are created using `makeCustomResourceClass()` from the Headlamp plugin lib

### Testing Plugin Changes
After code changes, you must:
1. Run `make dev` to rebuild and deploy
2. Restart Headlamp to load the updated plugin
3. The plugin won't hot-reload automatically

## File Organization

```
src/
├── index.tsx                 # Plugin entry point, route registration
├── model.ts                  # Data models with dynamic constraint discovery
├── types/index.ts           # TypeScript type definitions
├── constraint-template/     # ConstraintTemplate views
│   ├── List.tsx            # List all constraint templates
│   └── Details.tsx         # Individual template details
├── constraint/             # Constraint views
│   ├── List.tsx            # List all constraints (aggregated)
│   └── Details.tsx         # Individual constraint details
├── violations/             # Violation views
│   ├── List.tsx            # List all violations (aggregated)
│   └── Details.tsx         # Individual violation details
└── library/                # Gatekeeper Library integration
    ├── List.tsx            # Browse library templates
    └── TemplateDetails.tsx # Template details and installation
```

## Development Notes

- The plugin targets Headlamp v0.12.0+
- Uses React 18 with functional components and hooks
- Material-UI v5 is used for UI components
- TypeScript 5+ for type safety
- ESLint config extends `@headlamp-k8s` preset
