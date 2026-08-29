# Contributing

Thank you for contributing to the Gatekeeper Headlamp Plugin.

## Development prerequisites

- Node.js 22.x, matching the release workflow, and npm
- [Headlamp](https://headlamp.dev) installed for local plugin testing
- A Kubernetes cluster with [Gatekeeper](https://open-policy-agent.github.io/gatekeeper/website/docs/install/) installed for end-to-end testing

## Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/open-policy-agent/gatekeeper-headlamp-plugin.git
   cd gatekeeper-headlamp-plugin
   ```

2. Install dependencies, build the plugin, and deploy it to the configured Headlamp plugins directory:

   ```bash
   make setup
   ```

The Makefile defaults to the macOS Headlamp plugins directory:

```text
~/Library/Application Support/Headlamp/plugins
```

Override `HEADLAMP_PLUGINS_DIR` for another installation, for example:

```bash
make setup HEADLAMP_PLUGINS_DIR="$HOME/.config/Headlamp/plugins"
```

## Development workflow

After changing the source, rebuild and deploy the plugin:

```bash
make dev
```

To run the Headlamp plugin development server instead:

```bash
npm run start
```

Restart Headlamp when needed to load the updated plugin.

## Validation

Run the main checks before submitting a pull request:

```bash
npm test
npm run lint
npm run tsc
```

Format the source with:

```bash
npm run format
```

For a clean build and output validation, run:

```bash
make validate
```

## Common npm scripts

- `npm run build` - Build the plugin
- `npm run start` - Start the Headlamp plugin development server
- `npm run package` - Package the plugin for distribution
- `npm test` - Run the Headlamp plugin test runner
- `npm run lint` - Check code style
- `npm run lint-fix` - Fix code style issues
- `npm run format` - Format code with Prettier
- `npm run tsc` - Run the TypeScript compiler
- `npm run extract` - Extract the built plugin into `.plugins/`

## Makefile targets

Run `make help` for the complete list. Common targets include:

- `make setup` - Install dependencies, build, and deploy
- `make dev` - Build and deploy during development
- `make build` - Build and extract the plugin
- `make deploy` - Deploy `.plugins/` to the configured Headlamp plugins directory
- `make start` - Start the plugin development server
- `make test` - Run the test suite
- `make lint` - Run ESLint
- `make typecheck` - Run the TypeScript compiler check
- `make format` - Format the source
- `make clean` - Remove build artifacts
- `make validate` - Perform a clean build and validate expected output files

## Project structure

```text
gatekeeper-headlamp-plugin/
├── src/
│   ├── components/          # Shared status, error, loading, and delete UI
│   ├── configuration/       # Config and SyncSet list/detail views
│   ├── constraint/          # Dynamically discovered Constraint list/detail views
│   ├── constraint-template/ # ConstraintTemplate list/detail views
│   ├── constraints/         # Tabbed Constraints, ConstraintTemplates, and Violations page
│   ├── expansion/           # ExpansionTemplate list/detail views
│   ├── externaldata/        # Provider and violation export Connection views
│   ├── library/             # Gatekeeper Policy Library integration and deployment workflow
│   ├── mutation/            # Assign, AssignMetadata, AssignImage, and ModifySet views
│   ├── violations/          # Violation list/detail views
│   ├── types/               # TypeScript type definitions
│   ├── model.ts             # Gatekeeper CR models and dynamic constraint discovery
│   ├── resourceData.ts      # Shared Gatekeeper resource data helpers
│   └── index.tsx            # Plugin routes and sidebar entries
├── images/                  # Project and Artifact Hub screenshots
├── artifacthub-pkg.yml      # Artifact Hub package metadata
├── artifacthub-repo.yml     # Artifact Hub repository metadata
├── Makefile                 # Build and deployment automation
└── package.json             # Package metadata and npm scripts
```

## Pull requests

Keep pull requests focused, explain the user impact, and include the validation commands you ran. Add or update tests and screenshots when changing user-visible behavior.

## Releases

Releases use one reviewed pull request. Its temporary `release/<version>` branch contains the package version and Artifact Hub metadata.

1. In GitHub Actions, run **Prepare Release** from `master` with the new semantic version without a `v` prefix, for example `0.3.0`.
2. Review and merge the generated pull request. It updates `package.json`, `package-lock.json`, and `artifacthub-pkg.yml`, and requires the normal approval and DCO checks.
3. Merging the pull request starts the **Release** workflow. The workflow rebuilds the plugin, checks the archive against the committed Artifact Hub metadata, publishes a GitHub prerelease, and verifies the public download.

If `master` advances while the release pull request is open, run **Prepare Release** again with the same version instead of using GitHub's **Update branch** button. The workflow rebuilds from current `master`, verifies that the temporary branch contains only generated release metadata, and refreshes it without changing `createdAt`.

If repository workflow settings prevent GitHub Actions from opening the pull request, the workflow summary contains a link for opening it manually from the branch that was pushed. GitHub deletes the temporary release branch after merge.

Rerun a failed **Release** workflow from its existing workflow run so it keeps the original merge commit. If GitHub did not create the automatic run, dispatch **Release** manually from `master` with the same version before `master` advances again. If a checksum mismatch is discovered after merge and no tag was published, run **Prepare Release** again with the same version to create a repair pull request.

After publication, verify the version in the [Artifact Hub package listing](https://artifacthub.io/packages/headlamp/gatekeeper-headlamp-plugin/gatekeeper) and install it from Headlamp. Releases are currently marked as prereleases in both GitHub and Artifact Hub.
