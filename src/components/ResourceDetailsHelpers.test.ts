import { describe, expect, it, vi } from 'vitest';

vi.mock('@kinvolk/headlamp-plugin/lib/lib/k8s', () => ({
  useCluster: () => null,
}));
import { buildClusterRedirectPath } from './ResourceDeleteButton';
import { getResourceErrorPresentation } from './ResourceDetailsState';

describe('buildClusterRedirectPath', () => {
  it('preserves the selected Headlamp cluster', () => {
    expect(
      buildClusterRedirectPath(
        '/c/development/gatekeeper/mutations/assigns/example',
        '/gatekeeper/mutations/assigns'
      )
    ).toBe('/c/development/gatekeeper/mutations/assigns');
  });

  it('uses the list route directly outside a cluster-prefixed URL', () => {
    expect(
      buildClusterRedirectPath(
        '/gatekeeper/configuration/configs/example',
        '/gatekeeper/configuration/configs'
      )
    ).toBe('/gatekeeper/configuration/configs');
  });
});

describe('getResourceErrorPresentation', () => {
  it('renders a stale or deleted resource as not found', () => {
    const error = Object.assign(new Error('not found'), { status: 404 });
    const presentation = getResourceErrorPresentation(error, 'Assign', 'example');

    expect(presentation.title).toBe('Assign not found');
    expect(presentation.message).toContain('may have been deleted');
  });

  it('explains RBAC denials', () => {
    const error = Object.assign(new Error('forbidden'), { status: 403 });
    const presentation = getResourceErrorPresentation(error, 'Provider', 'external-data');

    expect(presentation.title).toBe('Access denied');
    expect(presentation.message).toContain('RBAC');
  });

  it('surfaces network errors', () => {
    const presentation = getResourceErrorPresentation(
      new Error('network connection lost'),
      'Config',
      'config'
    );

    expect(presentation.title).toBe('Unable to load Config');
    expect(presentation.message).toBe('network connection lost');
  });
});
