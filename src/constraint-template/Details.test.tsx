// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import type { KubeObject } from '@kinvolk/headlamp-plugin/lib/lib/k8s/cluster';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Route, Router } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useResourceDetails } from '../components/ResourceDetailsState';
import ConstraintTemplateDetails from './Details';

vi.mock('../index', () => ({
  RoutingPath: { ConstraintTemplates: '/gatekeeper/constraint-templates' },
}));

vi.mock('../model', () => ({
  ConstraintTemplateClass: {},
}));

vi.mock('@kinvolk/headlamp-plugin/lib/CommonComponents', () => ({
  SectionBox: ({ children }: { children?: React.ReactNode }) => <section>{children}</section>,
}));

vi.mock('../components/ResourceDetailsState', () => ({
  ResourceDetailsError: () => null,
  ResourceDetailsLoading: () => null,
  useResourceDetails: vi.fn(),
}));

const mockedUseResourceDetails = vi.mocked(useResourceDetails);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ConstraintTemplateDetails', () => {
  it('warns that deletion may remove or affect dependent constraints', async () => {
    const user = userEvent.setup();
    const history = createMemoryHistory({
      initialEntries: ['/gatekeeper/constraint-templates/example-template'],
    });
    const resource = {
      delete: vi.fn().mockResolvedValue(undefined),
      getName: () => 'example-template',
      jsonData: {
        metadata: { name: 'example-template' },
        spec: {
          crd: { spec: { names: { kind: 'ExampleConstraint', plural: 'exampleconstraints' } } },
          targets: [],
        },
        status: { created: true },
      },
    } as unknown as KubeObject;

    mockedUseResourceDetails.mockReturnValue({ item: resource, error: null });

    render(
      <Router history={history}>
        <Route path="/gatekeeper/constraint-templates/:name">
          <ConstraintTemplateDetails />
        </Route>
      </Router>
    );

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(
      within(screen.getByRole('dialog')).getByText(
        'Deleting this ConstraintTemplate may also remove or otherwise affect dependent constraints (policy instances) that use this template.'
      )
    ).toBeVisible();
  });
});
