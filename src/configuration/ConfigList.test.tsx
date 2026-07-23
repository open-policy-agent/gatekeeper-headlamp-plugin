// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  onList: null as null | ((items: any[]) => void),
  onError: null as null | ((error: Error) => void),
  useApiList: vi.fn(),
}));

vi.mock('@kinvolk/headlamp-plugin/lib/CommonComponents', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SectionBox: ({ children, title }: { children: React.ReactNode; title?: string }) => (
    <section>
      {title && <h2>{title}</h2>}
      {children}
    </section>
  ),
  SimpleTable: ({ data }: { data: any[] }) => <div>rows:{data.length}</div>,
}));

vi.mock('../index', () => ({
  RoutingPath: { Config: '/gatekeeper/config/:namespace/:name' },
}));

vi.mock('../model', () => ({
  ConfigClass: {
    useApiList: (onList: (items: any[]) => void, onError: (error: Error) => void) => {
      mocks.useApiList(onList, onError);
      mocks.onList = onList;
      mocks.onError = onError;
    },
  },
}));

import ConfigList from './ConfigList';

beforeEach(() => {
  mocks.onList = null;
  mocks.onError = null;
  mocks.useApiList.mockReset();
});

afterEach(() => {
  cleanup();
});

describe('ConfigList', () => {
  it('clears a transient API error when a later list response succeeds', () => {
    render(<ConfigList />);

    act(() => {
      mocks.onError?.(Object.assign(new Error('Forbidden'), { status: 403 }));
    });
    expect(screen.getByText('Access denied')).toBeTruthy();

    act(() => {
      mocks.onList?.([]);
    });
    expect(screen.queryByText('Access denied')).not.toBeInTheDocument();
    expect(screen.getByText('rows:0')).toBeTruthy();
  });
});
