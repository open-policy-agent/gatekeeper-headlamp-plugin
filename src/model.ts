import * as ApiProxyModuleFromLib from '@kinvolk/headlamp-plugin/lib/ApiProxy';
import { makeCustomResourceClass } from '@kinvolk/headlamp-plugin/lib/lib/k8s/crd';
import React from 'react';

let effectiveRequestFunc: ((url: string, M?: any, O?: any, P?: any) => Promise<any>) | undefined =
  undefined;

if (ApiProxyModuleFromLib) {
  const moduleAsAny = ApiProxyModuleFromLib as any;
  if (typeof moduleAsAny.request === 'function') {
    effectiveRequestFunc = moduleAsAny.request;
  } else if (typeof moduleAsAny.default === 'function') {
    effectiveRequestFunc = moduleAsAny.default;
  } else if (
    moduleAsAny.default &&
    typeof moduleAsAny.default === 'object' &&
    typeof moduleAsAny.default.request === 'function'
  ) {
    effectiveRequestFunc = moduleAsAny.default.request;
  } else {
    console.error(
      '[model.ts] Top-level: Failed to assign effectiveRequestFunc. No suitable function found in ApiProxyModuleFromLib or its .default property.'
    );
  }
} else {
  console.error(
    '[model.ts] Top-level: ApiProxyModuleFromLib is null or undefined. Cannot assign effectiveRequestFunc.'
  );
}

const constraintTemplateApiVersions = ['v1', 'v1beta1'] as const;
const apiGatekeeperTemplatesGroupVersion = constraintTemplateApiVersions.map(version => ({
  group: 'templates.gatekeeper.sh',
  version,
}));

export interface ConstraintTypeDefinition {
  kind: string;
  plural: string;
}

export interface ConstraintApiError extends Error {
  status?: number;
  json?: {
    code?: number;
    message?: string;
    reason?: string;
  };
  response?: {
    status?: number;
    data?: {
      code?: number;
      message?: string;
      reason?: string;
    };
  };
}

interface ConstraintGetState {
  constraintPlural: string | null;
  error: ConstraintApiError | null;
  loading: boolean;
}

export const ConstraintTemplateClass = makeCustomResourceClass({
  apiInfo: apiGatekeeperTemplatesGroupVersion,
  isNamespaced: false,
  singularName: 'constrainttemplate',
  pluralName: 'constrainttemplates',
});

function getApiErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  const apiError = error as ConstraintApiError;
  return apiError.status ?? apiError.response?.status ?? apiError.json?.code;
}

export function isNotFoundError(error: unknown): boolean {
  if (getApiErrorStatus(error) === 404) {
    return true;
  }

  if (!error || typeof error !== 'object') {
    return false;
  }

  const apiError = error as ConstraintApiError;
  return apiError.json?.reason === 'NotFound' || apiError.response?.data?.reason === 'NotFound';
}

function normalizeConstraintApiError(error: unknown): ConstraintApiError {
  const apiError = error as Partial<ConstraintApiError> | null | undefined;
  const message = apiError?.json?.message || apiError?.response?.data?.message;
  const normalizedError =
    error instanceof Error
      ? (error as ConstraintApiError)
      : Object.assign(new Error(message || 'The Kubernetes API request failed.'), apiError);
  const status = getApiErrorStatus(error);

  if (status !== undefined && normalizedError.status === undefined) {
    normalizedError.status = status;
  }
  if (!normalizedError.json && apiError?.response?.data) {
    normalizedError.json = apiError.response.data;
  }

  return normalizedError;
}

function makeConstraintNotFoundError(message: string): ConstraintApiError {
  return Object.assign(new Error(message), {
    status: 404,
    json: {
      code: 404,
      message,
      reason: 'NotFound',
    },
  });
}

export async function requestConstraintTemplates(name?: string): Promise<any> {
  if (typeof effectiveRequestFunc !== 'function') {
    throw new Error('API request function not available for ConstraintTemplates.');
  }

  let lastNotFoundError: unknown;
  for (const version of constraintTemplateApiVersions) {
    const suffix = name ? `/${name}` : '';
    try {
      return await effectiveRequestFunc(
        `/apis/templates.gatekeeper.sh/${version}/constrainttemplates${suffix}`
      );
    } catch (error: unknown) {
      if (isNotFoundError(error)) {
        lastNotFoundError = error;
        continue;
      }
      throw error;
    }
  }

  throw lastNotFoundError ?? new Error('No supported ConstraintTemplate API version is available.');
}

export function getConstraintTypeDefinitions(templatesResponse: any): ConstraintTypeDefinition[] {
  if (!Array.isArray(templatesResponse?.items)) {
    return [];
  }

  const definitionsByKey = new Map<string, ConstraintTypeDefinition>();

  templatesResponse.items.forEach((template: any, index: number) => {
    const names = template?.spec?.crd?.spec?.names;
    const kind = typeof names?.kind === 'string' ? names.kind.trim() : '';

    if (!kind) {
      console.warn(
        `[model.ts] getConstraintTypeDefinitions: Template item [${index}] is missing a Kubernetes kind. Skipping.`
      );
      return;
    }

    // Gatekeeper permits ConstraintTemplates to omit names.plural and generates the
    // constraint CRD resource name from the lower-cased Kind in that case.
    const explicitPlural =
      typeof names?.plural === 'string' ? names.plural.trim().toLowerCase() : '';
    const plural = explicitPlural || kind.toLowerCase();

    definitionsByKey.set(`${kind}\u0000${plural}`, { kind, plural });
  });

  return Array.from(definitionsByKey.values()).sort(
    (left, right) => left.kind.localeCompare(right.kind) || left.plural.localeCompare(right.plural)
  );
}

async function discoverConstraintTypes(): Promise<ConstraintTypeDefinition[]> {
  return getConstraintTypeDefinitions(await requestConstraintTemplates());
}

export function resolveConstraintPlural(
  definitions: ConstraintTypeDefinition[],
  kind: string
): string | null {
  const matchingPlurals = Array.from(
    new Set(definitions.filter(definition => definition.kind === kind).map(({ plural }) => plural))
  );

  if (matchingPlurals.length === 0) {
    return null;
  }

  if (matchingPlurals.length > 1) {
    throw new Error(
      `Constraint kind "${kind}" maps to multiple REST resources: ${matchingPlurals.join(', ')}.`
    );
  }

  return matchingPlurals[0];
}

async function requestConstraint(constraintPlural: string, name: string): Promise<any> {
  if (typeof effectiveRequestFunc !== 'function') {
    throw new Error('API request function not available for finding constraint.');
  }

  return effectiveRequestFunc(
    `/apis/constraints.gatekeeper.sh/v1beta1/${constraintPlural}/${name}`
  );
}

// Function to fetch constraints for a specific type
async function fetchConstraintsOfType(constraintType: string): Promise<any[]> {
  if (typeof effectiveRequestFunc !== 'function') {
    throw new Error(`API request function not available for constraint type ${constraintType}.`);
  }

  try {
    const url = `/apis/constraints.gatekeeper.sh/v1beta1/${constraintType}`;
    const response = await effectiveRequestFunc(url);
    return response?.items || [];
  } catch (error: unknown) {
    if (isNotFoundError(error)) {
      return [];
    }
    throw error;
  }
}

// Dynamic constraint class that discovers types at runtime
export const ConstraintClass = {
  useApiList: (setData: (data: any) => void) => {
    const [allConstraints, setAllConstraints] = React.useState<any[]>([]);
    const [discoveredTypes, setDiscoveredTypes] = React.useState<ConstraintTypeDefinition[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<Error | null>(null);

    React.useEffect(() => {
      const performDiscovery = async () => {
        setLoading(true);
        setError(null);

        try {
          const types = await discoverConstraintTypes();
          setDiscoveredTypes(types);
        } catch (e: any) {
          setError(e);
          setDiscoveredTypes([]);
        } finally {
          setLoading(false);
        }
      };

      performDiscovery();
    }, [setData]);

    React.useEffect(() => {
      if (loading) return;

      if (error || discoveredTypes.length === 0) {
        setAllConstraints([]);
        setData([]);
        return;
      }

      const fetchAllConstraintData = async () => {
        const allData: any[] = [];
        let fetchErrorOccurred = false;

        for (const { plural } of discoveredTypes) {
          try {
            const constraints = await fetchConstraintsOfType(plural);
            if (constraints.length > 0) {
              allData.push(...constraints);
            }
          } catch (e: any) {
            console.error(
              `[model.ts] useApiList: Failed to fetch constraints for type ${plural}:`,
              e
            );
            fetchErrorOccurred = true;
          }
        }

        if (fetchErrorOccurred) {
          console.warn('[model.ts] useApiList: One or more constraint types failed to fetch.');
        }
        setAllConstraints(allData);
      };

      fetchAllConstraintData();
    }, [discoveredTypes, loading, error, setData]);

    React.useEffect(() => {
      setData(allConstraints);
    }, [allConstraints, setData]);
  },

  useApiGet: (
    setData: (data: any) => void,
    name: string,
    constraintKind?: string
  ): ConstraintGetState => {
    const [constraintPlural, setConstraintPlural] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState(Boolean(name));
    const [error, setError] = React.useState<ConstraintApiError | null>(null);

    React.useEffect(() => {
      let cancelled = false;

      const loadConstraint = async () => {
        setLoading(Boolean(name));
        setError(null);
        setConstraintPlural(null);
        setData(null);

        if (!name) {
          return;
        }

        try {
          const discoveredTypes = await discoverConstraintTypes();
          const explicitKind = constraintKind?.trim();

          if (explicitKind) {
            const resolvedPlural = resolveConstraintPlural(discoveredTypes, explicitKind);
            if (!resolvedPlural) {
              throw makeConstraintNotFoundError(
                `Constraint kind "${explicitKind}" was not found in the discovered ConstraintTemplates.`
              );
            }

            if (!cancelled) {
              setConstraintPlural(resolvedPlural);
            }

            const constraint = await requestConstraint(resolvedPlural, name);
            if (!cancelled) {
              setData(constraint || null);
              if (!constraint) {
                setError(
                  makeConstraintNotFoundError(
                    `${explicitKind} constraint "${name}" was not returned by the Kubernetes API.`
                  )
                );
              }
            }
            return;
          }

          for (const { plural } of discoveredTypes) {
            try {
              const constraint = await requestConstraint(plural, name);
              if (constraint) {
                if (!cancelled) {
                  setConstraintPlural(plural);
                  setData(constraint);
                }
                return;
              }
            } catch (requestError: unknown) {
              if (isNotFoundError(requestError)) {
                continue;
              }
              throw requestError;
            }
          }

          throw makeConstraintNotFoundError(
            `Constraint "${name}" was not found in any discovered constraint type.`
          );
        } catch (loadError: unknown) {
          if (!cancelled) {
            setData(null);
            setError(normalizeConstraintApiError(loadError));
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      };

      loadConstraint();

      return () => {
        cancelled = true;
      };
    }, [constraintKind, name, setData]);

    return { constraintPlural, error, loading };
  },
};

export { ConstraintTemplateClass as ConstraintTemplate };
export { ConstraintClass as Constraint };

// --- Mutation Models ---
const apiGatekeeperMutationsGroupVersion = [
  { group: 'mutations.gatekeeper.sh', version: 'v1' },
  { group: 'mutations.gatekeeper.sh', version: 'v1beta1' },
  { group: 'mutations.gatekeeper.sh', version: 'v1alpha1' },
];

export const AssignClass = makeCustomResourceClass({
  apiInfo: apiGatekeeperMutationsGroupVersion,
  isNamespaced: false,
  singularName: 'Assign',
  pluralName: 'assign',
});

export const AssignMetadataClass = makeCustomResourceClass({
  apiInfo: apiGatekeeperMutationsGroupVersion,
  isNamespaced: false,
  singularName: 'AssignMetadata',
  pluralName: 'assignmetadata',
});

export const AssignImageClass = makeCustomResourceClass({
  apiInfo: apiGatekeeperMutationsGroupVersion,
  isNamespaced: false,
  singularName: 'AssignImage',
  pluralName: 'assignimage',
});

export const ModifySetClass = makeCustomResourceClass({
  apiInfo: apiGatekeeperMutationsGroupVersion,
  isNamespaced: false,
  singularName: 'ModifySet',
  pluralName: 'modifyset',
});

// --- Configuration Models ---
export const ConfigClass = makeCustomResourceClass({
  apiInfo: [{ group: 'config.gatekeeper.sh', version: 'v1alpha1' }],
  isNamespaced: true,
  singularName: 'Config',
  pluralName: 'configs',
});

export const SyncSetClass = makeCustomResourceClass({
  apiInfo: [{ group: 'syncset.gatekeeper.sh', version: 'v1alpha1' }],
  isNamespaced: false,
  singularName: 'SyncSet',
  pluralName: 'syncsets',
});

// --- External Data Models ---
const apiGatekeeperExternalDataGroupVersion = [
  { group: 'externaldata.gatekeeper.sh', version: 'v1beta1' },
  { group: 'externaldata.gatekeeper.sh', version: 'v1alpha1' },
];

export const ProviderClass = makeCustomResourceClass({
  apiInfo: apiGatekeeperExternalDataGroupVersion,
  isNamespaced: false,
  singularName: 'Provider',
  pluralName: 'providers',
});

export const ConnectionClass = makeCustomResourceClass({
  apiInfo: [
    { group: 'connection.gatekeeper.sh', version: 'v1alpha1' },
    { group: 'connection.gatekeeper.sh', version: 'v1beta1' },
  ],
  isNamespaced: true,
  singularName: 'Connection',
  pluralName: 'connections',
});

// --- Expansion Models ---
export const ExpansionTemplateClass = makeCustomResourceClass({
  apiInfo: [
    { group: 'expansion.gatekeeper.sh', version: 'v1alpha1' },
    { group: 'expansion.gatekeeper.sh', version: 'v1beta1' },
  ],
  isNamespaced: false,
  singularName: 'ExpansionTemplate',
  pluralName: 'expansiontemplate',
});
