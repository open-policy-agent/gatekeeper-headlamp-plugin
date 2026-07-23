import * as ApiProxy from '@kinvolk/headlamp-plugin/lib/ApiProxy';
import { Loader, SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { KubeObjectInterface } from '@kinvolk/headlamp-plugin/lib/lib/k8s/cluster';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  CircularProgress,
  Paper,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material';
import yaml from 'js-yaml';
import React, { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import GitHubRequestControls from './GitHubRequestControls';
import {
  buildTemplateId,
  buildTemplateSourceUrl,
  fetchLibraryTemplate,
  getErrorMessage,
  isOfflineError,
  isRateLimitOrAuthenticationError,
  LibraryTemplate,
  LibraryTemplateRoute,
  resolveLibraryTemplateRoute,
} from './libraryData';

interface ConstraintTemplate extends KubeObjectInterface {
  spec: {
    crd: {
      spec: {
        names: {
          kind: string;
          plural: string;
        };
        validation?: {
          openAPIV3Schema?: {
            properties: Record<string, any>;
          };
        };
      };
    };
    targets?: {
      target: string;
      rego: string;
      libs?: string[];
    }[];
  };
}

interface Constraint extends KubeObjectInterface {
  spec: {
    match?: any;
    parameters?: any;
  };
}

interface PreparedTemplate {
  parsedTemplate: ConstraintTemplate;
  constraintName: string;
  constraintParams: string;
}

const CRD_ESTABLISHED_TIMEOUT_MS = 30000;
const CRD_POLL_INTERVAL_MS = 2000;
const SUPPORTED_CONSTRAINT_TEMPLATE_API_VERSIONS = new Set([
  'templates.gatekeeper.sh/v1',
  'templates.gatekeeper.sh/v1beta1',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeLocationTemplate(
  locationState: unknown,
  route: LibraryTemplateRoute
): LibraryTemplate | null {
  if (!isRecord(locationState) || !isRecord(locationState.template)) {
    return null;
  }

  const template = locationState.template;
  if (typeof template.rawYAML !== 'string' || !template.rawYAML.trim()) {
    return null;
  }

  const id = typeof template.id === 'string' ? template.id : route.id;
  const category = typeof template.category === 'string' ? template.category : route.category;
  let templateName = typeof template.templateName === 'string' ? template.templateName : route.name;

  if (!templateName && route.id && category && route.id.startsWith(`${category}-`)) {
    templateName = route.id.slice(category.length + 1);
  }

  if (!category || !templateName) {
    return null;
  }

  const canonicalId = buildTemplateId(category, templateName);
  if (
    (route.category && route.category !== category) ||
    (route.name && route.name !== templateName) ||
    (route.id && route.id !== canonicalId) ||
    (id && id !== canonicalId)
  ) {
    return null;
  }

  return {
    id: canonicalId,
    category,
    templateName,
    name: typeof template.name === 'string' ? template.name : templateName,
    description:
      typeof template.description === 'string' ? template.description : 'No description available.',
    sourceUrl:
      typeof template.sourceUrl === 'string'
        ? template.sourceUrl
        : buildTemplateSourceUrl(category, templateName),
    rawYAML: template.rawYAML,
  };
}

function prepareTemplate(template: LibraryTemplate): PreparedTemplate {
  const parsedDocuments = yaml.loadAll(template.rawYAML) as KubeObjectInterface[];
  const constraintTemplate = parsedDocuments.find(
    document => document && document.kind === 'ConstraintTemplate'
  ) as ConstraintTemplate | undefined;

  if (!constraintTemplate) {
    throw new Error('Failed to find a ConstraintTemplate document in the template YAML.');
  }

  const names = constraintTemplate.spec?.crd?.spec?.names;
  const originalKind = names?.kind;
  if (!originalKind) {
    throw new Error(
      `Selected ConstraintTemplate (${
        constraintTemplate.metadata.name || 'Unknown Name'
      }) is malformed. It is missing "kind" under spec.crd.spec.names.`
    );
  }

  let parsedTemplate = constraintTemplate;
  if (!names.plural) {
    const inferredPlural = originalKind.toLowerCase();
    const mutableTemplate = JSON.parse(JSON.stringify(constraintTemplate)) as ConstraintTemplate;
    mutableTemplate.spec.crd.spec.names.plural = inferredPlural;
    parsedTemplate = mutableTemplate;
  }

  const exampleParams: Record<string, unknown> = {};
  const properties = parsedTemplate.spec.crd.spec.validation?.openAPIV3Schema?.properties;
  if (properties) {
    for (const key in properties) {
      if (properties[key].type === 'string') exampleParams[key] = 'exampleValue';
      else if (properties[key].type === 'integer' || properties[key].type === 'number') {
        exampleParams[key] = 123;
      } else if (properties[key].type === 'boolean') exampleParams[key] = true;
      else if (properties[key].type === 'array') exampleParams[key] = ['item1', 'item2'];
      else if (properties[key].type === 'object') exampleParams[key] = { prop: 'value' };
      else exampleParams[key] = null;
    }
  }

  return {
    parsedTemplate,
    constraintName: `my-${parsedTemplate.metadata.name?.toLowerCase() || template.id}-constraint`,
    constraintParams: JSON.stringify(exampleParams, null, 2),
  };
}

function buildConstraintTemplateApiUrl(apiVersion: string, name?: string): string {
  if (!SUPPORTED_CONSTRAINT_TEMPLATE_API_VERSIONS.has(apiVersion)) {
    throw new Error(
      `Unsupported ConstraintTemplate apiVersion "${apiVersion}". Supported versions are templates.gatekeeper.sh/v1 and templates.gatekeeper.sh/v1beta1.`
    );
  }

  const collectionUrl = `/apis/${apiVersion}/constrainttemplates`;
  return name ? `${collectionUrl}/${encodeURIComponent(name)}` : collectionUrl;
}

function normalizeSemanticValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeSemanticValue);
  }
  if (!isRecord(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .filter(key => value[key] !== undefined)
      .map(key => [key, normalizeSemanticValue(value[key])])
  );
}

function constraintTemplateSpecsAreEquivalent(
  desiredTemplate: KubeObjectInterface,
  existingTemplate: unknown
): boolean {
  const desiredSpec = (desiredTemplate as KubeObjectInterface & { spec?: unknown }).spec;
  const existingSpec = isRecord(existingTemplate) ? existingTemplate.spec : undefined;

  if (desiredSpec === undefined || existingSpec === undefined) {
    return false;
  }

  return (
    JSON.stringify(normalizeSemanticValue(desiredSpec)) ===
    JSON.stringify(normalizeSemanticValue(existingSpec))
  );
}

function getApiErrorStatus(error: unknown): number | undefined {
  if (!isRecord(error)) {
    return undefined;
  }
  return typeof error.status === 'number' ? error.status : undefined;
}

function getApiErrorDetail(error: unknown): string {
  if (isRecord(error) && isRecord(error.json) && typeof error.json.message === 'string') {
    return error.json.message;
  }
  return getErrorMessage(error);
}

function describeCRDReadFailure(crdName: string, error: unknown): string {
  const status = getApiErrorStatus(error);
  const detail = getApiErrorDetail(error);
  const detailSuffix = detail ? ` Kubernetes reported: ${detail}` : '';

  if (status === 401) {
    return `authentication failed (401) while reading CRD "${crdName}".${detailSuffix}`;
  }
  if (status === 403) {
    return `access was denied (403) while reading CRD "${crdName}". Grant permission to get customresourcedefinitions.apiextensions.k8s.io.${detailSuffix}`;
  }
  if (status === 408) {
    return `the CRD status request timed out (408) while reading "${crdName}".${detailSuffix}`;
  }
  if (status === 502 && detail.toLowerCase().includes('unreachable')) {
    return `a network or Headlamp proxy failure occurred while reading CRD "${crdName}" (502 Unreachable).${detailSuffix}`;
  }
  if (status !== undefined && status >= 500) {
    return `the Kubernetes API or Headlamp proxy returned a server error (${status}) while reading CRD "${crdName}".${detailSuffix}`;
  }
  if (status === undefined && (error instanceof TypeError || isOfflineError(error))) {
    return `a network error occurred while reading CRD "${crdName}".${detailSuffix}`;
  }

  return `the CRD status request failed${
    status === undefined ? '' : ` (${status})`
  } while reading "${crdName}".${detailSuffix}`;
}

async function checkCRDEstablished(crdName: string): Promise<boolean> {
  try {
    const crd = await ApiProxy.request(
      `/apis/apiextensions.k8s.io/v1/customresourcedefinitions/${crdName}`,
      { method: 'GET' }
    );
    if (crd?.status?.conditions) {
      const establishedCondition = crd.status.conditions.find(
        (condition: unknown) =>
          isRecord(condition) && condition.type === 'Established' && condition.status === 'True'
      );
      return Boolean(establishedCondition);
    }
  } catch (error) {
    if (getApiErrorStatus(error) === 404) {
      return false;
    }
    throw new Error(describeCRDReadFailure(crdName, error));
  }
  return false;
}

function LibraryTemplateDetails() {
  const { category, name, id } = useParams<{
    category?: string;
    name?: string;
    id?: string;
  }>();
  const location = useLocation();
  const [libraryTemplateItem, setLibraryTemplateItem] = useState<LibraryTemplate | null>(null);
  const [parsedTemplate, setParsedTemplate] = useState<ConstraintTemplate | null>(null);
  const [constraintName, setConstraintName] = useState('');
  const [constraintParams, setConstraintParams] = useState('{}');
  const [matchCriteria, setMatchCriteria] = useState(
    JSON.stringify(
      {
        kinds: [{ apiGroups: [''], kinds: ['Pod'] }],
      },
      null,
      2
    )
  );
  const [generatedConstraintYAML, setGeneratedConstraintYAML] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [loadRevision, setLoadRevision] = useState(0);
  const [snackbarState, setSnackbarState] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });

  useEffect(() => {
    let active = true;
    const route = { category, name, id };

    const loadTemplate = async () => {
      setLoading(true);
      setLoadError(null);
      setFormError(null);
      setLibraryTemplateItem(null);
      setParsedTemplate(null);
      setGeneratedConstraintYAML(null);

      try {
        const stateTemplate = normalizeLocationTemplate(location.state, route);
        const resolvedRoute = stateTemplate
          ? {
              category: stateTemplate.category,
              templateName: stateTemplate.templateName,
              id: stateTemplate.id,
            }
          : await resolveLibraryTemplateRoute(route);
        const template =
          stateTemplate ??
          (await fetchLibraryTemplate(resolvedRoute.category, resolvedRoute.templateName));
        const prepared = prepareTemplate(template);

        if (!active) {
          return;
        }

        setLibraryTemplateItem(template);
        setParsedTemplate(prepared.parsedTemplate);
        setConstraintName(prepared.constraintName);
        setConstraintParams(prepared.constraintParams);
      } catch (error) {
        if (active) {
          setLoadError(error);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadTemplate();
    return () => {
      active = false;
    };
  }, [category, id, loadRevision, location.state, name]);

  const retryLoad = () => {
    setLoadRevision(revision => revision + 1);
  };

  const handleGenerateConstraint = () => {
    if (!parsedTemplate) {
      setFormError('Cannot generate constraint: ConstraintTemplate not parsed.');
      return;
    }
    if (!constraintName.trim()) {
      setFormError('Constraint Name is required.');
      return;
    }

    let paramsObject: unknown;
    try {
      paramsObject = JSON.parse(constraintParams);
    } catch (error) {
      setFormError(`Invalid JSON in parameters: ${getErrorMessage(error)}`);
      setGeneratedConstraintYAML(null);
      return;
    }

    let matchObject: unknown;
    try {
      matchObject = JSON.parse(matchCriteria);
    } catch (error) {
      setFormError(`Invalid JSON in match criteria: ${getErrorMessage(error)}`);
      setGeneratedConstraintYAML(null);
      return;
    }

    const constraintResource: Omit<Constraint, 'status'> = {
      apiVersion: 'constraints.gatekeeper.sh/v1beta1',
      kind: parsedTemplate.spec.crd.spec.names.kind,
      metadata: {
        name: constraintName,
      },
      spec: {
        parameters: paramsObject,
        match: matchObject,
      },
    };

    try {
      setGeneratedConstraintYAML(yaml.dump(constraintResource));
      setFormError(null);
    } catch (error) {
      setFormError(`Failed to generate Constraint YAML: ${getErrorMessage(error)}`);
      setGeneratedConstraintYAML(null);
    }
  };

  const handleApplyTemplateAndConstraint = async () => {
    if (!libraryTemplateItem?.rawYAML || !generatedConstraintYAML || !parsedTemplate) {
      setSnackbarState({
        open: true,
        message: 'Missing template YAML or generated constraint YAML.',
        severity: 'error',
      });
      return;
    }

    const pluralPath = parsedTemplate.spec.crd.spec.names.plural;
    if (!pluralPath) {
      setSnackbarState({
        open: true,
        message: `Cannot apply: ConstraintTemplate (${parsedTemplate.metadata.name}) is missing the required plural name.`,
        severity: 'error',
      });
      return;
    }

    setApplying(true);
    setSnackbarState(previous => ({ ...previous, open: false }));

    try {
      let templateObjectToApply: KubeObjectInterface | undefined;
      try {
        const parsedDocuments = yaml.loadAll(libraryTemplateItem.rawYAML) as KubeObjectInterface[];
        templateObjectToApply = parsedDocuments.find(
          document => document && document.kind === 'ConstraintTemplate'
        );
        if (!templateObjectToApply) {
          throw new Error('ConstraintTemplate document not found in the provided YAML.');
        }
      } catch (error) {
        throw new Error(`Invalid ConstraintTemplate YAML: ${getErrorMessage(error)}`);
      }

      const templateName = templateObjectToApply.metadata?.name;
      if (!templateObjectToApply.kind || !templateObjectToApply.apiVersion || !templateName) {
        throw new Error('Parsed template YAML is not a valid Kubernetes object.');
      }

      const templateCollectionUrl = buildConstraintTemplateApiUrl(templateObjectToApply.apiVersion);
      let templateApplyOutcome: 'was applied' | 'already existed' = 'was applied';
      try {
        await ApiProxy.request(templateCollectionUrl, {
          method: 'POST',
          body: JSON.stringify(templateObjectToApply),
          headers: { 'Content-Type': 'application/json' },
        });
        setSnackbarState({
          open: true,
          message: 'ConstraintTemplate applied successfully. Waiting for CRD establishment...',
          severity: 'info',
        });
      } catch (error) {
        if (getApiErrorStatus(error) === 409) {
          const existingTemplate = await ApiProxy.request(
            buildConstraintTemplateApiUrl(templateObjectToApply.apiVersion, templateName),
            { method: 'GET' }
          );
          if (!constraintTemplateSpecsAreEquivalent(templateObjectToApply, existingTemplate)) {
            throw new Error(
              `ConstraintTemplate ${templateName} already exists, but its spec is not semantically equivalent to the Policy Library template. Review or remove the existing template before applying. The Constraint was not created.`
            );
          }

          templateApplyOutcome = 'already existed';
          setSnackbarState({
            open: true,
            message: `ConstraintTemplate ${templateName} already exists with an equivalent spec. Checking CRD...`,
            severity: 'warning',
          });
        } else {
          throw error;
        }
      }

      const partialApplyPrefix = `ConstraintTemplate ${templateName} ${templateApplyOutcome}`;
      const crdName = `${pluralPath}.constraints.gatekeeper.sh`;
      let crdEstablished = false;
      const startTime = Date.now();

      try {
        while (Date.now() - startTime < CRD_ESTABLISHED_TIMEOUT_MS) {
          if (await checkCRDEstablished(crdName)) {
            crdEstablished = true;
            break;
          }
          await new Promise(resolve => setTimeout(resolve, CRD_POLL_INTERVAL_MS));
        }
      } catch (error) {
        throw new Error(
          `${partialApplyPrefix}, but ${getErrorMessage(error)} The Constraint was not created.`
        );
      }

      if (!crdEstablished) {
        throw new Error(
          `${partialApplyPrefix}, but CRD ${crdName} was not established within ${
            CRD_ESTABLISHED_TIMEOUT_MS / 1000
          } seconds. The Constraint was not created.`
        );
      }

      setSnackbarState({
        open: true,
        message: `ConstraintTemplate applied and CRD ${crdName} established. Applying constraint...`,
        severity: 'info',
      });

      let constraintObjectToApply: any;
      try {
        constraintObjectToApply = yaml.load(generatedConstraintYAML);
      } catch (error) {
        throw new Error(`Invalid generated Constraint YAML: ${getErrorMessage(error)}`);
      }

      if (
        !constraintObjectToApply ||
        !constraintObjectToApply.kind ||
        !constraintObjectToApply.apiVersion
      ) {
        throw new Error('Parsed constraint YAML is not a valid Kubernetes object.');
      }

      const constraintPostUrl = `/apis/${
        constraintObjectToApply.apiVersion
      }/${pluralPath.toLowerCase()}`;
      await ApiProxy.request(constraintPostUrl, {
        method: 'POST',
        body: JSON.stringify(constraintObjectToApply),
        headers: { 'Content-Type': 'application/json' },
      });
      setSnackbarState({
        open: true,
        message: 'ConstraintTemplate and Constraint applied successfully!',
        severity: 'success',
      });
    } catch (error: any) {
      const errorMessage = error.json?.message || getErrorMessage(error) || 'Unknown error';
      setSnackbarState({
        open: true,
        message: `Failed to apply: ${errorMessage}`,
        severity: 'error',
      });
    } finally {
      setApplying(false);
    }
  };

  const handleCloseSnackbar = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason !== 'clickaway') {
      setSnackbarState(previous => ({ ...previous, open: false }));
    }
  };

  if (loading) {
    return (
      <SectionBox title="Library Template Details">
        <Loader title="Loading library template..." />
      </SectionBox>
    );
  }

  if (loadError || !libraryTemplateItem || !parsedTemplate) {
    const offline = isOfflineError(loadError);
    return (
      <SectionBox title="Library Template Details">
        <Alert severity={offline ? 'warning' : 'error'} sx={{ mb: 2 }}>
          <AlertTitle>{offline ? 'Unable to Reach GitHub' : 'Template Load Failed'}</AlertTitle>
          {loadError ? getErrorMessage(loadError) : 'Could not load template details.'}
        </Alert>
        <Button variant="outlined" onClick={retryLoad} sx={{ mb: 2 }}>
          Retry
        </Button>
        {isRateLimitOrAuthenticationError(loadError) && (
          <GitHubRequestControls onRetry={retryLoad} />
        )}
      </SectionBox>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Library Template: {libraryTemplateItem.name}
      </Typography>

      {formError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {formError}
        </Alert>
      )}

      <SectionBox title="ConstraintTemplate Definition">
        <Paper elevation={2} sx={{ p: 1, overflowX: 'auto' }}>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {libraryTemplateItem.rawYAML}
          </pre>
        </Paper>
      </SectionBox>

      <SectionBox title="Create Constraint from this Template" sx={{ mt: 2 }}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Constraint Details (Kind: {parsedTemplate.spec.crd.spec.names.kind})
          </Typography>
          <TextField
            label="Constraint Name"
            value={constraintName}
            onChange={event => {
              setConstraintName(event.target.value);
              setGeneratedConstraintYAML(null);
            }}
            fullWidth
            margin="normal"
            required
            error={!constraintName.trim()}
            helperText={!constraintName.trim() ? 'Constraint name is required.' : ''}
          />

          <Typography variant="subtitle1" sx={{ mt: 2, mb: 0.5 }}>
            Match Criteria (JSON):
          </Typography>
          <TextField
            label="Match Criteria (JSON format)"
            value={matchCriteria}
            onChange={event => {
              setMatchCriteria(event.target.value);
              setGeneratedConstraintYAML(null);
            }}
            multiline
            rows={5}
            fullWidth
            margin="normal"
            variant="outlined"
            InputProps={{ style: { fontFamily: 'monospace' } }}
          />

          <Typography variant="subtitle1" sx={{ mt: 1, mb: 0.5 }}>
            Parameters (JSON):
          </Typography>
          {parsedTemplate.spec.crd.spec.validation?.openAPIV3Schema?.properties && (
            <Box mb={1}>
              <TextField
                label="Parameters (JSON format)"
                value={constraintParams}
                onChange={event => {
                  setConstraintParams(event.target.value);
                  setGeneratedConstraintYAML(null);
                }}
                multiline
                rows={5}
                fullWidth
                margin="normal"
                variant="outlined"
                InputProps={{ style: { fontFamily: 'monospace' } }}
              />
            </Box>
          )}

          <Button
            variant="contained"
            color="primary"
            onClick={handleGenerateConstraint}
            sx={{ mt: 2, mr: 1 }}
            disabled={!constraintName || !constraintParams || !matchCriteria}
          >
            Preview Constraint YAML
          </Button>
        </Paper>
      </SectionBox>

      {generatedConstraintYAML && (
        <SectionBox title="Generated Constraint YAML" sx={{ mt: 2 }}>
          <Paper elevation={2} sx={{ p: 1, overflowX: 'auto' }}>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {generatedConstraintYAML}
            </pre>
          </Paper>
        </SectionBox>
      )}

      <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', alignItems: 'start' }}>
        <Button
          variant="contained"
          color="secondary"
          onClick={handleApplyTemplateAndConstraint}
          disabled={applying || !generatedConstraintYAML}
          startIcon={applying ? <CircularProgress size={20} /> : null}
        >
          {applying ? 'Applying...' : 'Apply Template & Constraint to Cluster'}
        </Button>
      </Box>

      <Snackbar
        open={snackbarState.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbarState.severity}
          sx={{ width: '100%' }}
        >
          {snackbarState.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default LibraryTemplateDetails;
