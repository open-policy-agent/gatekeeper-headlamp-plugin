# ============================================================================
# Makefile for Gatekeeper Headlamp Plugin
# ============================================================================
#
# This Makefile automates the entire build and deployment process for the
# Gatekeeper Headlamp Plugin. It provides a streamlined development workflow
# with commands for building, testing, deploying, and maintaining the plugin.
#
# OVERVIEW:
# ---------
# The build process consists of:
# 1. Build: npm run build (creates dist/main.js)
# 2. Extract: npm run extract (creates .plugins/ with main.js + package.json)
# 3. Deploy: Copy .plugins/* to Headlamp plugins directory
#
# The dist/ directory is automatically cleaned after extraction since it's
# only an intermediate artifact. The .plugins/ directory contains the final
# deployment-ready package.
#
# DIRECTORY STRUCTURE:
# -------------------
# gatekeeper-headlamp-plugin/
# ├── src/                          # Source code
# ├── dist/                         # Build output (temporary, auto-cleaned)
# ├── .plugins/                     # Extracted plugin (deployment ready)
# │   ├── main.js                   # Plugin bundle
# │   └── package.json              # Plugin metadata
# └── ~/Library/Application Support/Headlamp/plugins/gatekeeper-headlamp-plugin/
#                                   # Deployment target (macOS)
#
# COMMON WORKFLOWS:
# ----------------
# First time setup:    make setup
# Daily development:    make dev
# Clean validation:     make validate
# Debug build issues:   make build-debug
#
# PLATFORM SUPPORT:
# -----------------
# Currently configured for macOS. For other platforms, update HEADLAMP_PLUGINS_DIR:
# Linux:   HEADLAMP_PLUGINS_DIR = $(HOME)/.config/Headlamp/plugins
# Windows: HEADLAMP_PLUGINS_DIR = $(APPDATA)/Headlamp/plugins
#
# DEPENDENCIES:
# ------------
# - Node.js and npm
# - @kinvolk/headlamp-plugin CLI tools
# - fswatch (optional, for watch mode)
# - curl (for Headlamp status check)
#
# ============================================================================

# ============================================================================
# VARIABLES
# ============================================================================

PLUGIN_NAME = gatekeeper-headlamp-plugin
HEADLAMP_PLUGINS_DIR = $(HOME)/Library/Application Support/Headlamp/plugins
PLUGIN_INSTALL_DIR = $(HEADLAMP_PLUGINS_DIR)/$(PLUGIN_NAME)
SOURCE_DIR = .plugins
DIST_DIR = dist

# ============================================================================
# DEFAULT TARGET
# ============================================================================

.PHONY: all
all: build

# ============================================================================
# DEPENDENCY MANAGEMENT
# ============================================================================

# Install npm dependencies
.PHONY: install
install:
	@echo "Installing dependencies..."
	npm install

# ============================================================================
# BUILD TARGETS
# ============================================================================

# Build the plugin (standard build with cleanup)
# This is the recommended build command for normal development
.PHONY: build
build:
	@echo "Building plugin..."
	npm run build
	@echo "Extracting plugin..."
	npm run extract
	@echo "Cleaning intermediate build artifacts..."
	@rm -rf $(DIST_DIR)

# Build without cleaning intermediate files (useful for debugging)
# Use this when you need to inspect the dist/ directory contents
.PHONY: build-debug
build-debug:
	@echo "Building plugin (debug mode)..."
	npm run build
	@echo "Extracting plugin..."
	npm run extract

# Extract plugin files to .plugins directory
# This copies dist/main.js to .plugins/main.js and adds package.json
.PHONY: extract
extract:
	@echo "Extracting plugin..."
	npm run extract

# ============================================================================
# DEPLOYMENT TARGETS
# ============================================================================

# Deploy the plugin to Headlamp plugins directory
# Automatically builds if .plugins directory doesn't exist
.PHONY: deploy
deploy:
	@echo "Deploying plugin to Headlamp..."
	@if [ ! -d "$(SOURCE_DIR)" ]; then \
		echo "Source directory $(SOURCE_DIR) not found. Running build first..."; \
		$(MAKE) build; \
	fi
	@mkdir -p "$(PLUGIN_INSTALL_DIR)"
	@cp -r $(SOURCE_DIR)/* "$(PLUGIN_INSTALL_DIR)/"
	@echo "Plugin deployed to: $(PLUGIN_INSTALL_DIR)"

# ============================================================================
# CLEANUP TARGETS
# ============================================================================

# Clean build artifacts (dist/, .plugins/, cache)
.PHONY: clean
clean:
	@echo "Cleaning build artifacts..."
	@rm -rf $(DIST_DIR)
	@rm -rf $(SOURCE_DIR)
	@rm -rf node_modules/.cache

# Full clean including node_modules (nuclear option)
.PHONY: clean-all
clean-all: clean
	@echo "Removing node_modules..."
	@rm -rf node_modules

# ============================================================================
# DEVELOPMENT WORKFLOWS
# ============================================================================

# Main development workflow - build and deploy in one step
# This is the most common command for daily development
.PHONY: dev
dev: build deploy
	@echo "Development build and deploy complete!"

# Full development setup (install, build, deploy)
# Perfect for first-time setup or after git clone
.PHONY: setup
setup: install build deploy
	@echo "Full development setup complete!"

# Start development server (for live development)
.PHONY: start
start:
	@echo "Starting development server..."
	npm run start

# ============================================================================
# CODE QUALITY TARGETS
# ============================================================================

# Run ESLint
.PHONY: lint
lint:
	@echo "Running linter..."
	npm run lint

# Auto-fix ESLint issues
.PHONY: lint-fix
lint-fix:
	@echo "Fixing linting issues..."
	npm run lint-fix

# Run TypeScript compiler check
.PHONY: typecheck
typecheck:
	@echo "Running TypeScript compiler check..."
	npm run tsc

# Run Prettier code formatting
.PHONY: format
format:
	@echo "Formatting code..."
	npm run format

# Run test suite
.PHONY: test
test:
	@echo "Running tests..."
	npm run test

# ============================================================================
# MONITORING & VALIDATION TARGETS
# ============================================================================

# Check if plugin is installed in Headlamp
.PHONY: check-install
check-install:
	@echo "Checking plugin installation..."
	@if [ -d "$(PLUGIN_INSTALL_DIR)" ]; then \
		echo "✅ Plugin is installed at: $(PLUGIN_INSTALL_DIR)"; \
		ls -la "$(PLUGIN_INSTALL_DIR)"; \
	else \
		echo "❌ Plugin is not installed"; \
	fi

# Check if Headlamp is running on localhost:4466
.PHONY: check-headlamp
check-headlamp:
	@echo "Checking if Headlamp is running..."
	@curl -s http://localhost:4466/plugins > /dev/null && echo "✅ Headlamp is running on http://localhost:4466" || echo "❌ Headlamp is not running on localhost:4466"

# Validate that build is working correctly
# Does a clean build and validates required files are created
.PHONY: validate
validate: clean build
	@echo "Validating build..."
	@if [ -f "$(SOURCE_DIR)/main.js" ] && [ -f "$(SOURCE_DIR)/package.json" ]; then \
		echo "✅ Build validation passed"; \
	else \
		echo "❌ Build validation failed"; \
		exit 1; \
	fi

# ============================================================================
# UTILITY TARGETS
# ============================================================================

# Remove installed plugin from Headlamp
.PHONY: uninstall
uninstall:
	@echo "Uninstalling plugin..."
	@rm -rf "$(PLUGIN_INSTALL_DIR)"
	@echo "Plugin uninstalled"

# Watch mode for development (requires fswatch on macOS)
# Automatically rebuilds and deploys when source files change
.PHONY: watch
watch:
	@echo "Starting watch mode..."
	@echo "Press Ctrl+C to stop"
	@while true; do \
		echo "Watching for changes..."; \
		fswatch -1 src/ || (echo "fswatch not found, using basic watch..."; sleep 5); \
		echo "Changes detected, rebuilding..."; \
		$(MAKE) dev; \
	done

# ============================================================================
# HELP & DOCUMENTATION
# ============================================================================

# Show comprehensive help information
.PHONY: help
help:
	@echo "============================================================================"
	@echo "Gatekeeper Headlamp Plugin Makefile"
	@echo "============================================================================"
	@echo ""
	@echo "COMMON WORKFLOWS:"
	@echo "  make setup      # First time: install, build, and deploy"
	@echo "  make dev        # Development: build and deploy"
	@echo "  make validate   # Ensure everything builds correctly"
	@echo "  make clean dev  # Clean build and deploy"
	@echo ""
	@echo "BUILD & EXTRACT:"
	@echo "  install         Install npm dependencies"
	@echo "  build           Build plugin (cleans intermediate files automatically)"
	@echo "  build-debug     Build plugin keeping intermediate files for debugging"
	@echo "  extract         Extract plugin files to .plugins directory"
	@echo "  clean           Clean build artifacts (dist/, .plugins/, cache)"
	@echo "  clean-all       Clean everything including node_modules"
	@echo ""
	@echo "DEPLOYMENT:"
	@echo "  deploy          Deploy plugin to Headlamp plugins directory"
	@echo "  check-install   Check if plugin is installed in Headlamp"
	@echo "  uninstall       Remove plugin from Headlamp"
	@echo ""
	@echo "DEVELOPMENT:"
	@echo "  start           Start headlamp-plugin development server"
	@echo "  watch           Watch for changes and auto-rebuild (requires fswatch)"
	@echo ""
	@echo "CODE QUALITY:"
	@echo "  lint            Run ESLint"
	@echo "  lint-fix        Auto-fix ESLint issues"
	@echo "  typecheck       Run TypeScript compiler check"
	@echo "  format          Run Prettier code formatting"
	@echo "  test            Run test suite"
	@echo ""
	@echo "MONITORING:"
	@echo "  check-headlamp  Check if Headlamp is running on localhost:4466"
	@echo "  validate        Clean build with validation checks"
	@echo ""
	@echo "UTILITIES:"
	@echo "  help            Show this help message"
	@echo ""
	@echo "TROUBLESHOOTING:"
	@echo "  Plugin not loading?     make check-install && make check-headlamp"
	@echo "  Build failures?         make clean-all install build"
	@echo "  Need to debug build?    make build-debug"
	@echo ""
	@echo "For more information, see the header comments in this Makefile."
	@echo "============================================================================"

# ============================================================================
# END OF MAKEFILE
# ============================================================================
