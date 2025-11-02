import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ViolationsList from '../../src/violations/List';
import { ConstraintClass } from '../../src/model';
import * as ApiProxy from '@kinvolk/headlamp-plugin/lib/ApiProxy';

jest.mock('../../src/model');

describe('ViolationsList', () => {
  let mockApiRequest: jest.Mock;

  beforeEach(() => {
    mockApiRequest = jest.fn();
    (ApiProxy as any).request = mockApiRequest;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (ConstraintClass.useApiList as jest.Mock).mockImplementation(() => {});
    render(<ViolationsList />);
    expect(screen.getByText('Loading violations...')).toBeInTheDocument();
  });

  it('displays Gatekeeper not installed message when API returns 404', async () => {
    mockApiRequest.mockRejectedValue({ status: 404, message: 'not found' });
    (ConstraintClass.useApiList as jest.Mock).mockImplementation(() => {});

    render(<ViolationsList />);

    await waitFor(() => {
      expect(screen.getByText('Gatekeeper Not Found')).toBeInTheDocument();
    });
  });

  it('renders violations when data is loaded', () => {
    const mockConstraints = [
      {
        jsonData: {
          kind: 'K8sRequiredLabels',
          metadata: { name: 'require-team-label' },
          spec: { enforcementAction: 'deny' },
          status: {
            violations: [
              {
                kind: 'Deployment',
                apiVersion: 'apps/v1',
                name: 'bad-deployment',
                namespace: 'default',
                message: 'Missing required label: team',
              },
              {
                kind: 'Pod',
                apiVersion: 'v1',
                name: 'bad-pod',
                namespace: 'kube-system',
                message: 'Missing required label: team',
              },
            ],
          },
        },
      },
    ];

    (ConstraintClass.useApiList as jest.Mock).mockImplementation((callback) => {
      callback(mockConstraints);
    });

    render(<ViolationsList />);

    expect(screen.getByText('default/bad-deployment')).toBeInTheDocument();
    expect(screen.getByText('kube-system/bad-pod')).toBeInTheDocument();
    expect(screen.getAllByText('Missing required label: team')).toHaveLength(2);
  });

  it('filters violations by resource kind', () => {
    const mockConstraints = [
      {
        jsonData: {
          kind: 'TestConstraint',
          metadata: { name: 'test-constraint' },
          spec: { enforcementAction: 'deny' },
          status: {
            violations: [
              {
                kind: 'Deployment',
                apiVersion: 'apps/v1',
                name: 'deployment1',
                message: 'Violation 1',
              },
              {
                kind: 'Pod',
                apiVersion: 'v1',
                name: 'pod1',
                message: 'Violation 2',
              },
            ],
          },
        },
      },
    ];

    (ConstraintClass.useApiList as jest.Mock).mockImplementation((callback) => {
      callback(mockConstraints);
    });

    render(<ViolationsList />);

    // Both should be visible initially
    expect(screen.getByText('deployment1')).toBeInTheDocument();
    expect(screen.getByText('pod1')).toBeInTheDocument();

    // Filter by resource kind
    const resourceKindFilter = screen.getByLabelText('Resource Kind');
    fireEvent.mouseDown(resourceKindFilter);

    const deploymentOption = screen.getByText('Deployment');
    fireEvent.click(deploymentOption);

    // Only deployment violation should be visible
    expect(screen.getByText('deployment1')).toBeInTheDocument();
    expect(screen.queryByText('pod1')).not.toBeInTheDocument();
  });

  it('filters violations by constraint kind', () => {
    const mockConstraints = [
      {
        jsonData: {
          kind: 'K8sRequiredLabels',
          metadata: { name: 'constraint1' },
          spec: { enforcementAction: 'deny' },
          status: {
            violations: [
              {
                kind: 'Pod',
                name: 'pod1',
                message: 'Violation from K8sRequiredLabels',
              },
            ],
          },
        },
      },
      {
        jsonData: {
          kind: 'K8sDenyPrivileged',
          metadata: { name: 'constraint2' },
          spec: { enforcementAction: 'warn' },
          status: {
            violations: [
              {
                kind: 'Pod',
                name: 'pod2',
                message: 'Violation from K8sDenyPrivileged',
              },
            ],
          },
        },
      },
    ];

    (ConstraintClass.useApiList as jest.Mock).mockImplementation((callback) => {
      callback(mockConstraints);
    });

    render(<ViolationsList />);

    const constraintKindFilter = screen.getByLabelText('Constraint Kind');
    fireEvent.mouseDown(constraintKindFilter);

    const k8sRequiredLabelsOption = screen.getByText('K8sRequiredLabels');
    fireEvent.click(k8sRequiredLabelsOption);

    expect(screen.getByText('pod1')).toBeInTheDocument();
    expect(screen.queryByText('pod2')).not.toBeInTheDocument();
  });

  it('filters violations by resource name', () => {
    const mockConstraints = [
      {
        jsonData: {
          kind: 'TestConstraint',
          metadata: { name: 'test-constraint' },
          spec: { enforcementAction: 'deny' },
          status: {
            violations: [
              {
                kind: 'Pod',
                name: 'frontend-pod',
                namespace: 'default',
                message: 'Violation 1',
              },
              {
                kind: 'Pod',
                name: 'backend-pod',
                namespace: 'default',
                message: 'Violation 2',
              },
            ],
          },
        },
      },
    ];

    (ConstraintClass.useApiList as jest.Mock).mockImplementation((callback) => {
      callback(mockConstraints);
    });

    render(<ViolationsList />);

    const resourceNameFilter = screen.getByLabelText('Resource Name (ns/name or name)');
    fireEvent.change(resourceNameFilter, { target: { value: 'frontend' } });

    expect(screen.getByText('default/frontend-pod')).toBeInTheDocument();
    expect(screen.queryByText('default/backend-pod')).not.toBeInTheDocument();
  });

  it('displays enforcement action chips correctly', () => {
    const mockConstraints = [
      {
        jsonData: {
          kind: 'TestConstraint1',
          metadata: { name: 'deny-constraint' },
          spec: { enforcementAction: 'deny' },
          status: {
            violations: [
              {
                kind: 'Pod',
                name: 'pod1',
                message: 'Violation with deny',
              },
            ],
          },
        },
      },
      {
        jsonData: {
          kind: 'TestConstraint2',
          metadata: { name: 'warn-constraint' },
          spec: { enforcementAction: 'warn' },
          status: {
            violations: [
              {
                kind: 'Pod',
                name: 'pod2',
                message: 'Violation with warn',
              },
            ],
          },
        },
      },
    ];

    (ConstraintClass.useApiList as jest.Mock).mockImplementation((callback) => {
      callback(mockConstraints);
    });

    render(<ViolationsList />);

    expect(screen.getAllByText('deny')).toHaveLength(1);
    expect(screen.getAllByText('warn')).toHaveLength(1);
  });

  it('shows message when no violations exist', () => {
    const mockConstraints = [
      {
        jsonData: {
          kind: 'TestConstraint',
          metadata: { name: 'test-constraint' },
          spec: { enforcementAction: 'deny' },
          status: {},
        },
      },
    ];

    (ConstraintClass.useApiList as jest.Mock).mockImplementation((callback) => {
      callback(mockConstraints);
    });

    render(<ViolationsList />);

    expect(screen.getByText('No violations found across 1 constraints.')).toBeInTheDocument();
  });

  it('handles violations without namespace correctly', () => {
    const mockConstraints = [
      {
        jsonData: {
          kind: 'TestConstraint',
          metadata: { name: 'test-constraint' },
          spec: { enforcementAction: 'deny' },
          status: {
            violations: [
              {
                kind: 'ClusterRole',
                name: 'admin-role',
                message: 'Cluster-scoped violation',
              },
            ],
          },
        },
      },
    ];

    (ConstraintClass.useApiList as jest.Mock).mockImplementation((callback) => {
      callback(mockConstraints);
    });

    render(<ViolationsList />);

    // Should display name without namespace prefix
    expect(screen.getByText('admin-role')).toBeInTheDocument();
    expect(screen.queryByText('/')).not.toBeInTheDocument();
  });
});
