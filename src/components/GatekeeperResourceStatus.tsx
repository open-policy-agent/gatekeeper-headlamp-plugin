import { SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Alert, AlertTitle } from '@mui/material';
import React from 'react';
import {
  assessGatekeeperResourceStatus,
  type GatekeeperResourceData,
  type ReadinessField,
} from './gatekeeperStatus';

export function GatekeeperResourceStatus({
  resource,
  readinessField,
}: {
  resource: GatekeeperResourceData;
  readinessField?: ReadinessField;
}) {
  const assessment = assessGatekeeperResourceStatus(resource, readinessField);

  return (
    <SectionBox title="Controller Status">
      <Alert severity={assessment.severity}>
        <AlertTitle>{assessment.title}</AlertTitle>
        {assessment.message}
        {assessment.details.length > 0 && (
          <ul style={{ marginBottom: 0 }}>
            {assessment.details.map((detail, index) => (
              <li key={`${detail}-${index}`}>{detail}</li>
            ))}
          </ul>
        )}
      </Alert>
    </SectionBox>
  );
}

export function NoPerResourceStatus({ kind }: { kind: string }) {
  return (
    <SectionBox title="Controller Status">
      <Alert severity="info">
        <AlertTitle>Per-resource status unavailable</AlertTitle>
        {kind} does not expose controller reconciliation status. Its presence confirms that
        Kubernetes stored the configuration, but it does not prove that Gatekeeper has synchronized
        it.
      </Alert>
    </SectionBox>
  );
}
