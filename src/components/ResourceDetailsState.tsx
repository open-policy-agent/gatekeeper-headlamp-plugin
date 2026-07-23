import { KubeObject, type KubeObjectClass } from '@kinvolk/headlamp-plugin/lib/lib/k8s/cluster';
import { Alert, AlertTitle, Box, Typography } from '@mui/material';
import React from 'react';

interface ResourceApiError extends Error {
  status?: number;
  json?: {
    message?: string;
  };
}

interface ResourceErrorPresentation {
  title: string;
  message: string;
}

export function getResourceErrorPresentation(
  error: ResourceApiError,
  kind: string,
  name: string
): ResourceErrorPresentation {
  const serverMessage = error.json?.message || error.message;

  switch (error.status) {
    case 404:
      return {
        title: `${kind} not found`,
        message: `The ${kind} "${name}" was not found. It may have been deleted or the URL may be stale.`,
      };
    case 401:
      return {
        title: 'Authentication required',
        message: `Kubernetes could not authenticate this request. ${serverMessage}`,
      };
    case 403:
      return {
        title: 'Access denied',
        message: `Kubernetes denied access to ${kind} "${name}". Check your RBAC permissions. ${serverMessage}`,
      };
    default:
      return {
        title: `Unable to load ${kind}`,
        message: serverMessage || `An unknown error occurred while loading ${kind} "${name}".`,
      };
  }
}

export function useResourceDetails(
  resourceClass: KubeObjectClass,
  name: string,
  namespace?: string
): { item: KubeObject | null; error: ResourceApiError | null } {
  const [item, setItem] = React.useState<KubeObject | null>(null);
  const [error, setError] = React.useState<ResourceApiError | null>(null);

  const handleGet = React.useCallback((nextItem: KubeObject | null) => {
    setItem(nextItem);
    if (nextItem) {
      setError(null);
    }
  }, []);

  const handleError = React.useCallback((nextError: ResourceApiError | null) => {
    setError(nextError || new Error('The Kubernetes API request failed without an error message.'));
  }, []);

  resourceClass.useApiGet(handleGet, name, namespace, handleError);

  return { item, error };
}

export function ResourceDetailsLoading({ kind }: { kind: string }) {
  return (
    <Box sx={{ p: 2 }}>
      <Typography>Loading {kind} details...</Typography>
    </Box>
  );
}

export function ResourceDetailsError({
  error,
  kind,
  name,
}: {
  error: ResourceApiError;
  kind: string;
  name: string;
}) {
  const presentation = getResourceErrorPresentation(error, kind, name);

  return (
    <Box sx={{ p: 2 }}>
      <Alert severity="error">
        <AlertTitle>{presentation.title}</AlertTitle>
        {presentation.message}
      </Alert>
    </Box>
  );
}
