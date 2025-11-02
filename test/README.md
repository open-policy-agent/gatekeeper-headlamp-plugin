# Test Suite

This directory contains comprehensive tests for the Gatekeeper Headlamp Plugin.

## Test Structure

```
test/
├── setup.ts                    # Jest setup and mocks
├── constraint-template/        # ConstraintTemplate component tests
│   └── List.test.tsx
├── constraint/                 # Constraint component tests
│   └── List.test.tsx
├── violations/                 # Violations component tests
│   └── List.test.tsx
└── integration/                # Integration tests with real cluster
    └── gatekeeper.integration.test.ts
```

## Test Types

### Unit Tests

Unit tests for React components and utilities. These tests:
- Mock external dependencies (Headlamp API, react-router, etc.)
- Test component rendering and behavior
- Test user interactions
- Verify correct data handling

**Run unit tests:**
```bash
npm test
```

**Run unit tests with coverage:**
```bash
npm run test:coverage
```

**Run unit tests in watch mode:**
```bash
npm run test:watch
```

### Integration Tests

Integration tests that run against a real Kubernetes cluster with Gatekeeper installed. These tests:
- Verify actual Kubernetes API interactions
- Test constraint template creation and discovery
- Test constraint creation and enforcement
- Test violation detection and reporting

**Prerequisites for integration tests:**
- Kubernetes cluster (kind) running
- Gatekeeper installed
- kubectl configured

**Run integration tests:**
```bash
npm run test:integration
```

**Skip integration tests:**
```bash
SKIP_INTEGRATION=1 npm test
```

## Coverage Thresholds

The project maintains the following coverage thresholds:
- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

## CI/CD

Tests run automatically in GitHub Actions on:
- Every push to `master`/`main` branches
- Every pull request

The CI pipeline:
1. Runs linting and type checking
2. Runs unit tests with coverage
3. Creates a kind cluster
4. Installs Gatekeeper
5. Runs integration tests
6. Builds the plugin
7. Uploads coverage to Codecov

## Writing Tests

### Component Tests

```typescript
import { render, screen } from '@testing-library/react';
import MyComponent from '../../src/MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### Integration Tests

```typescript
import { execAsync } from './utils';

describe('Integration Test', () => {
  it('should interact with Kubernetes', async () => {
    const { stdout } = await execAsync('kubectl get pods');
    expect(stdout).toContain('Running');
  });
});
```

## Debugging Tests

### Run specific test file:
```bash
npm test -- path/to/test.test.tsx
```

### Run tests matching pattern:
```bash
npm test -- --testNamePattern="should render"
```

### Debug mode:
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

## Mocking

The test setup (`setup.ts`) provides mocks for:
- `@kinvolk/headlamp-plugin/lib/CommonComponents`
- `@kinvolk/headlamp-plugin/lib/lib/k8s/cluster`
- `@kinvolk/headlamp-plugin/lib/lib/k8s/crd`
- `@kinvolk/headlamp-plugin/lib/ApiProxy`
- `react-router-dom`

Additional mocks can be added in individual test files as needed.
