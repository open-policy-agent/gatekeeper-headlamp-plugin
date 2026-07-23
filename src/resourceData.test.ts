import { describe, expect, it } from 'vitest';
import { getConnectionDriver, getSyncSetGVKs } from './resourceData';

describe('custom-resource list data access', () => {
  it('reads Connection drivers from the KubeObject JSON payload', () => {
    const connection = {
      jsonData: {
        spec: {
          driver: 'pubsub',
        },
      },
    };

    expect(getConnectionDriver(connection)).toBe('pubsub');
    expect(getConnectionDriver({ jsonData: { spec: {} } })).toBeUndefined();
  });

  it('reads SyncSet kinds from spec.gvks', () => {
    const syncSet = {
      jsonData: {
        spec: {
          gvks: [
            { group: '', version: 'v1', kind: 'Pod' },
            { group: 'apps', version: 'v1', kind: 'Deployment' },
          ],
        },
      },
    };

    expect(getSyncSetGVKs(syncSet).map(gvk => gvk.kind)).toEqual(['Pod', 'Deployment']);
    expect(getSyncSetGVKs({ jsonData: { spec: {} } })).toEqual([]);
  });
});
