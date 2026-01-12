import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  TextField,
  Typography,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  SectionBox,
  Loader,
} from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import {
  KubeObjectInterface,
} from '@kinvolk/headlamp-plugin/lib/lib/k8s/cluster';
import { useTranslation } from 'react-i18next';
import * as ApiProxy from '@kinvolk/headlamp-plugin/lib/ApiProxy';
import yaml from 'js-yaml';

// Define a type for the structure of a library item (template)
interface LibraryTemplateFromState {
  id: string;
  name: string;
  description: string;
  rawYAML: string;
  sourceUrl: string;
}

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

const CRD_ESTABLISHED_TIMEOUT_MS = 30000; // 30 seconds
const CRD_POLL_INTERVAL_MS = 2000; // 2 seconds

async function checkCRDEstablished(crdName: string): Promise<boolean> {
  try {
    const crd = await ApiProxy.request(
      `/apis/apiextensions.k8s.io/v1/customresourcedefinitions/${crdName}`,
      { method: 'GET' }
    );
    if (crd && crd.status && crd.status.conditions) {
      const establishedCondition = crd.status.conditions.find(
        (condition: any) => condition.type === 'Established' && condition.status === 'True'
      );
      return !!establishedCondition;
    }
  } catch (e: any) {
    // CRD might not be found yet, which is fine during polling
    if (e.status !== 404) {
      console.error(`Error checking CRD ${crdName} status:`, e);
    }
  }
  return false;
}

function LibraryTemplateDetails() {
  const { t } = useTranslation();
  const { id: templateRouteId } = useParams<{ id: string }>();
  const location = useLocation();
  const state = location.state as { template: LibraryTemplateFromState }; // Type assertion for state

  const [libraryTemplateItem, setLibraryTemplateItem] = useState<LibraryTemplateFromState | null>(null);
  const [parsedTemplate, setParsedTemplate] = useState<ConstraintTemplate | null>(null);
  const [constraintName, setConstraintName] = useState<string>('');
  const [constraintParams, setConstraintParams] = useState<string>('{}');
  const [matchCriteria, setMatchCriteria] = useState<string>(
    JSON.stringify(
      {
        kinds: [{ apiGroups: [''], kinds: ['Pod'] }], // Default to matching Pods in core group
      },
      null,
      2
    )
  );
  const [generatedConstraintYAML, setGeneratedConstraintYAML] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [applying, setApplying] = useState<boolean>(false);
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
    if (state && state.template && state.template.id === templateRouteId) {
      setLibraryTemplateItem(state.template);
      if (state.template.rawYAML) {
        console.log('[TemplateDetails] Raw YAML:', state.template.rawYAML); // Log raw YAML
        try {
          const parsedDocs = yaml.loadAll(state.template.rawYAML) as KubeObjectInterface[];
          console.log('[TemplateDetails] Parsed YAML docs:', parsedDocs); // Log parsed docs

          if (parsedDocs && parsedDocs.length > 0) {
            const constraintTemplateDoc = parsedDocs.find(
              doc => doc && doc.kind === 'ConstraintTemplate'
            ) as ConstraintTemplate | undefined;
            console.log('[TemplateDetails] Found ConstraintTemplate doc:', constraintTemplateDoc); // Log found CT doc

            if (constraintTemplateDoc) {
              // Log the nested properties step-by-step
              console.log('[TemplateDetails] CT doc spec:', constraintTemplateDoc.spec);
              if (constraintTemplateDoc.spec) {
                console.log('[TemplateDetails] CT doc spec.crd:', constraintTemplateDoc.spec.crd);
                if (constraintTemplateDoc.spec.crd) {
                  console.log('[TemplateDetails] CT doc spec.crd.spec:', constraintTemplateDoc.spec.crd.spec);
                  if (constraintTemplateDoc.spec.crd.spec) {
                    console.log('[TemplateDetails] CT doc spec.crd.spec.names:', constraintTemplateDoc.spec.crd.spec.names);
                  }
                }
              }

              const names = constraintTemplateDoc.spec?.crd?.spec?.names;
              const originalKind = names?.kind;
              const originalPlural = names?.plural;

              if (!originalKind) {
                const errorMessage = `Selected ConstraintTemplate (${constraintTemplateDoc.metadata.name || 'Unknown Name'}) is malformed. It's missing 'kind' under spec.crd.spec.names. This field is essential. Please check the template definition from the library.`;
                console.error('[TemplateDetails] Malformed ConstraintTemplate:', errorMessage, constraintTemplateDoc);
                setError(errorMessage);
                setParsedTemplate(null);
              } else {
                let templateToUse = constraintTemplateDoc;
                let currentError = null; // Store potential error locally before setting state

                if (!originalPlural) {
                  const inferredPlural = originalKind.toLowerCase(); // Use lowercase kind directly
                  console.warn(
                    `[TemplateDetails] ConstraintTemplate (${constraintTemplateDoc.metadata.name || 'Unknown Name'}) is missing 'plural' under spec.crd.spec.names. Inferring as '${inferredPlural}' (lowercase of kind). This may not always be correct. Consider updating the template definition in the library.`
                  );
                  // Create a mutable deep copy to avoid modifying the original object from parsedDocs
                  const mutableTemplateDoc = JSON.parse(JSON.stringify(constraintTemplateDoc)) as ConstraintTemplate;
                  // Ensure path exists before assignment (it should, as originalKind exists)
                  if (mutableTemplateDoc.spec && mutableTemplateDoc.spec.crd && mutableTemplateDoc.spec.crd.spec && mutableTemplateDoc.spec.crd.spec.names) {
                    mutableTemplateDoc.spec.crd.spec.names.plural = inferredPlural;
                  }
                  templateToUse = mutableTemplateDoc;
                } else {
                  // Both kind and plural are present
                }

                setError(currentError); // Set error state (null if plural was inferred or already present)
                setParsedTemplate(templateToUse);
                setConstraintName(
                  `my-${templateToUse.metadata.name?.toLowerCase() || state.template.id}-constraint`
                );

                // Pre-fill example parameters based on schema
                if (templateToUse.spec?.crd?.spec?.validation?.openAPIV3Schema?.properties) {
                  const exampleParams: Record<string, any> = {};
                  const props = templateToUse.spec.crd.spec.validation.openAPIV3Schema.properties;
                  for (const key in props) {
                    if (props[key].type === 'string') exampleParams[key] = 'exampleValue';
                    else if (props[key].type === 'integer' || props[key].type === 'number') exampleParams[key] = 123;
                    else if (props[key].type === 'boolean') exampleParams[key] = true;
                    else if (props[key].type === 'array') exampleParams[key] = ['item1', 'item2'];
                    else if (props[key].type === 'object') exampleParams[key] = { prop: 'value' };
                    else exampleParams[key] = null;
                  }
                  setConstraintParams(JSON.stringify(exampleParams, null, 2));
                } else {
                  setConstraintParams('{}');
                }
              }
            } else {
              setError('Failed to find a ConstraintTemplate document in the provided YAML.');
              setParsedTemplate(null); // Ensure if no CT doc, parsedTemplate is also null
            }
          } else {
            setError('Failed to parse ConstraintTemplate YAML: No documents found.');
          }
        } catch (e: any) {
          setError(`Failed to parse ConstraintTemplate YAML: ${e.message}`);
        }
      } else {
        setError('No rawYAML found in template data.');
      }
    } else {
      setError('Template data not found or ID mismatch.');
    }
    setLoading(false);
  }, [state, templateRouteId]);

  const handleGenerateConstraint = () => {
    if (!parsedTemplate) {
      setError(t('Cannot generate constraint: ConstraintTemplate not parsed.'));
      return;
    }
    if (!constraintName.trim()) {
      setError(t('Constraint Name is required.'));
      return;
    }

    let paramsObj;
    try {
      paramsObj = JSON.parse(constraintParams);
    } catch (e: any) {
      setError(t('Invalid JSON in parameters: {{message}}', { message: e.message }));
      setGeneratedConstraintYAML(null);
      return;
    }

    let matchObj;
    try {
      matchObj = JSON.parse(matchCriteria);
    } catch (e: any) {
      setError(t('Invalid JSON in match criteria: {{message}}', { message: e.message }));
      setGeneratedConstraintYAML(null);
      return;
    }

    const constraintCR: Omit<Constraint, 'status'> = {
      apiVersion: `constraints.gatekeeper.sh/v1beta1`,
      kind: parsedTemplate.spec.crd.spec.names.kind,
      metadata: {
        name: constraintName,
      },
      spec: {
        parameters: paramsObj,
        match: matchObj,
      },
    };

    try {
      const yamlOutput = yaml.dump(constraintCR);
      setGeneratedConstraintYAML(yamlOutput);
      setError(null); // Clear previous errors
    } catch (e: any) {
      setError(t('Failed to generate Constraint YAML: {{message}}', { message: e.message }));
      setGeneratedConstraintYAML(null);
    }
  };

  const handleApplyTemplateAndConstraint = async () => {
    if (!libraryTemplateItem?.rawYAML || !generatedConstraintYAML || !parsedTemplate) {
      setSnackbarState({ open: true, message: t('Missing template YAML or generated constraint YAML.'), severity: 'error' });
      return;
    }

    // Ensure pluralPath is valid before proceeding (already validated in useEffect, but good for safety)
    const pluralPath = parsedTemplate?.spec?.crd?.spec?.names?.plural;
    if (!pluralPath) {
      const errorMessage = `Cannot apply: ConstraintTemplate (${parsedTemplate?.metadata?.name}) is missing the required 'plural' name under spec.crd.spec.names.`;
      console.error('[TemplateDetails] Apply error:', errorMessage, parsedTemplate);
      setSnackbarState({ open: true, message: errorMessage, severity: 'error' });
      return;
    }

    setApplying(true);
    setSnackbarState(prev => ({ ...prev, open: false }));

    // Define successMessage here to be accessible in the whole try block
    let successMessage = '';

    try {
      // 1. Apply ConstraintTemplate
      let templateObjToApply: any;
      try {
        // We need to find the ConstraintTemplate document specifically if rawYAML contains multiple docs
        const parsedDocs = yaml.loadAll(libraryTemplateItem.rawYAML) as KubeObjectInterface[];
        templateObjToApply = parsedDocs.find(doc => doc && doc.kind === 'ConstraintTemplate');
        if (!templateObjToApply) {
          throw new Error('ConstraintTemplate document not found in the provided YAML.');
        }
      } catch (e: any) {
        throw new Error(`Invalid ConstraintTemplate YAML: ${e.message}`);
      }

      if (!templateObjToApply || !templateObjToApply.kind || !templateObjToApply.apiVersion) {
        throw new Error('Parsed template YAML is not a valid Kubernetes object.');
      }

      try {
        await ApiProxy.request(
          `/apis/templates.gatekeeper.sh/v1/constrainttemplates`, // Using v1 as per Gatekeeper docs for CTs
          {
            method: 'POST',
            body: JSON.stringify(templateObjToApply),
            headers: { 'Content-Type': 'application/json' },
          }
        );
        successMessage = "ConstraintTemplate applied successfully! Waiting for CRD to be established... ";
        setSnackbarState({ open: true, message: successMessage, severity: 'info' });
      } catch (ctError: any) {
        if (ctError.status === 409) { // HTTP 409 Conflict
          console.warn(`ConstraintTemplate ${templateObjToApply.metadata.name} already exists. Proceeding to CRD check and Constraint application.`);
          successMessage = t('ConstraintTemplate {{name}} already exists. Checking CRD...', { name: templateObjToApply.metadata.name });
          setSnackbarState({ open: true, message: successMessage, severity: 'warning' });
        } else {
          throw ctError; // Re-throw other errors
        }
      }

      // 2. Poll for CRD readiness
      const crdName = `${pluralPath}.constraints.gatekeeper.sh`;
      let crdEstablished = false;
      const startTime = Date.now();

      while (Date.now() - startTime < CRD_ESTABLISHED_TIMEOUT_MS) {
        if (await checkCRDEstablished(crdName)) {
          crdEstablished = true;
          break;
        }
        await new Promise(resolve => setTimeout(resolve, CRD_POLL_INTERVAL_MS));
      }

      if (!crdEstablished) {
        throw new Error(t('CRD {{crdName}} was not established within {{seconds}} seconds.', { crdName, seconds: CRD_ESTABLISHED_TIMEOUT_MS / 1000 }));
      }
      successMessage = t('ConstraintTemplate applied & CRD {{crdName}} established. Applying constraint...', { crdName });
      setSnackbarState({ open: true, message: successMessage, severity: 'info' });

      // 3. Apply Constraint
      let constraintObjToApply: any;
      try {
        constraintObjToApply = yaml.load(generatedConstraintYAML);
      } catch (e: any) {
        throw new Error(`Invalid generated Constraint YAML: ${e.message}`);
      }

      if (!constraintObjToApply || !constraintObjToApply.kind || !constraintObjToApply.apiVersion) {
        throw new Error('Parsed constraint YAML is not a valid Kubernetes object.');
      }

      const constraintPlural = pluralPath.toLowerCase(); // Already validated that pluralPath exists
      const constraintApiVersion = constraintObjToApply.apiVersion;
      const constraintPostUrl = `/apis/${constraintApiVersion}/${constraintPlural}`;

      await ApiProxy.request(
        constraintPostUrl,
        {
          method: 'POST',
          body: JSON.stringify(constraintObjToApply),
          headers: { 'Content-Type': 'application/json' },
        }
      );
      successMessage = t('ConstraintTemplate and Constraint applied successfully!');
      setSnackbarState({ open: true, message: successMessage, severity: 'success' });

    } catch (err: any) {
      let errorMessage = err.message || t('Unknown error');
      if (err.json && err.json.message) {
        errorMessage = err.json.message;
      }
      setSnackbarState({ open: true, message: t('Failed to apply: {{errorMessage}}', { errorMessage }), severity: 'error' });
    } finally {
      setApplying(false);
    }
  };

  const handleCloseSnackbar = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarState(prev => ({ ...prev, open: false }));
  };

  if (loading) {
    return <CircularProgress />;
  }

  if (!libraryTemplateItem || !libraryTemplateItem.rawYAML || (error && !parsedTemplate)) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h5" gutterBottom>
          {t('Library Template Details')}
        </Typography>
        <Typography color="error">{error || t('Could not load template details.')}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        {t('Library Template: {{name}}', { name: libraryTemplateItem.name })}
      </Typography>
      {error && !parsedTemplate && <Typography color="error" gutterBottom>{t('Error: {{error}}', { error })}</Typography>}

      <SectionBox title={t('ConstraintTemplate Definition')}>
        <Paper elevation={2} sx={{ p: 1, overflowX: 'auto' }}>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {libraryTemplateItem.rawYAML}
          </pre>
        </Paper>
      </SectionBox>

      {parsedTemplate && (
        <SectionBox title={t('Create Constraint from this Template')} sx={{ mt: 2 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              {t('Constraint Details (Kind: {{kind}})', { kind: parsedTemplate.spec.crd.spec.names.kind })}
            </Typography>
            <TextField
              label={t('Constraint Name')}
              value={constraintName}
              onChange={(e) => setConstraintName(e.target.value)}
              fullWidth
              margin="normal"
              required
              error={!constraintName.trim()}
              helperText={!constraintName.trim() ? t('Constraint name is required.') : ''}
            />

            <Typography variant="subtitle1" sx={{ mt: 2, mb: 0.5 }}>{t('Match Criteria (JSON):')}</Typography>
            <TextField
              label={t('Match Criteria (JSON format)')}
              value={matchCriteria}
              onChange={(e) => setMatchCriteria(e.target.value)}
              multiline
              rows={5}
              fullWidth
              margin="normal"
              variant="outlined"
              InputProps={{
                style: { fontFamily: 'monospace' }
              }}
            />

            <Typography variant="subtitle1" sx={{ mt: 1, mb: 0.5 }}>{t('Parameters (JSON):')}</Typography>
            {parsedTemplate.spec.crd.spec.validation?.openAPIV3Schema?.properties && (
              <Box mb={1}>
                <TextField
                  label={t('Parameters (JSON format)')}
                  value={constraintParams}
                  onChange={(e) => setConstraintParams(e.target.value)}
                  multiline
                  rows={5}
                  fullWidth
                  margin="normal"
                  variant="outlined"
                  InputProps={{
                    style: { fontFamily: 'monospace' }
                  }}
                />
              </Box>
            )}

            <Button
              variant="contained"
              color="primary"
              onClick={handleGenerateConstraint}
              sx={{ mt: 2, mr: 1 }}
              disabled={!constraintName || !constraintParams || !matchCriteria || !parsedTemplate}
            >
              {t('Preview Constraint YAML')}
            </Button>
          </Paper>
        </SectionBox>
      )}

      {generatedConstraintYAML && (
        <SectionBox title={t('Generated Constraint YAML')} sx={{ mt: 2 }}>
          <Paper elevation={2} sx={{ p: 1, overflowX: 'auto' }}>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {generatedConstraintYAML}
            </pre>
          </Paper>
        </SectionBox>
      )}

      {(libraryTemplateItem.rawYAML || generatedConstraintYAML) && parsedTemplate && (
        <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', alignItems: 'start' }}>
          <Button
            variant="contained"
            color="secondary"
            onClick={handleApplyTemplateAndConstraint}
            disabled={applying || !libraryTemplateItem.rawYAML || (parsedTemplate && !generatedConstraintYAML)}
            startIcon={applying ? <CircularProgress size={20} /> : null}
          >
            {applying ? t('Applying...') : t('Apply Template & Constraint to Cluster')}
          </Button>
        </Box>
      )}

      <Snackbar
        open={snackbarState.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbarState.severity} sx={{ width: '100%' }}>
          {snackbarState.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default LibraryTemplateDetails;
