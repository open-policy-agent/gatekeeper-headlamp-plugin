export type ReadinessField = 'active' | 'enforced';
export type AssessmentSeverity = 'error' | 'warning' | 'info' | 'success';

interface StatusReporter {
  id?: string;
  errors?: unknown;
  observedGeneration?: unknown;
  active?: unknown;
  enforced?: unknown;
}

export interface GatekeeperResourceData {
  metadata?: {
    generation?: unknown;
  };
  status?: {
    errors?: unknown;
    byPod?: unknown;
    observedGeneration?: unknown;
    active?: unknown;
    enforced?: unknown;
    [key: string]: unknown;
  };
}

export interface GatekeeperStatusAssessment {
  severity: AssessmentSeverity;
  title: string;
  message: string;
  details: string[];
}

function asNonEmptyArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value.filter(item => item !== null && item !== undefined && item !== '');
  }

  return value === null || value === undefined || value === '' ? [] : [value];
}

function formatValue(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function asGeneration(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function reporterName(reporter: StatusReporter, index: number): string {
  return reporter.id || `reporter ${index + 1}`;
}

export function assessGatekeeperResourceStatus(
  resource: GatekeeperResourceData,
  readinessField?: ReadinessField
): GatekeeperStatusAssessment {
  const status = resource.status;
  const globalErrors = asNonEmptyArray(status?.errors);
  const podStatuses = Array.isArray(status?.byPod)
    ? (status.byPod.filter(value => value && typeof value === 'object') as StatusReporter[])
    : [];
  const podErrors = podStatuses.flatMap((pod, index) =>
    asNonEmptyArray(pod.errors).map(error => `${reporterName(pod, index)}: ${formatValue(error)}`)
  );

  if (globalErrors.length > 0 || podErrors.length > 0) {
    return {
      severity: 'error',
      title: 'Gatekeeper reported reconciliation errors',
      message:
        'This resource is not ready. Resolve the reported controller errors before relying on it.',
      details: [...globalErrors.map(error => `Global: ${formatValue(error)}`), ...podErrors],
    };
  }

  if (!status) {
    return {
      severity: 'info',
      title: 'Readiness unknown',
      message: 'Gatekeeper has not reported controller status for this resource yet.',
      details: [],
    };
  }

  const topLevelReporter: StatusReporter = status;
  const hasTopLevelObservation =
    status.observedGeneration !== undefined ||
    (readinessField !== undefined && status[readinessField] !== undefined);
  const reporters =
    podStatuses.length > 0 ? podStatuses : hasTopLevelObservation ? [topLevelReporter] : [];

  if (reporters.length === 0) {
    return {
      severity: 'warning',
      title: 'Reconciliation pending',
      message: 'Gatekeeper has not reported an observed generation for this resource.',
      details: [],
    };
  }

  const generation = asGeneration(resource.metadata?.generation);
  if (generation === null) {
    return {
      severity: 'info',
      title: 'Readiness unknown',
      message:
        'The resource generation is unavailable, so controller status cannot be verified as current.',
      details: [],
    };
  }

  const staleReporters = reporters
    .map((reporter, index) => ({
      name: reporterName(reporter, index),
      observedGeneration: asGeneration(reporter.observedGeneration),
    }))
    .filter(reporter => reporter.observedGeneration !== generation);

  if (staleReporters.length > 0) {
    return {
      severity: 'warning',
      title: 'Reconciliation pending',
      message: `Gatekeeper has not observed the current resource generation (${generation}) on every reporting controller pod.`,
      details: staleReporters.map(
        reporter => `${reporter.name}: observed ${reporter.observedGeneration ?? 'unknown'}`
      ),
    };
  }

  if (!readinessField) {
    return {
      severity: 'info',
      title: 'Current generation observed',
      message:
        'All reporting Gatekeeper controller pods observed the current generation. This resource does not expose an explicit readiness flag, so active readiness cannot be confirmed.',
      details: [],
    };
  }

  const negativeReporters = reporters
    .map((reporter, index) => ({
      name: reporterName(reporter, index),
      value: reporter[readinessField],
    }))
    .filter(reporter => reporter.value === false);

  if (negativeReporters.length > 0) {
    return {
      severity: 'warning',
      title: readinessField === 'enforced' ? 'Not enforced' : 'Not active',
      message: `Gatekeeper reports that this resource is not ${readinessField} on one or more reporting controller pods.`,
      details: negativeReporters.map(reporter => reporter.name),
    };
  }

  const unknownReporters = reporters
    .map((reporter, index) => ({
      name: reporterName(reporter, index),
      value: reporter[readinessField],
    }))
    .filter(reporter => reporter.value !== true);

  if (unknownReporters.length > 0) {
    return {
      severity: 'warning',
      title: 'Readiness unknown',
      message: `The current generation was observed, but Gatekeeper did not positively report this resource as ${readinessField} on every reporting controller pod.`,
      details: unknownReporters.map(reporter => reporter.name),
    };
  }

  return {
    severity: 'success',
    title: readinessField === 'enforced' ? 'Enforced' : 'Active',
    message: `All reporting Gatekeeper controller pods observed the current generation and report the resource as ${readinessField}.`,
    details: [],
  };
}
