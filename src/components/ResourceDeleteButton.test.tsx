// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import type { KubeObject } from '@kinvolk/headlamp-plugin/lib/lib/k8s/cluster';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Router } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ResourceDeleteButton from './ResourceDeleteButton';

afterEach(() => {
  cleanup();
});

function makeResource(deleteResource: () => Promise<unknown>): KubeObject {
  return {
    delete: deleteResource,
    getName: () => 'example',
  } as unknown as KubeObject;
}

describe('ResourceDeleteButton', () => {
  it('deletes through the loaded KubeObject and replaces history with its list route', async () => {
    const user = userEvent.setup();
    const deleteResource = vi.fn().mockResolvedValue(undefined);
    const history = createMemoryHistory({
      initialEntries: ['/c/development/gatekeeper/mutations/assigns/example'],
    });

    render(
      <Router history={history}>
        <ResourceDeleteButton
          resource={makeResource(deleteResource)}
          kind="Assign"
          redirectUrl="/gatekeeper/mutations/assigns"
        />
      </Router>
    );

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(deleteResource).toHaveBeenCalledOnce());
    expect(history.action).toBe('REPLACE');
    expect(history.location.pathname).toBe('/c/development/gatekeeper/mutations/assigns');
  });

  it('does not redirect when the user navigates away while deletion is pending', async () => {
    const user = userEvent.setup();
    let resolveDelete: () => void = () => undefined;
    const pendingDelete = new Promise<void>(resolve => {
      resolveDelete = resolve;
    });
    const deleteResource = vi.fn().mockReturnValue(pendingDelete);
    const history = createMemoryHistory({
      initialEntries: ['/c/development/gatekeeper/mutations/assigns/example'],
    });
    const replace = vi.spyOn(history, 'replace');

    render(
      <Router history={history}>
        <ResourceDeleteButton
          resource={makeResource(deleteResource)}
          kind="Assign"
          redirectUrl="/gatekeeper/mutations/assigns"
        />
      </Router>
    );

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(deleteResource).toHaveBeenCalledOnce());

    act(() => history.push('/c/development/gatekeeper/library'));

    await act(async () => {
      resolveDelete();
      await pendingDelete;
    });

    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeEnabled();
    expect(history.action).toBe('PUSH');
    expect(history.location.pathname).toBe('/c/development/gatekeeper/library');
  });

  it('stays on the detail route and surfaces API errors when deletion fails', async () => {
    const user = userEvent.setup();
    const deleteResource = vi.fn().mockRejectedValue({
      json: { message: 'forbidden' },
    });
    const history = createMemoryHistory({
      initialEntries: ['/gatekeeper/configuration/configs/gatekeeper-system/config'],
    });

    render(
      <Router history={history}>
        <ResourceDeleteButton
          resource={makeResource(deleteResource)}
          kind="Config"
          redirectUrl="/gatekeeper/configuration/configs"
        />
      </Router>
    );

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('Failed to delete Config: forbidden')).toBeTruthy();
    expect(history.location.pathname).toBe(
      '/gatekeeper/configuration/configs/gatekeeper-system/config'
    );
  });
});
