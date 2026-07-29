import { describe, expect, it, vi } from 'vitest';

const crdMocks = vi.hoisted(() => ({
  makeCustomResourceClass: vi.fn((options: unknown) => options),
}));

vi.mock('@kinvolk/headlamp-plugin/lib/ApiProxy', () => ({
  request: vi.fn(),
}));

vi.mock('@kinvolk/headlamp-plugin/lib/lib/k8s/crd', () => ({
  makeCustomResourceClass: crdMocks.makeCustomResourceClass,
}));

import {
  AssignClass,
  AssignImageClass,
  AssignMetadataClass,
  ConfigClass,
  ConnectionClass,
  ExpansionTemplateClass,
  ModifySetClass,
  ProviderClass,
  SyncSetClass,
} from './model';

const mutationApiVersions = [
  { group: 'mutations.gatekeeper.sh', version: 'v1' },
  { group: 'mutations.gatekeeper.sh', version: 'v1beta1' },
  { group: 'mutations.gatekeeper.sh', version: 'v1alpha1' },
];

describe('Gatekeeper custom-resource model definitions', () => {
  it.each([
    ['Assign', AssignClass, 'Assign', 'assign'],
    ['AssignMetadata', AssignMetadataClass, 'AssignMetadata', 'assignmetadata'],
    ['AssignImage', AssignImageClass, 'AssignImage', 'assignimage'],
    ['ModifySet', ModifySetClass, 'ModifySet', 'modifyset'],
  ])(
    'keeps the intentional mutation REST plural for %s',
    (_label, resourceClass, singular, plural) => {
      expect(resourceClass).toEqual({
        apiInfo: mutationApiVersions,
        isNamespaced: false,
        singularName: singular,
        pluralName: plural,
      });
    }
  );

  it('keeps Config namespaced while SyncSet remains cluster-scoped', () => {
    expect(ConfigClass).toEqual({
      apiInfo: [{ group: 'config.gatekeeper.sh', version: 'v1alpha1' }],
      isNamespaced: true,
      singularName: 'Config',
      pluralName: 'configs',
    });
    expect(SyncSetClass).toEqual({
      apiInfo: [{ group: 'syncset.gatekeeper.sh', version: 'v1alpha1' }],
      isNamespaced: false,
      singularName: 'SyncSet',
      pluralName: 'syncsets',
    });
  });

  it('keeps Providers cluster-scoped and Connections namespaced across supported versions', () => {
    expect(ProviderClass).toEqual({
      apiInfo: [
        { group: 'externaldata.gatekeeper.sh', version: 'v1beta1' },
        { group: 'externaldata.gatekeeper.sh', version: 'v1alpha1' },
      ],
      isNamespaced: false,
      singularName: 'Provider',
      pluralName: 'providers',
    });
    expect(ConnectionClass).toEqual({
      apiInfo: [
        { group: 'connection.gatekeeper.sh', version: 'v1alpha1' },
        { group: 'connection.gatekeeper.sh', version: 'v1beta1' },
      ],
      isNamespaced: true,
      singularName: 'Connection',
      pluralName: 'connections',
    });
  });

  it('keeps the generated ExpansionTemplate REST plural instead of English pluralizing it', () => {
    expect(ExpansionTemplateClass).toEqual({
      apiInfo: [
        { group: 'expansion.gatekeeper.sh', version: 'v1alpha1' },
        { group: 'expansion.gatekeeper.sh', version: 'v1beta1' },
      ],
      isNamespaced: false,
      singularName: 'ExpansionTemplate',
      pluralName: 'expansiontemplate',
    });
  });
});
