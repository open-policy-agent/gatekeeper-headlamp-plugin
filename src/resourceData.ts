interface ResourceLike {
  jsonData?: {
    spec?: {
      driver?: unknown;
      gvks?: unknown;
    };
  };
}

export interface SyncSetGVK {
  group?: string;
  version?: string;
  kind?: string;
}

export function getConnectionDriver(item: ResourceLike): string | undefined {
  const driver = item.jsonData?.spec?.driver;
  return typeof driver === 'string' && driver.length > 0 ? driver : undefined;
}

export function getSyncSetGVKs(item: ResourceLike): SyncSetGVK[] {
  const gvks = item.jsonData?.spec?.gvks;
  return Array.isArray(gvks) ? (gvks as SyncSetGVK[]) : [];
}
