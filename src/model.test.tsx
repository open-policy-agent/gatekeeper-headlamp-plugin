// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import React, { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const apiMocks = vi.hoisted(() => ({
  request: vi.fn(),
}));

vi.mock('@kinvolk/headlamp-plugin/lib/ApiProxy', () => ({
  request: apiMocks.request,
}));

vi.mock('@kinvolk/headlamp-plugin/lib/lib/k8s/crd', () => ({
  makeCustomResourceClass: vi.fn(() => ({})),
}));

import {
  ConstraintClass,
  getConstraintTypeDefinitions,
  isNotFoundError,
  requestConstraintTemplates,
  resolveConstraintPlural,
} from './model';

function constraintTemplate(kind: string, plural?: string) {
  return {
    spec: {
      crd: {
        spec: {
          names: { kind, ...(plural ? { plural } : {}) },
        },
      },
    },
  };
}

const templatesResponse = {
  items: [
    constraintTemplate('K8sAllowedRepos', 'k8sallowedrepos'),
    constraintTemplate('K8sRequiredLabels', 'k8srequiredlabels'),
  ],
};

function ConstraintProbe({ kind, name }: { kind?: string; name: string }) {
  const [constraint, setConstraint] = useState<any>(null);
  const { constraintPlural, error, loading } = ConstraintClass.useApiGet(setConstraint, name, kind);

  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="plural">{constraintPlural || ''}</span>
      <span data-testid="kind">{constraint?.kind || ''}</span>
      <span data-testid="error-status">{error?.status || ''}</span>
      <span data-testid="error-message">{error?.message || ''}</span>
    </div>
  );
}

function ConstraintListProbe() {
  const [constraints, setConstraints] = useState<any[]>([]);
  ConstraintClass.useApiList(setConstraints);

  return <span data-testid="constraint-kinds">{constraints.map(item => item.kind).join(',')}</span>;
}

beforeEach(() => {
  apiMocks.request.mockReset();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('getConstraintTypeDefinitions', () => {
  it('derives the REST plural from Kind when a valid ConstraintTemplate omits names.plural', () => {
    expect(
      getConstraintTypeDefinitions({ items: [constraintTemplate('K8sRequiredLabels')] })
    ).toEqual([{ kind: 'K8sRequiredLabels', plural: 'k8srequiredlabels' }]);
  });

  it('normalizes explicit plurals, skips malformed templates, de-duplicates, and sorts', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(
      getConstraintTypeDefinitions({
        items: [
          constraintTemplate('Zed', '  ZEDS  '),
          { spec: { crd: { spec: { names: { plural: 'missing-kind' } } } } },
          constraintTemplate('Alpha'),
          constraintTemplate('Zed', 'zeds'),
        ],
      })
    ).toEqual([
      { kind: 'Alpha', plural: 'alpha' },
      { kind: 'Zed', plural: 'zeds' },
    ]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('missing a Kubernetes kind'));

    warn.mockRestore();
  });

  it('returns no definitions for a malformed list response', () => {
    expect(getConstraintTypeDefinitions(undefined)).toEqual([]);
    expect(getConstraintTypeDefinitions({ items: {} })).toEqual([]);
  });
});

describe('constraint type resolution', () => {
  it('resolves exact Kubernetes kinds and returns null for unknown kinds', () => {
    const definitions = getConstraintTypeDefinitions(templatesResponse);

    expect(resolveConstraintPlural(definitions, 'K8sRequiredLabels')).toBe('k8srequiredlabels');
    expect(resolveConstraintPlural(definitions, 'k8srequiredlabels')).toBeNull();
  });

  it('rejects ambiguous mappings instead of guessing a REST resource', () => {
    expect(() =>
      resolveConstraintPlural(
        [
          { kind: 'DuplicateKind', plural: 'first' },
          { kind: 'DuplicateKind', plural: 'second' },
        ],
        'DuplicateKind'
      )
    ).toThrow('maps to multiple REST resources: first, second');
  });
});

describe('ConstraintTemplate API fallback', () => {
  it('falls back from v1 to v1beta1 only when v1 is unavailable', async () => {
    apiMocks.request
      .mockRejectedValueOnce(Object.assign(new Error('Not Found'), { status: 404 }))
      .mockResolvedValueOnce({ metadata: { name: 'template-a' } });

    await expect(requestConstraintTemplates('template-a')).resolves.toEqual({
      metadata: { name: 'template-a' },
    });
    expect(apiMocks.request.mock.calls).toEqual([
      ['/apis/templates.gatekeeper.sh/v1/constrainttemplates/template-a'],
      ['/apis/templates.gatekeeper.sh/v1beta1/constrainttemplates/template-a'],
    ]);
  });

  it('does not mask authentication or server failures with a version fallback', async () => {
    const forbidden = Object.assign(new Error('Forbidden'), { status: 403 });
    apiMocks.request.mockRejectedValueOnce(forbidden);

    await expect(requestConstraintTemplates()).rejects.toBe(forbidden);
    expect(apiMocks.request).toHaveBeenCalledTimes(1);
  });
});

describe('isNotFoundError', () => {
  it.each([
    { status: 404 },
    { json: { code: 404 } },
    { response: { status: 404 } },
    { json: { reason: 'NotFound' } },
    { response: { data: { reason: 'NotFound' } } },
  ])('recognizes Kubernetes not-found error shapes: %o', error => {
    expect(isNotFoundError(error)).toBe(true);
  });

  it('does not classify unrelated failures as not found', () => {
    expect(isNotFoundError(Object.assign(new Error('Forbidden'), { status: 403 }))).toBe(false);
    expect(isNotFoundError(null)).toBe(false);
  });
});

describe('ConstraintClass.useApiList', () => {
  it('aggregates discovered constraint resources and treats an absent generated CRD as empty', async () => {
    apiMocks.request.mockImplementation(async (url: string) => {
      if (url === '/apis/templates.gatekeeper.sh/v1/constrainttemplates') {
        return templatesResponse;
      }
      if (url === '/apis/constraints.gatekeeper.sh/v1beta1/k8sallowedrepos') {
        throw Object.assign(new Error('Not Found'), { status: 404 });
      }
      if (url === '/apis/constraints.gatekeeper.sh/v1beta1/k8srequiredlabels') {
        return { items: [{ kind: 'K8sRequiredLabels' }] };
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<ConstraintListProbe />);

    await waitFor(() =>
      expect(screen.getByTestId('constraint-kinds')).toHaveTextContent('K8sRequiredLabels')
    );
    expect(apiMocks.request).toHaveBeenCalledWith(
      '/apis/constraints.gatekeeper.sh/v1beta1/k8sallowedrepos'
    );
    expect(apiMocks.request).toHaveBeenCalledWith(
      '/apis/constraints.gatekeeper.sh/v1beta1/k8srequiredlabels'
    );
  });

  it('retains successful constraint kinds when another kind fails', async () => {
    const logError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const logWarning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    apiMocks.request.mockImplementation(async (url: string) => {
      if (url === '/apis/templates.gatekeeper.sh/v1/constrainttemplates') {
        return templatesResponse;
      }
      if (url === '/apis/constraints.gatekeeper.sh/v1beta1/k8sallowedrepos') {
        throw Object.assign(new Error('Service Unavailable'), { status: 503 });
      }
      if (url === '/apis/constraints.gatekeeper.sh/v1beta1/k8srequiredlabels') {
        return { items: [{ kind: 'K8sRequiredLabels' }] };
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<ConstraintListProbe />);

    await waitFor(() =>
      expect(screen.getByTestId('constraint-kinds')).toHaveTextContent('K8sRequiredLabels')
    );
    expect(logError).toHaveBeenCalledWith(
      expect.stringContaining('Failed to fetch constraints for type k8sallowedrepos'),
      expect.objectContaining({ status: 503 })
    );
    expect(logWarning).toHaveBeenCalledWith(
      expect.stringContaining('One or more constraint types failed to fetch')
    );

    logError.mockRestore();
    logWarning.mockRestore();
  });
});

describe('ConstraintClass.useApiGet', () => {
  it('supports legacy name-only routes by probing discovered kinds until one matches', async () => {
    apiMocks.request.mockImplementation(async (url: string) => {
      if (url === '/apis/templates.gatekeeper.sh/v1/constrainttemplates') {
        return templatesResponse;
      }
      if (url === '/apis/constraints.gatekeeper.sh/v1beta1/k8sallowedrepos/shared-constraint') {
        throw Object.assign(new Error('Not Found'), { status: 404 });
      }
      if (url === '/apis/constraints.gatekeeper.sh/v1beta1/k8srequiredlabels/shared-constraint') {
        return {
          kind: 'K8sRequiredLabels',
          metadata: { name: 'shared-constraint' },
        };
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<ConstraintProbe name="shared-constraint" />);

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('plural')).toHaveTextContent('k8srequiredlabels');
    expect(screen.getByTestId('kind')).toHaveTextContent('K8sRequiredLabels');
  });

  it('returns a kind-specific not-found error without querying unrelated resources', async () => {
    apiMocks.request.mockImplementation(async (url: string) => {
      if (url === '/apis/templates.gatekeeper.sh/v1/constrainttemplates') {
        return templatesResponse;
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<ConstraintProbe kind="MissingKind" name="shared-constraint" />);

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('error-status')).toHaveTextContent('404');
    expect(screen.getByTestId('error-message')).toHaveTextContent(
      'Constraint kind "MissingKind" was not found'
    );
    expect(apiMocks.request).toHaveBeenCalledTimes(1);
  });

  it('resolves the route Kubernetes Kind to its REST plural before fetching', async () => {
    apiMocks.request.mockImplementation(async (url: string) => {
      if (url === '/apis/templates.gatekeeper.sh/v1/constrainttemplates') {
        return templatesResponse;
      }
      if (url === '/apis/constraints.gatekeeper.sh/v1beta1/k8srequiredlabels/shared-constraint') {
        return {
          kind: 'K8sRequiredLabels',
          metadata: { name: 'shared-constraint' },
        };
      }
      if (url === '/apis/constraints.gatekeeper.sh/v1beta1/k8sallowedrepos/shared-constraint') {
        return {
          kind: 'K8sAllowedRepos',
          metadata: { name: 'shared-constraint' },
        };
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<ConstraintProbe kind="K8sRequiredLabels" name="shared-constraint" />);

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('plural')).toHaveTextContent('k8srequiredlabels');
    expect(screen.getByTestId('kind')).toHaveTextContent('K8sRequiredLabels');
    expect(apiMocks.request).toHaveBeenCalledWith(
      '/apis/constraints.gatekeeper.sh/v1beta1/k8srequiredlabels/shared-constraint'
    );
    expect(apiMocks.request).not.toHaveBeenCalledWith(
      '/apis/constraints.gatekeeper.sh/v1beta1/k8sallowedrepos/shared-constraint'
    );
  });

  it('does not fall back to another type when the explicit kind returns 404', async () => {
    apiMocks.request.mockImplementation(async (url: string) => {
      if (url === '/apis/templates.gatekeeper.sh/v1/constrainttemplates') {
        return templatesResponse;
      }
      if (url === '/apis/constraints.gatekeeper.sh/v1beta1/k8srequiredlabels/shared-constraint') {
        throw Object.assign(new Error('Not Found'), { status: 404 });
      }
      if (url === '/apis/constraints.gatekeeper.sh/v1beta1/k8sallowedrepos/shared-constraint') {
        return {
          kind: 'K8sAllowedRepos',
          metadata: { name: 'shared-constraint' },
        };
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<ConstraintProbe kind="K8sRequiredLabels" name="shared-constraint" />);

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('kind')).toBeEmptyDOMElement();
    expect(screen.getByTestId('error-status')).toHaveTextContent('404');
    expect(apiMocks.request).not.toHaveBeenCalledWith(
      '/apis/constraints.gatekeeper.sh/v1beta1/k8sallowedrepos/shared-constraint'
    );
  });

  it.each([
    Object.assign(new Error('Forbidden'), { status: 403 }),
    Object.assign(new Error('Service Unavailable'), { status: 503 }),
    new Error('Network unavailable'),
  ])('surfaces non-404 failures without probing another type: %s', async requestError => {
    apiMocks.request.mockImplementation(async (url: string) => {
      if (url === '/apis/templates.gatekeeper.sh/v1/constrainttemplates') {
        return templatesResponse;
      }
      if (url === '/apis/constraints.gatekeeper.sh/v1beta1/k8srequiredlabels/shared-constraint') {
        throw requestError;
      }
      if (url === '/apis/constraints.gatekeeper.sh/v1beta1/k8sallowedrepos/shared-constraint') {
        return {
          kind: 'K8sAllowedRepos',
          metadata: { name: 'shared-constraint' },
        };
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<ConstraintProbe kind="K8sRequiredLabels" name="shared-constraint" />);

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('kind')).toBeEmptyDOMElement();
    expect(screen.getByTestId('error-message')).toHaveTextContent(requestError.message);
    expect(apiMocks.request).not.toHaveBeenCalledWith(
      '/apis/constraints.gatekeeper.sh/v1beta1/k8sallowedrepos/shared-constraint'
    );
  });
});
