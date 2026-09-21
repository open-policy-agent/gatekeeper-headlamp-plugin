// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Router } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import BackButton from './BackButton';

afterEach(() => {
  cleanup();
});

describe('BackButton', () => {
  it('renders a button with "< Back" text and accessible label', () => {
    const history = createMemoryHistory({
      initialEntries: ['/gatekeeper/constraints/K8sRequiredLabels/demo'],
    });

    render(
      <Router history={history}>
        <BackButton fallbackUrl="/gatekeeper/constraints" />
      </Router>
    );

    const button = screen.getByRole('button', { name: 'Back' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('< Back');
  });

  it('navigates back using history.goBack when navigated via PUSH (in-app navigation)', async () => {
    const user = userEvent.setup();
    const history = createMemoryHistory({
      initialEntries: ['/gatekeeper/constraints'],
    });
    // In-app navigation pushes the new route
    history.push('/gatekeeper/constraints/K8sRequiredLabels/demo');

    const goBackSpy = vi.spyOn(history, 'goBack');

    render(
      <Router history={history}>
        <BackButton fallbackUrl="/gatekeeper/constraints" />
      </Router>
    );

    const button = screen.getByRole('button', { name: 'Back' });
    await user.click(button);

    expect(goBackSpy).toHaveBeenCalled();
  });

  it('falls back to history.push with cluster-prefixed path when landed directly (action POP)', async () => {
    const user = userEvent.setup();
    // Direct landing or refresh has action 'POP'
    const history = createMemoryHistory({
      initialEntries: ['/c/prod-cluster/gatekeeper/constraints/K8sRequiredLabels/demo'],
    });

    const pushSpy = vi.spyOn(history, 'push');
    const goBackSpy = vi.spyOn(history, 'goBack');

    render(
      <Router history={history}>
        <BackButton fallbackUrl="/gatekeeper/constraints" />
      </Router>
    );

    const button = screen.getByRole('button', { name: 'Back' });
    await user.click(button);

    expect(pushSpy).toHaveBeenCalledWith('/c/prod-cluster/gatekeeper/constraints');
    expect(goBackSpy).not.toHaveBeenCalled();
  });

  it('supports the "to" prop as an alias for fallbackUrl', async () => {
    const user = userEvent.setup();
    const history = createMemoryHistory({
      initialEntries: ['/c/prod-cluster/gatekeeper/library/demo-template'],
    });

    const pushSpy = vi.spyOn(history, 'push');

    render(
      <Router history={history}>
        <BackButton to="/gatekeeper/library" />
      </Router>
    );

    const button = screen.getByRole('button', { name: 'Back' });
    await user.click(button);

    expect(pushSpy).toHaveBeenCalledWith('/c/prod-cluster/gatekeeper/library');
  });
});
