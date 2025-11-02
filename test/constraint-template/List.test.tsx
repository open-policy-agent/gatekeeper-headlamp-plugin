import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ConstraintTemplateList from '../../src/constraint-template/List';
import * as model from '../../src/model';

// Mock the model module
jest.mock('../../src/model', () => ({
  ConstraintTemplateClass: {
    useApiList: jest.fn(),
  },
}));

// Mock ApiProxy
const mockApiRequest = jest.fn();
jest.mock('@kinvolk/headlamp-plugin/lib/ApiProxy', () => ({
  request: mockApiRequest,
}));

describe('ConstraintTemplateList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiRequest.mockResolvedValue({});
  });

  it('renders loading state initially', () => {
    render(<ConstraintTemplateList />);
    expect(screen.getByText('Loading constraint templates...')).toBeInTheDocument();
  });

  it('displays Gatekeeper not installed message when API returns 404', async () => {
    mockApiRequest.mockRejectedValue({ status: 404, message: 'not found' });
    (model.ConstraintTemplateClass.useApiList as jest.Mock).mockImplementation(() => {});

    render(<ConstraintTemplateList />);

    await waitFor(() => {
      expect(screen.getByText('Gatekeeper Not Found')).toBeInTheDocument();
    });

    expect(screen.getByText(/Gatekeeper does not appear to be installed/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Install Gatekeeper/i })).toBeInTheDocument();
  });

  it('renders constraint templates when data is loaded', () => {
    const mockTemplates = [
      {
        jsonData: {
          metadata: { name: 'k8srequiredlabels', creationTimestamp: '2024-01-01' },
          spec: {
            crd: { spec: { names: { kind: 'K8sRequiredLabels' } } },
            targets: [{ target: 'admission.k8s.gatekeeper.sh' }],
          },
          status: { created: true },
        },
      },
      {
        jsonData: {
          metadata: { name: 'k8sdenyprivileged', creationTimestamp: '2024-01-02' },
          spec: {
            crd: { spec: { names: { kind: 'K8sDenyPrivileged' } } },
            targets: [{ target: 'admission.k8s.gatekeeper.sh' }],
          },
          status: { created: true },
        },
      },
    ];

    (model.ConstraintTemplateClass.useApiList as jest.Mock).mockImplementation((callback) => {
      callback(mockTemplates);
    });

    render(<ConstraintTemplateList />);

    expect(screen.getByText('k8srequiredlabels')).toBeInTheDocument();
    expect(screen.getByText('k8sdenyprivileged')).toBeInTheDocument();
    expect(screen.getByText('K8sRequiredLabels')).toBeInTheDocument();
    expect(screen.getByText('K8sDenyPrivileged')).toBeInTheDocument();
  });

  it('filters templates by target', () => {
    const mockTemplates = [
      {
        jsonData: {
          metadata: { name: 'template1', creationTimestamp: '2024-01-01' },
          spec: {
            crd: { spec: { names: { kind: 'Template1' } } },
            targets: [{ target: 'admission.k8s.gatekeeper.sh' }],
          },
          status: { created: true },
        },
      },
      {
        jsonData: {
          metadata: { name: 'template2', creationTimestamp: '2024-01-02' },
          spec: {
            crd: { spec: { names: { kind: 'Template2' } } },
            targets: [{ target: 'validation.gatekeeper.sh' }],
          },
          status: { created: true },
        },
      },
    ];

    (model.ConstraintTemplateClass.useApiList as jest.Mock).mockImplementation((callback) => {
      callback(mockTemplates);
    });

    render(<ConstraintTemplateList />);

    // Both templates should be visible initially
    expect(screen.getByText('template1')).toBeInTheDocument();
    expect(screen.getByText('template2')).toBeInTheDocument();

    // Filter by target
    const filterSelect = screen.getByLabelText('Filter by Target');
    fireEvent.mouseDown(filterSelect);

    const admissionOption = screen.getByText('admission.k8s.gatekeeper.sh');
    fireEvent.click(admissionOption);

    // Only template1 should be visible
    expect(screen.getByText('template1')).toBeInTheDocument();
    expect(screen.queryByText('template2')).not.toBeInTheDocument();
  });

  it('shows empty state when no templates exist', () => {
    (ConstraintTemplateClass.useApiList as jest.Mock).mockImplementation((callback) => {
      callback([]);
    });

    render(<ConstraintTemplateList />);

    expect(screen.getByText('No constraint templates found.')).toBeInTheDocument();
  });

  it('displays status correctly', () => {
    const mockTemplates = [
      {
        jsonData: {
          metadata: { name: 'ready-template', creationTimestamp: '2024-01-01' },
          spec: {
            crd: { spec: { names: { kind: 'ReadyTemplate' } } },
            targets: [{ target: 'admission.k8s.gatekeeper.sh' }],
          },
          status: { created: true },
        },
      },
      {
        jsonData: {
          metadata: { name: 'not-ready-template', creationTimestamp: '2024-01-02' },
          spec: {
            crd: { spec: { names: { kind: 'NotReadyTemplate' } } },
            targets: [{ target: 'admission.k8s.gatekeeper.sh' }],
          },
          status: { created: false },
        },
      },
    ];

    (model.ConstraintTemplateClass.useApiList as jest.Mock).mockImplementation((callback) => {
      callback(mockTemplates);
    });

    render(<ConstraintTemplateList />);

    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(screen.getByText('Not Ready')).toBeInTheDocument();
  });

  it('navigates to Gatekeeper helm chart when install button is clicked', async () => {
    const mockPush = jest.fn();
    jest.spyOn(require('react-router-dom'), 'useHistory').mockReturnValue({ push: mockPush });

    mockApiRequest.mockRejectedValue({ status: 404 });

    render(<ConstraintTemplateList />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Install Gatekeeper/i })).toBeInTheDocument();
    });

    const installButton = screen.getByRole('button', { name: /Install Gatekeeper/i });
    fireEvent.click(installButton);

    expect(mockPush).toHaveBeenCalledWith('/c/test-cluster/helm/gatekeeper/charts/gatekeeper');
  });
});
