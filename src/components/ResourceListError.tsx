import { SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Alert, AlertColor, AlertTitle, Typography } from '@mui/material';
import React from 'react';

interface ApiErrorLike {
  message?: unknown;
  status?: unknown;
}

export interface ResourceListErrorPresentation {
  details: string;
  message: string;
  severity: AlertColor;
  title: string;
}

function getStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }

  const status = (error as ApiErrorLike).status;
  return typeof status === 'number' ? status : undefined;
}

function getMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null) {
    const message = (error as ApiErrorLike).message;
    if (typeof message === 'string' && message) {
      return message;
    }
  }

  if (typeof error === 'string' && error) {
    return error;
  }

  return 'No error details were provided.';
}

export function getResourceListErrorPresentation(
  error: unknown,
  resourceName: string
): ResourceListErrorPresentation {
  const status = getStatus(error);
  const apiMessage = getMessage(error);

  if (status === 401) {
    return {
      details: `HTTP 401: ${apiMessage}`,
      message:
        'Your Kubernetes session is not authenticated. Sign in again or refresh your cluster credentials, then retry.',
      severity: 'warning',
      title: 'Authentication required',
    };
  }

  if (status === 403) {
    return {
      details: `HTTP 403: ${apiMessage}`,
      message: `Kubernetes RBAC does not allow you to list ${resourceName}. Ask a cluster administrator to grant the required permission.`,
      severity: 'warning',
      title: 'Access denied',
    };
  }

  if (status === 404) {
    return {
      details: `HTTP 404: ${apiMessage}`,
      message: `The Kubernetes API could not find this resource type. Its CustomResourceDefinition may not be installed or served by this cluster.`,
      severity: 'info',
      title: `${resourceName} API unavailable`,
    };
  }

  if (status !== undefined && status >= 500) {
    return {
      details: `HTTP ${status}: ${apiMessage}`,
      message: `The Kubernetes API returned HTTP ${status} while loading ${resourceName}. Try again or check the API server and cluster health.`,
      severity: 'error',
      title: 'Kubernetes API error',
    };
  }

  if (status === undefined || status === 0) {
    return {
      details: `API error: ${apiMessage}`,
      message:
        'The request failed before the Kubernetes API returned a response. Check the cluster connection and try again.',
      severity: 'error',
      title: 'Unable to reach the Kubernetes API',
    };
  }

  return {
    details: status ? `HTTP ${status}: ${apiMessage}` : `API error: ${apiMessage}`,
    message: `The Kubernetes API could not load ${resourceName}.`,
    severity: 'error',
    title: `Unable to load ${resourceName}`,
  };
}

export interface ResourceListErrorProps {
  error: unknown;
  resourceName: string;
  sectionTitle?: string;
}

export default function ResourceListError({
  error,
  resourceName,
  sectionTitle,
}: ResourceListErrorProps) {
  const presentation = getResourceListErrorPresentation(error, resourceName);

  return (
    <SectionBox title={sectionTitle}>
      <Alert severity={presentation.severity}>
        <AlertTitle>{presentation.title}</AlertTitle>
        {presentation.message}
        <Typography
          component="div"
          variant="body2"
          sx={{ mt: 1, overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}
        >
          {presentation.details}
        </Typography>
      </Alert>
    </SectionBox>
  );
}
