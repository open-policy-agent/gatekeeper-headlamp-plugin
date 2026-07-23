import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const expectedRouteNameReferences: Record<string, string[]> = {
  'configuration/ConfigList.tsx': ['Config'],
  'configuration/SyncSetList.tsx': ['SyncSet'],
  'constraint-template/List.tsx': ['ConstraintTemplate'],
  'constraint/List.tsx': ['Constraint'],
  'expansion/ExpansionTemplateList.tsx': ['ExpansionTemplate'],
  'externaldata/ConnectionList.tsx': ['Connection'],
  'externaldata/ProviderList.tsx': ['Provider'],
  'library/List.tsx': ['LibraryTemplate'],
  'mutation/AssignImageList.tsx': ['AssignImage'],
  'mutation/AssignList.tsx': ['Assign'],
  'mutation/AssignMetadataList.tsx': ['AssignMetadata'],
  'mutation/ModifySetList.tsx': ['ModifySet'],
  'violations/Details.tsx': ['Constraint'],
  'violations/List.tsx': ['Constraint', 'Violation'],
};

function findSourceComponents(directory: string, relativeDirectory = ''): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const relativePath = join(relativeDirectory, entry.name);
    const absolutePath = join(directory, entry.name);

    if (entry.isDirectory()) {
      return findSourceComponents(absolutePath, relativePath);
    }

    if (entry.isFile() && entry.name.endsWith('.tsx') && !entry.name.endsWith('.test.tsx')) {
      return [relativePath];
    }

    return [];
  });
}

describe('plugin route links', () => {
  it('uses the matching shared route-name constant at every Link routeName site', () => {
    const sourceDirectory = resolve(process.cwd(), 'src');
    const actualRouteNameReferences: Record<string, string[]> = {};

    findSourceComponents(sourceDirectory).forEach(relativePath => {
      const source = readFileSync(join(sourceDirectory, relativePath), 'utf8');
      const routeNameAttributes = source.match(/routeName=(?:\{[^}]+\}|"[^"]+"|'[^']+')/g) ?? [];

      if (routeNameAttributes.length === 0) {
        return;
      }

      const routeNameConstants = Array.from(
        source.matchAll(/routeName=\{RouteName\.([A-Za-z0-9_]+)\}/g),
        match => match[1]
      );

      expect(routeNameConstants, relativePath).toHaveLength(routeNameAttributes.length);
      actualRouteNameReferences[relativePath] = routeNameConstants;
    });

    expect(actualRouteNameReferences).toEqual(expectedRouteNameReferences);
  });
});
