import { Link, SectionBox, SimpleTable } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Box, Chip, Table, TableBody, TableCell, TableRow, Typography } from '@mui/material';
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ResourceDetailsError, ResourceDetailsLoading } from '../components/ResourceDetailsState';
import { RouteName } from '../index';
import { ConstraintClass } from '../model';

interface ViolationsDetailsProps {}

function ViolationsDetails({}: ViolationsDetailsProps) {
  const { kind, name } = useParams<{ kind: string; name: string }>();
  const [constraint, setConstraint] = useState<any>(null);
  const { error, loading } = ConstraintClass.useApiGet(setConstraint, name, kind);

  if (error) {
    return (
      <ResourceDetailsError
        error={error}
        kind={kind ? `${kind} Constraint` : 'Constraint'}
        name={name}
      />
    );
  }

  if (loading || !constraint) {
    return <ResourceDetailsLoading kind="Violation" />;
  }

  function getConstraintInfoRows() {
    if (!constraint) return [];

    const action = constraint.spec?.enforcementAction || 'warn';
    const actionColor = (
      {
        deny: 'error',
        dryrun: 'warning',
        warn: 'info',
      } as any
    )[action] as 'error' | 'warning' | 'info';

    return [
      {
        name: 'Constraint Name',
        value: (
          <Link
            routeName={RouteName.Constraint}
            params={{
              kind: constraint.kind,
              name: constraint.metadata.name,
            }}
          >
            {constraint.metadata.name}
          </Link>
        ),
      },
      {
        name: 'Constraint Kind',
        value: constraint.kind,
      },
      {
        name: 'Enforcement Action',
        value: <Chip label={action} color={actionColor} size="small" />,
      },
      {
        name: 'Total Violations',
        value: constraint.status?.totalViolations?.toString() || '0',
      },
      {
        name: 'Last Audit',
        value: constraint.status?.auditTimestamp || 'Never',
      },
    ];
  }

  function getViolationRows() {
    if (!constraint || !constraint.status?.violations) {
      return [];
    }

    return constraint.status.violations.map((violation: any, index: number) => ({
      Resource: `${violation.kind}/${violation.name}`,
      Namespace: violation.namespace || 'cluster-scoped',
      'API Version': violation.apiVersion,
      Message: violation.message,
      Index: index,
    }));
  }

  function getMatchRules() {
    if (!constraint || !constraint.spec?.match) {
      return [];
    }

    const match = constraint.spec.match;
    const rules = [];

    if (match.kinds) {
      match.kinds.forEach((kindRule: any, index: number) => {
        rules.push({
          Property: 'API Groups',
          Value: kindRule.apiGroups.join(', '),
          Index: `kinds-${index}-apiGroups`,
        });
        rules.push({
          Property: 'Kinds',
          Value: kindRule.kinds.join(', '),
          Index: `kinds-${index}-kinds`,
        });
      });
    }

    if (match.excludedNamespaces) {
      rules.push({
        Property: 'Excluded Namespaces',
        Value: match.excludedNamespaces.join(', '),
        Index: 'excludedNamespaces',
      });
    }

    return rules;
  }

  return (
    <Box sx={{ pt: 2, pb: 2 }}>
      <Typography variant="h4" gutterBottom>
        Violations for {constraint.metadata.name}
      </Typography>
      <Typography variant="subtitle1" color="textSecondary" gutterBottom>
        {constraint.kind} Constraint Violations
      </Typography>

      <SectionBox title="Constraint Details">
        <Table>
          <TableBody>
            {getConstraintInfoRows().map(row => (
              <TableRow key={row.name}>
                <TableCell component="th" scope="row">
                  {row.name}
                </TableCell>
                <TableCell>{row.value}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionBox>

      <SectionBox title="Match Rules">
        <SimpleTable
          data={getMatchRules()}
          columns={[
            {
              label: 'Property',
              getter: (row: any) => row.Property,
            },
            {
              label: 'Value',
              getter: (row: any) => row.Value,
            },
          ]}
        />
      </SectionBox>

      <SectionBox title={`Violations (${constraint.status?.totalViolations || 0})`}>
        <SimpleTable
          data={getViolationRows()}
          columns={[
            {
              label: 'Resource',
              getter: (row: any) => row.Resource,
            },
            {
              label: 'Namespace',
              getter: (row: any) => row.Namespace,
            },
            {
              label: 'API Version',
              getter: (row: any) => row['API Version'],
            },
            {
              label: 'Message',
              getter: (row: any) => row.Message,
            },
          ]}
        />
      </SectionBox>
    </Box>
  );
}

export default ViolationsDetails;
