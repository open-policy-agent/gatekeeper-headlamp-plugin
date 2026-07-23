// Basic type definitions for Gatekeeper CRDs

export interface ConstraintTemplateSpec {
  crd: {
    spec: {
      names: {
        kind: string;
        plural?: string;
      };
      validation?: {
        openAPIV3Schema?: any;
      };
    };
  };
  targets: Array<{
    target: string;
    rego: string;
    libs?: string[];
  }>;
}

export interface ConstraintTemplateStatus {
  byPod?: Array<{
    id: string;
    observedGeneration: number;
    operations: string[];
    templateUID: string;
  }>;
  created: boolean;
}

export interface ConstraintTemplate {
  apiVersion: 'templates.gatekeeper.sh/v1' | 'templates.gatekeeper.sh/v1beta1';
  kind: 'ConstraintTemplate';
  metadata: {
    name: string;
    namespace?: string;
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
    creationTimestamp?: string;
  };
  spec: ConstraintTemplateSpec;
  status?: ConstraintTemplateStatus;
}

export interface ConstraintSpec {
  match?: {
    kinds?: Array<{
      apiGroups: string[];
      kinds: string[];
    }>;
    excludedNamespaces?: string[];
    labelSelector?: any;
    namespaceSelector?: any;
  };
  parameters?: any;
  enforcementAction?: 'warn' | 'dryrun' | 'deny';
}

export interface Violation {
  kind: string;
  apiVersion: string;
  name: string;
  namespace?: string;
  message: string;
}

export interface ConstraintStatus {
  auditTimestamp?: string;
  byPod?: Array<{
    constraintUID: string;
    enforced: boolean;
    id: string;
    observedGeneration: number;
    operations: string[];
  }>;
  totalViolations?: number;
  violations?: Violation[];
}

export interface Constraint {
  apiVersion: 'constraints.gatekeeper.sh/v1beta1';
  kind: string; // This will be the constraint type like K8sRequiredLabels
  metadata: {
    name: string;
    namespace?: string;
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
    creationTimestamp?: string;
  };
  spec: ConstraintSpec;
  status?: ConstraintStatus;
}
