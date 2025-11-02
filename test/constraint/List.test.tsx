import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ConstraintList from '../../src/constraint/List';
import { ConstraintClass } from '../../src/model';
import * as ApiProxy from '@kinvolk/headlamp-plugin/lib/ApiProxy';

jest.mock('../../src/model');

describe('ConstraintList', () => {
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
    render(<ConstraintList />);
    expect(screen.getByText('Loading constraints...')).toBeInTheDocument();
  });

  it('displays Gatekeeper not installed message when API returns 404', async () => {
    mockApiRequest.mockRejectedValue({ status: 404, message: 'not found' });
    (ConstraintClass.useApiList as jest.Mock).mockImplementation(() => {});

    render(<ConstraintList />);

    await waitFor(() => {
      expect(screen.getByText('Gatekeeper Not Found')).toBeInTheDocument();
    });

    expect(screen.getByText(/Gatekeeper does not appear to be installed/)).toBeInTheDocument();
  });

  it('renders constraints when data is loaded', () => {
    const mockConstraints = [
      {
        jsonData: {
          kind: 'K8sRequiredLabels',
          metadata: { name: 'require-team-label', creationTimestamp: '2024-01-01' },
          spec: {
            enforcementAction: 'deny',
            match: {
              kinds: [{ kinds: ['Deployment', 'Pod'] }],
            },
          },
          status: { totalViolations: 5 },
        },
      },
      {
        jsonData: {
          kind: 'K8sDenyPrivileged',
          metadata: { name: 'deny-privileged-pods', creationTimestamp: '2024-01-02' },
          spec: {
            enforcementAction: 'warn',
            match: {
              kinds: [{ kinds: ['Pod'] }],
            },
          },
          status: { totalViolations: 2 },
        },
      },
    ];

    (ConstraintClass.useApiList as jest.Mock).mockImplementation((callback) => {
      callback(mockConstraints);
    });

    render(<ConstraintList />);

    expect(screen.getByText('require-team-label')).toBeInTheDocument();
    expect(screen.getByText('deny-privileged-pods')).toBeInTheDocument();
    expect(screen.getByText('K8sRequiredLabels')).toBeInTheDocument();
    expect(screen.getByText('K8sDenyPrivileged')).toBeInTheDocument();
  });

  it('displays enforcement action chips correctly', () => {
    const mockConstraints = [
      {
        jsonData: {
          kind: 'TestConstraint',
          metadata: { name: 'deny-constraint', creationTimestamp: '2024-01-01' },
          spec: { enforcementAction: 'deny' },
          status: {},
        },
      },
      {
        jsonData: {
          kind: 'TestConstraint',
          metadata: { name: 'warn-constraint', creationTimestamp: '2024-01-02' },
          spec: { enforcementAction: 'warn' },
          status: {},
        },
      },
      {
        jsonData: {
          kind: 'TestConstraint',
          metadata: { name: 'dryrun-constraint', creationTimestamp: '2024-01-03' },
          spec: { enforcementAction: 'dryrun' },
          status: {},
        },
      },
    ];

    (ConstraintClass.useApiList as jest.Mock).mockImplementation((callback) => {
      callback(mockConstraints);
    });

    render(<ConstraintList />);

    expect(screen.getAllByText('deny')).toHaveLength(1);
    expect(screen.getAllByText('warn')).toHaveLength(1);
    expect(screen.getAllByText('dryrun')).toHaveLength(1);
  });

  it('filters constraints by kind', () => {
    const mockConstraints = [
      {
        jsonData: {
          kind: 'K8sRequiredLabels',
          metadata: { name: 'constraint1', creationTimestamp: '2024-01-01' },
          spec: { enforcementAction: 'deny' },
          status: {},
        },
      },
      {
        jsonData: {
          kind: 'K8sDenyPrivileged',
          metadata: { name: 'constraint2', creationTimestamp: '2024-01-02' },
          spec: { enforcementAction: 'warn' },
          status: {},
        },
      },
    ];

    (ConstraintClass.useApiList as jest.Mock).mockImplementation((callback) => {
      callback(mockConstraints);
    });

    render(<ConstraintList />);

    // Both should be visible initially
    expect(screen.getByText('constraint1')).toBeInTheDocument();
    expect(screen.getByText('constraint2')).toBeInTheDocument();

    // Filter by kind
    const kindFilter = screen.getByLabelText('Kind');
    fireEvent.mouseDown(kindFilter);

    const k8sRequiredLabelsOption = screen.getByText('K8sRequiredLabels');
    fireEvent.click(k8sRequiredLabelsOption);

    // Only constraint1 should be visible
    expect(screen.getByText('constraint1')).toBeInTheDocument();
    expect(screen.queryByText('constraint2')).not.toBeInTheDocument();
  });

  it('filters constraints by enforcement action', () => {
    const mockConstraints = [
      {
        jsonData: {
          kind: 'TestConstraint',
          metadata: { name: 'deny-constraint', creationTimestamp: '2024-01-01' },
          spec: { enforcementAction: 'deny' },
          status: {},
        },
      },
      {
        jsonData: {
          kind: 'TestConstraint',
          metadata: { name: 'warn-constraint', creationTimestamp: '2024-01-02' },
          spec: { enforcementAction: 'warn' },
          status: {},
        },
      },
    ];

    (ConstraintClass.useApiList as jest.Mock).mockImplementation((callback) => {
      callback(mockConstraints);
    });

    render(<ConstraintList />);

    const enforcementFilter = screen.getByLabelText('Enforcement Action');
    fireEvent.mouseDown(enforcementFilter);

    const denyOption = screen.getAllByText('deny').find(el => el.tagName === 'LI');
    if (denyOption) fireEvent.click(denyOption);

    expect(screen.getByText('deny-constraint')).toBeInTheDocument();
    expect(screen.queryByText('warn-constraint')).not.toBeInTheDocument();
  });

  it('displays violation counts correctly', () => {
    const mockConstraints = [
      {
        jsonData: {
          kind: 'TestConstraint',
          metadata: { name: 'constraint-with-violations', creationTimestamp: '2024-01-01' },
          spec: { enforcementAction: 'deny' },
          status: { totalViolations: 42 },
        },
      },
      {
        jsonData: {
          kind: 'TestConstraint',
          metadata: { name: 'constraint-no-violations', creationTimestamp: '2024-01-02' },
          spec: { enforcementAction: 'warn' },
          status: {},
        },
      },
    ];

    (ConstraintClass.useApiList as jest.Mock).mockImplementation((callback) => {
      callback(mockConstraints);
    });

    render(<ConstraintList />);

    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('shows empty state when no constraints exist', () => {
    (ConstraintClass.useApiList as jest.Mock).mockImplementation((callback) => {
      callback([]);
    });

    render(<ConstraintList />);

    expect(screen.getByText('No constraints found.')).toBeInTheDocument();
  });
});
