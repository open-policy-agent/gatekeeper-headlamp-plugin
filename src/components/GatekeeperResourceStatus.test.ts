import { describe, expect, it } from 'vitest';
import { assessGatekeeperResourceStatus } from './gatekeeperStatus';

const currentGeneration = 4;

function resourceWithStatus(status: Record<string, unknown>) {
  return {
    metadata: { generation: currentGeneration },
    status,
  };
}

describe('assessGatekeeperResourceStatus', () => {
  it('never treats missing status as success', () => {
    const assessment = assessGatekeeperResourceStatus(
      {
        metadata: { generation: currentGeneration },
      },
      'enforced'
    );

    expect(assessment.severity).toBe('info');
    expect(assessment.title).toBe('Readiness unknown');
  });

  it('reports controller errors even when readiness is true', () => {
    const assessment = assessGatekeeperResourceStatus(
      resourceWithStatus({
        byPod: [
          {
            id: 'gatekeeper-0',
            observedGeneration: currentGeneration,
            enforced: true,
            errors: [{ message: 'rego compile failed' }],
          },
        ],
      }),
      'enforced'
    );

    expect(assessment.severity).toBe('error');
    expect(assessment.details[0]).toContain('gatekeeper-0');
  });

  it('reports stale observed generations as pending', () => {
    const assessment = assessGatekeeperResourceStatus(
      resourceWithStatus({
        byPod: [
          {
            id: 'gatekeeper-0',
            observedGeneration: currentGeneration - 1,
            active: true,
          },
        ],
      }),
      'active'
    );

    expect(assessment.severity).toBe('warning');
    expect(assessment.title).toBe('Reconciliation pending');
  });

  it('requires an explicit true readiness value', () => {
    const notEnforced = assessGatekeeperResourceStatus(
      resourceWithStatus({
        byPod: [
          {
            id: 'gatekeeper-0',
            observedGeneration: currentGeneration,
            enforced: false,
          },
        ],
      }),
      'enforced'
    );
    const readinessMissing = assessGatekeeperResourceStatus(
      resourceWithStatus({
        byPod: [
          {
            id: 'gatekeeper-0',
            observedGeneration: currentGeneration,
          },
        ],
      }),
      'enforced'
    );

    expect(notEnforced.severity).toBe('warning');
    expect(notEnforced.title).toBe('Not enforced');
    expect(readinessMissing.severity).toBe('warning');
    expect(readinessMissing.title).toBe('Readiness unknown');
  });

  it('reports success only when every reporter is current and explicitly ready', () => {
    const assessment = assessGatekeeperResourceStatus(
      resourceWithStatus({
        byPod: [
          {
            id: 'gatekeeper-0',
            observedGeneration: currentGeneration,
            active: true,
          },
          {
            id: 'gatekeeper-1',
            observedGeneration: currentGeneration,
            active: true,
          },
        ],
      }),
      'active'
    );

    expect(assessment.severity).toBe('success');
    expect(assessment.title).toBe('Active');
  });

  it('does not claim readiness when a resource has no explicit readiness field', () => {
    const assessment = assessGatekeeperResourceStatus(
      resourceWithStatus({
        byPod: [
          {
            id: 'gatekeeper-0',
            observedGeneration: currentGeneration,
          },
        ],
      })
    );

    expect(assessment.severity).toBe('info');
    expect(assessment.title).toBe('Current generation observed');
    expect(assessment.message).toContain('cannot be confirmed');
  });
});
