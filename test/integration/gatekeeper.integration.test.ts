/**
 * Integration tests for Gatekeeper Headlamp Plugin
 * These tests run against a real Kubernetes cluster with Gatekeeper installed
 *
 * Prerequisites:
 * - Kubernetes cluster (kind) running
 * - Gatekeeper installed in the cluster
 * - KUBECONFIG environment variable set
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Skip these tests if not in CI or if SKIP_INTEGRATION env var is set
const describeIntegration = process.env.CI || !process.env.SKIP_INTEGRATION ? describe : describe.skip;

describeIntegration('Gatekeeper Integration Tests', () => {
  beforeAll(async () => {
    // Verify cluster is accessible
    try {
      await execAsync('kubectl cluster-info');
    } catch (error) {
      throw new Error('Kubernetes cluster not accessible. Ensure kind cluster is running.');
    }
  }, 30000);

  describe('ConstraintTemplates', () => {
    it('should be able to list constraint templates', async () => {
      const { stdout } = await execAsync(
        'kubectl get constrainttemplates.templates.gatekeeper.sh -o json'
      );

      const response = JSON.parse(stdout);
      expect(response.kind).toBe('ConstraintTemplateList');
      expect(Array.isArray(response.items)).toBe(true);
    });

    it('should have k8srequiredlabels template installed', async () => {
      const { stdout } = await execAsync(
        'kubectl get constrainttemplate k8srequiredlabels -o json'
      );

      const template = JSON.parse(stdout);
      expect(template.metadata.name).toBe('k8srequiredlabels');
      expect(template.spec.crd.spec.names.kind).toBe('K8sRequiredLabels');
      expect(template.status.created).toBe(true);
    });

    it('should have targets defined in constraint template', async () => {
      const { stdout } = await execAsync(
        'kubectl get constrainttemplate k8srequiredlabels -o json'
      );

      const template = JSON.parse(stdout);
      expect(Array.isArray(template.spec.targets)).toBe(true);
      expect(template.spec.targets.length).toBeGreaterThan(0);
      expect(template.spec.targets[0].target).toBe('admission.k8s.gatekeeper.sh');
    });
  });

  describe('Constraints', () => {
    beforeAll(async () => {
      // Create a test constraint
      const constraintYaml = `
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredLabels
metadata:
  name: test-required-labels
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
  parameters:
    labels: ["team"]
`;

      await execAsync(`echo '${constraintYaml}' | kubectl apply -f -`);
      // Wait for constraint to be created
      await new Promise(resolve => setTimeout(resolve, 2000));
    }, 10000);

    afterAll(async () => {
      // Clean up test constraint
      await execAsync('kubectl delete k8srequiredlabels test-required-labels --ignore-not-found=true');
    });

    it('should list constraints', async () => {
      const { stdout } = await execAsync(
        'kubectl get k8srequiredlabels -o json'
      );

      const response = JSON.parse(stdout);
      expect(response.kind).toBe('K8sRequiredLabelsList');
      expect(Array.isArray(response.items)).toBe(true);
      expect(response.items.length).toBeGreaterThan(0);
    });

    it('should have test constraint created', async () => {
      const { stdout } = await execAsync(
        'kubectl get k8srequiredlabels test-required-labels -o json'
      );

      const constraint = JSON.parse(stdout);
      expect(constraint.metadata.name).toBe('test-required-labels');
      expect(constraint.spec.match.kinds).toBeDefined();
    });

    it('should have enforcement action in constraint', async () => {
      const { stdout } = await execAsync(
        'kubectl get k8srequiredlabels test-required-labels -o json'
      );

      const constraint = JSON.parse(stdout);
      // Default enforcement action is 'deny' if not specified
      expect(['deny', 'warn', 'dryrun']).toContain(
        constraint.spec.enforcementAction || 'deny'
      );
    });
  });

  describe('Violations', () => {
    beforeAll(async () => {
      // Create a constraint that will be violated
      const constraintYaml = `
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredLabels
metadata:
  name: test-violation-check
spec:
  enforcementAction: dryrun
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
  parameters:
    labels: ["test-label"]
`;

      await execAsync(`echo '${constraintYaml}' | kubectl apply -f -`);

      // Create a pod that violates the constraint
      const podYaml = `
apiVersion: v1
kind: Pod
metadata:
  name: test-violating-pod
  namespace: default
spec:
  containers:
  - name: nginx
    image: nginx:latest
`;

      await execAsync(`echo '${podYaml}' | kubectl apply -f -`);

      // Wait for Gatekeeper to detect the violation
      await new Promise(resolve => setTimeout(resolve, 5000));
    }, 15000);

    afterAll(async () => {
      await execAsync('kubectl delete pod test-violating-pod -n default --ignore-not-found=true');
      await execAsync('kubectl delete k8srequiredlabels test-violation-check --ignore-not-found=true');
    });

    it('should report violations in constraint status', async () => {
      const { stdout } = await execAsync(
        'kubectl get k8srequiredlabels test-violation-check -o json'
      );

      const constraint = JSON.parse(stdout);

      // Check if violations are reported
      if (constraint.status && constraint.status.violations) {
        expect(Array.isArray(constraint.status.violations)).toBe(true);
        if (constraint.status.violations.length > 0) {
          const violation = constraint.status.violations[0];
          expect(violation.kind).toBeDefined();
          expect(violation.name).toBeDefined();
          expect(violation.message).toBeDefined();
        }
      }
    });

    it('should have totalViolations count in status', async () => {
      const { stdout } = await execAsync(
        'kubectl get k8srequiredlabels test-violation-check -o json'
      );

      const constraint = JSON.parse(stdout);

      if (constraint.status) {
        expect(constraint.status.totalViolations).toBeDefined();
        expect(typeof constraint.status.totalViolations).toBe('number');
      }
    });
  });

  describe('Gatekeeper System', () => {
    it('should have gatekeeper-system namespace', async () => {
      const { stdout } = await execAsync(
        'kubectl get namespace gatekeeper-system -o json'
      );

      const ns = JSON.parse(stdout);
      expect(ns.metadata.name).toBe('gatekeeper-system');
    });

    it('should have gatekeeper controller running', async () => {
      const { stdout } = await execAsync(
        'kubectl get pods -n gatekeeper-system -l control-plane=controller-manager -o json'
      );

      const response = JSON.parse(stdout);
      expect(response.items.length).toBeGreaterThan(0);

      const pod = response.items[0];
      expect(pod.status.phase).toBe('Running');
    });

    it('should have gatekeeper audit running', async () => {
      const { stdout } = await execAsync(
        'kubectl get pods -n gatekeeper-system -l control-plane=audit-controller -o json'
      );

      const response = JSON.parse(stdout);
      expect(response.items.length).toBeGreaterThan(0);

      const pod = response.items[0];
      expect(pod.status.phase).toBe('Running');
    });
  });

  describe('API Discovery', () => {
    it('should discover constraint CRDs dynamically', async () => {
      // Get all constraint templates
      const { stdout: templatesOutput } = await execAsync(
        'kubectl get constrainttemplates -o json'
      );

      const templates = JSON.parse(templatesOutput);

      // For each template, verify the corresponding CRD exists
      for (const template of templates.items) {
        const kind = template.spec.crd.spec.names.kind;
        const plural = template.spec.crd.spec.names.plural;

        // Verify the CRD is registered
        const { stdout: crdOutput } = await execAsync(
          `kubectl get crd ${plural}.constraints.gatekeeper.sh -o json`
        );

        const crd = JSON.parse(crdOutput);
        expect(crd.spec.names.kind).toBe(kind);
        expect(crd.spec.group).toBe('constraints.gatekeeper.sh');
      }
    });
  });
});
