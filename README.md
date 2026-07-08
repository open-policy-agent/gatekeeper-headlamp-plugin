# Gatekeeper Headlamp Plugin

A [Headlamp](https://headlamp.dev) plugin for viewing and managing [OPA Gatekeeper](https://open-policy-agent.github.io/gatekeeper/) policies, violations, and Gatekeeper Library templates in Kubernetes clusters.

[![Artifact Hub](https://img.shields.io/endpoint?url=https://artifacthub.io/badge/repository/gatekeeper-headlamp-plugin)](https://artifacthub.io/packages/search?repo=gatekeeper-headlamp-plugin)

## Features

### ConstraintTemplates

- View and browse Gatekeeper ConstraintTemplates in your cluster
- Filter templates by target
- View template details including CRD kind/plural, readiness status, creation time, and targets
- Delete ConstraintTemplates from the UI with a confirmation dialog
- Detect when Gatekeeper CRDs are not installed and show an installation prompt

![Constraint Templates](images/constraint_template.png)

### Constraints

- Browse constraints discovered dynamically from installed ConstraintTemplates
- Filter constraints by constraint kind and enforcement action
- View enforcement action, matched resource kinds, total violation count, and creation time
- View constraint details including overview, match rules, audit timestamp, and current violations
- Delete constraints from the UI, using the ConstraintTemplate plural name when available

![Constraints](images/constraints.png)

### Violations

- Monitor current Gatekeeper audit violations across constraints
- Filter violations by resource kind, constraint kind, enforcement action, and resource name
- View violation messages, affected resources, namespaces, API versions, and related constraints
- View each constraint's current audit timestamp when available

![Violations](images/violations.png)

### Gatekeeper Library

- Browse templates from the official OPA Gatekeeper Library by category
- View template names, descriptions, and raw ConstraintTemplate YAML
- Customize match criteria and parameters as JSON
- Generate Constraint YAML and apply the ConstraintTemplate plus generated Constraint to your cluster

![Gatekeeper Library](images/library.png)

## Prerequisites

- [Headlamp](https://headlamp.dev) installed and configured
  - Artifact Hub metadata for this plugin currently declares Headlamp compatibility as `>=0.29`
- A Kubernetes cluster with [Gatekeeper](https://open-policy-agent.github.io/gatekeeper/website/docs/install/) installed
  - If Gatekeeper is not installed, the plugin detects the missing CRDs and provides an installation prompt
- For plugin development: Node.js v22.0.0 or later and npm v11.0.0 or later are recommended

## Installation

### From Headlamp Plugin Catalog (Recommended)

1. Install and launch [Headlamp](https://headlamp.dev)
2. Open the Plugin Catalog from the Headlamp menu
3. Search for "Gatekeeper"
4. Click the install button next to the Gatekeeper plugin
5. Restart Headlamp if required
6. The "Gatekeeper" section will appear in the sidebar

### From Artifact Hub

The plugin is also available on [Artifact Hub](https://artifacthub.io/packages/search?repo=gatekeeper-headlamp-plugin).

### Manual Installation

Download the latest release and extract it to your Headlamp plugins directory.

Common plugin locations:

- **Linux/macOS**: `~/.config/Headlamp/plugins/gatekeeper-headlamp-plugin/`
- **Windows**: `%APPDATA%/Headlamp/Config/plugins/gatekeeper-headlamp-plugin/`

> The Makefile is currently configured to deploy to `~/Library/Application Support/Headlamp/plugins`. If your Headlamp installation uses another plugins directory, update `HEADLAMP_PLUGINS_DIR` in `Makefile` before running `make deploy`, `make dev`, or `make setup`.

## Development

This project uses a `Makefile` for common development workflows.

### Quick Start

1. **Clone the repository:**

   ```bash
   git clone https://github.com/sozercan/gatekeeper-headlamp-plugin.git
   cd gatekeeper-headlamp-plugin
   ```

2. **First-time setup:**

   Installs dependencies, builds the plugin, and deploys it to the configured Headlamp plugins directory:

   ```bash
   make setup
   ```

3. **Development workflow:**

   After making code changes, rebuild and deploy:

   ```bash
   make dev
   ```

4. **Run checks:**

   ```bash
   npm test
   npm run lint
   npm run tsc
   npm run format
   ```

### Available npm Scripts

- `npm run build` - Build the plugin
- `npm run start` - Start the Headlamp plugin development server
- `npm run package` - Package the plugin for distribution
- `npm test` - Run the Headlamp plugin test runner
- `npm run lint` - Check code style
- `npm run lint-fix` - Fix code style issues
- `npm run format` - Format code with Prettier
- `npm run tsc` - Run the TypeScript compiler
- `npm run extract` - Extract the built plugin into `.plugins/`

### Makefile Commands

View all available Makefile commands and documentation:

```bash
make help
```

Common commands:

- `make setup` - First-time setup (`install` + `build` + `deploy`)
- `make dev` - Development workflow (`build` + `deploy`)
- `make build` - Build and extract the plugin
- `make deploy` - Deploy `.plugins/` to the configured Headlamp plugins directory
- `make clean` - Clean build artifacts
- `make validate` - Clean, build, and validate expected output files

### Project Structure

```text
gatekeeper-headlamp-plugin/
├── src/
│   ├── constraint/          # Constraint list and detail views
│   ├── constraint-template/ # ConstraintTemplate list and detail views
│   ├── violations/          # Violation list and detail views
│   ├── library/             # Gatekeeper Library integration
│   ├── types/               # TypeScript type definitions
│   ├── model.ts             # ConstraintTemplate model and dynamic constraint discovery
│   └── index.tsx            # Plugin routes and sidebar entries
├── images/                  # README and Artifact Hub screenshots
├── dist/                    # Build output (temporary)
├── .plugins/                # Extracted plugin package (deployment-ready)
├── artifacthub-pkg.yml      # Artifact Hub package metadata
├── artifacthub-repo.yml     # Artifact Hub repository metadata
└── Makefile                 # Build and deployment automation
```

## Contributing

Contributions are welcome! Please feel free to submit a pull request.

## License

Apache-2.0 License - see [LICENSE](LICENSE) for details.
