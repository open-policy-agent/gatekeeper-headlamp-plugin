import {
  Link,
  Loader,
  SectionBox,
  SimpleTable,
} from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import {
  Box,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Typography} from '@mui/material';
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ConstraintClass } from '../model';

interface ViolationsDetailsProps {}

function ViolationsDetails({}: ViolationsDetailsProps) {
  const { t } = useTranslation();
  const { name } = useParams<{ kind: string; name: string }>();
  const [constraint, setConstraint] = useState<any>(null);

  ConstraintClass.useApiGet(setConstraint, name);

  if (!constraint) {
    return <Loader title={t('Loading violation details')} />;
  }

  function getConstraintInfoRows() {
    if (!constraint) return [];

    const action = constraint.spec?.enforcementAction || 'warn';
    const actionColor = ({
      deny: 'error',
      dryrun: 'warning',
      warn: 'info',
    } as any)[action] as 'error' | 'warning' | 'info';

    return [
      {
        name: t('Constraint Name'),
        value: (
          <Link
            routeName="gatekeeper/constraints/:kind/:name"
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
        name: t('Constraint Kind'),
        value: constraint.kind,
      },
      {
        name: t('Enforcement Action'),
        value: <Chip label={action} color={actionColor} size="small" />,
      },
      {
        name: t('Total Violations'),
        value: constraint.status?.totalViolations?.toString() || '0',
      },
      {
        name: t('Last Audit'),
        value: constraint.status?.auditTimestamp || t('Never'),
      },
    ];
  }

  function getViolationRows() {
    if (!constraint || !constraint.status?.violations) {
      return [];
    }

    return constraint.status.violations.map((violation: any, index: number) => ({
      Resource: `${violation.kind}/${violation.name}`,
      Namespace: violation.namespace || t('cluster-scoped'),
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
          Property: t('API Groups'),
          Value: kindRule.apiGroups.join(', '),
          Index: `kinds-${index}-apiGroups`,
        });
        rules.push({
          Property: t('Kinds'),
          Value: kindRule.kinds.join(', '),
          Index: `kinds-${index}-kinds`,
        });
      });
    }

    if (match.excludedNamespaces) {
      rules.push({
        Property: t('Excluded Namespaces'),
        Value: match.excludedNamespaces.join(', '),
        Index: 'excludedNamespaces',
      });
    }

    return rules;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {t('Violations for {{name}}', { name: constraint.metadata.name })}
      </Typography>
      <Typography variant="subtitle1" color="textSecondary" gutterBottom>
        {t('{{kind}} Constraint Violations', { kind: constraint.kind })}
      </Typography>

      <SectionBox title={t('Constraint Details')}>
        <Table>
          <TableBody>
            {getConstraintInfoRows().map((row) => (
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

      <SectionBox title={t('Match Rules')}>
        <SimpleTable
          data={getMatchRules()}
          columns={[
            {
              label: t('Property'),
              getter: (row: any) => row.Property,
            },
            {
              label: t('Value'),
              getter: (row: any) => row.Value,
            },
          ]}
        />
      </SectionBox>

      <SectionBox title={t('Violations ({{count}})', { count: constraint.status?.totalViolations || 0 })}>
        <SimpleTable
          data={getViolationRows()}
          columns={[
            {
              label: t('Resource'),
              getter: (row: any) => row.Resource,
            },
            {
              label: t('Namespace'),
              getter: (row: any) => row.Namespace,
            },
            {
              label: t('API Version'),
              getter: (row: any) => row['API Version'],
            },
            {
              label: t('Message'),
              getter: (row: any) => row.Message,
            },
          ]}
        />
      </SectionBox>
    </Box>
  );
}

export default ViolationsDetails;
