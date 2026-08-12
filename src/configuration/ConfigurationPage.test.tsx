// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Router } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ConfigurationPage from './ConfigurationPage';

vi.mock('@kinvolk/headlamp-plugin/lib/CommonComponents', () => ({
  SectionBox: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <section aria-label={title}>{children}</section>
  ),
}));

vi.mock('./ConfigList', () => ({
  default: ({ hideTitle }: { hideTitle?: boolean }) => (
    <div>Config list (hide title: {String(hideTitle)})</div>
  ),
}));

vi.mock('./SyncSetList', () => ({
  default: ({ hideTitle }: { hideTitle?: boolean }) => (
    <div>SyncSet list (hide title: {String(hideTitle)})</div>
  ),
}));

afterEach(cleanup);

describe('ConfigurationPage', () => {
  it('selects the route-backed tab and preserves the cluster prefix when switching tabs', async () => {
    const history = createMemoryHistory({
      initialEntries: ['/c/production-west/gatekeeper/configuration/syncsets'],
    });
    const user = userEvent.setup();

    render(
      <Router history={history}>
        <ConfigurationPage />
      </Router>
    );

    expect(screen.getByRole('tab', { name: 'SyncSet' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('SyncSet list (hide title: true)')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Config' }));

    expect(history.location.pathname).toBe('/c/production-west/gatekeeper/configuration/configs');
    expect(screen.getByRole('tab', { name: 'Config' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Config list (hide title: true)')).toBeInTheDocument();
  });

  it('keeps the configuration root alias on the Config view', () => {
    const history = createMemoryHistory({
      initialEntries: ['/c/test-cluster/gatekeeper/configuration/'],
    });

    render(
      <Router history={history}>
        <ConfigurationPage />
      </Router>
    );

    expect(screen.getByRole('tab', { name: 'Config' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Config list (hide title: true)')).toBeInTheDocument();
    expect(screen.queryByText('SyncSet list (hide title: true)')).not.toBeInTheDocument();
  });
});
