// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Router } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@kinvolk/headlamp-plugin/lib/CommonComponents', () => ({
  SectionBox: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <section aria-label={title}>{children}</section>
  ),
}));

vi.mock('./constraint-template/List', () => ({
  default: () => <div>Constraint template list</div>,
}));
vi.mock('./constraint/List', () => ({
  default: () => <div>Constraint list</div>,
}));
vi.mock('./violations/List', () => ({
  default: () => <div>Violation list</div>,
}));
vi.mock('./mutation/AssignList', () => ({
  default: () => <div>Assign list</div>,
}));
vi.mock('./mutation/AssignMetadataList', () => ({
  default: () => <div>AssignMetadata list</div>,
}));
vi.mock('./mutation/AssignImageList', () => ({
  default: () => <div>AssignImage list</div>,
}));
vi.mock('./mutation/ModifySetList', () => ({
  default: () => <div>ModifySet list</div>,
}));
vi.mock('./configuration/ConfigList', () => ({
  default: () => <div>Config list</div>,
}));
vi.mock('./configuration/SyncSetList', () => ({
  default: () => <div>SyncSet list</div>,
}));
vi.mock('./externaldata/ProviderList', () => ({
  default: () => <div>Provider list</div>,
}));
vi.mock('./externaldata/ConnectionList', () => ({
  default: () => <div>Connection list</div>,
}));

import ConfigurationPage from './configuration/ConfigurationPage';
import ConstraintsPage from './constraints/ConstraintsPage';
import ExternalDataPage from './externaldata/ExternalDataPage';
import ViolationExportPage from './externaldata/ViolationExportPage';
import MutationsPage from './mutation/MutationsPage';

afterEach(() => {
  cleanup();
});

function renderAtPath(component: React.ReactElement, initialPath: string) {
  const history = createMemoryHistory({ initialEntries: [initialPath] });
  const user = userEvent.setup();

  render(<Router history={history}>{component}</Router>);

  return { history, user };
}

function expectTabPanelRelationship(tabName: string) {
  const tab = screen.getByRole('tab', { name: tabName });
  const panel = screen.getByRole('tabpanel', { name: tabName });

  expect(tab).toHaveAttribute('aria-controls', panel.id);
  expect(panel).toHaveAttribute('aria-labelledby', tab.id);
}

describe('route-addressable Gatekeeper tabs', () => {
  it('opens /constraints on the Constraints tab and preserves cluster context in history', async () => {
    const { history, user } = renderAtPath(
      <ConstraintsPage />,
      '/c/gatekeeper/gatekeeper/constraints'
    );

    expect(screen.getByRole('tab', { name: 'Constraints' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByText('Constraint list')).toBeInTheDocument();
    expect(screen.queryByText('Constraint template list')).not.toBeInTheDocument();
    expectTabPanelRelationship('Constraints');

    await user.click(screen.getByRole('tab', { name: 'Violations' }));

    expect(history.location.pathname).toBe('/c/gatekeeper/gatekeeper/violations');
    expect(screen.getByText('Violation list')).toBeInTheDocument();
    expectTabPanelRelationship('Violations');

    act(() => history.goBack());

    await waitFor(() =>
      expect(screen.getByRole('tab', { name: 'Constraints' })).toHaveAttribute(
        'aria-selected',
        'true'
      )
    );
  });

  it('restores the legacy Constraint Templates and Violations URLs', async () => {
    const firstRender = renderAtPath(
      <ConstraintsPage />,
      '/c/test/gatekeeper/constraint-templates/'
    );

    expect(screen.getByRole('tab', { name: 'Constraint Templates' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    act(() => firstRender.history.push('/c/test/gatekeeper/violations'));

    await waitFor(() =>
      expect(screen.getByRole('tab', { name: 'Violations' })).toHaveAttribute(
        'aria-selected',
        'true'
      )
    );
  });

  it('selects mutation tabs from child routes and records tab changes', async () => {
    const { history, user } = renderAtPath(
      <MutationsPage />,
      '/c/test/gatekeeper/mutations/modifysets'
    );

    expect(screen.getByRole('tab', { name: 'ModifySet' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('ModifySet list')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'AssignMetadata' }));

    expect(history.location.pathname).toBe('/c/test/gatekeeper/mutations/assignmetadatas');
    expect(screen.getByText('AssignMetadata list')).toBeInTheDocument();
    expectTabPanelRelationship('AssignMetadata');
  });

  it('selects configuration tabs from child routes', async () => {
    const { history, user } = renderAtPath(
      <ConfigurationPage />,
      '/c/test/gatekeeper/configuration/syncsets'
    );

    expect(screen.getByRole('tab', { name: 'SyncSet' })).toHaveAttribute('aria-selected', 'true');

    await user.click(screen.getByRole('tab', { name: 'Config' }));

    expect(history.location.pathname).toBe('/c/test/gatekeeper/configuration/configs');
    expect(screen.getByText('Config list')).toBeInTheDocument();
    expectTabPanelRelationship('Config');
  });
});

describe('Connection product-area separation', () => {
  it('keeps External Data provider-focused', () => {
    renderAtPath(<ExternalDataPage />, '/c/test/gatekeeper/externaldata');

    expect(screen.getByText('Provider list')).toBeInTheDocument();
    expect(screen.queryByText('Connection list')).not.toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });

  it('renders Connection resources on the Violation Export page', () => {
    renderAtPath(<ViolationExportPage />, '/c/test/gatekeeper/violation-export');

    expect(screen.getByRole('region', { name: 'Violation Export' })).toBeInTheDocument();
    expect(screen.getByText('Connection list')).toBeInTheDocument();
  });
});
