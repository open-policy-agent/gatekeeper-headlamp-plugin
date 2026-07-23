// @vitest-environment jsdom

import type { KubeObject, KubeObjectClass } from '@kinvolk/headlamp-plugin/lib/lib/k8s/cluster';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useResourceDetails } from './ResourceDetailsState';

interface ApiGetCall {
  name: string;
  namespace?: string;
  onGet: (item: KubeObject | null) => void;
  onError: (error: Error | null) => void;
}

function makeResourceClass(calls: ApiGetCall[]): KubeObjectClass {
  return {
    useApiGet: vi.fn(
      (
        onGet: ApiGetCall['onGet'],
        name: string,
        namespace: string | undefined,
        onError: ApiGetCall['onError']
      ) => {
        calls.push({ name, namespace, onGet, onError });
      }
    ),
  } as unknown as KubeObjectClass;
}

function makeResource(name: string): KubeObject {
  return {
    jsonData: {
      metadata: { name },
    },
  } as unknown as KubeObject;
}

function findCall(calls: ApiGetCall[], name: string, namespace?: string): ApiGetCall {
  const call = calls.find(
    candidate => candidate.name === name && candidate.namespace === namespace
  );
  expect(call).toBeDefined();
  return call!;
}

afterEach(cleanup);

describe('useResourceDetails', () => {
  it('withholds the previous item whenever the requested resource identity changes', () => {
    const firstClassCalls: ApiGetCall[] = [];
    const secondClassCalls: ApiGetCall[] = [];
    const firstClass = makeResourceClass(firstClassCalls);
    const secondClass = makeResourceClass(secondClassCalls);
    const firstItem = makeResource('first');
    const secondItem = makeResource('second');
    const thirdItem = makeResource('third');

    const { result, rerender } = renderHook(
      ({ resourceClass, name, namespace }) => useResourceDetails(resourceClass, name, namespace),
      {
        initialProps: {
          resourceClass: firstClass,
          name: 'first',
          namespace: 'namespace-a' as string | undefined,
        },
      }
    );

    act(() => findCall(firstClassCalls, 'first', 'namespace-a').onGet(firstItem));
    expect(result.current.item).toBe(firstItem);

    rerender({ resourceClass: firstClass, name: 'second', namespace: 'namespace-a' });
    expect(result.current).toEqual({ item: null, error: null });

    act(() => findCall(firstClassCalls, 'second', 'namespace-a').onGet(secondItem));
    expect(result.current.item).toBe(secondItem);

    rerender({ resourceClass: firstClass, name: 'second', namespace: 'namespace-b' });
    expect(result.current).toEqual({ item: null, error: null });

    act(() => findCall(firstClassCalls, 'second', 'namespace-b').onGet(thirdItem));
    expect(result.current.item).toBe(thirdItem);

    rerender({ resourceClass: secondClass, name: 'second', namespace: 'namespace-b' });
    expect(result.current).toEqual({ item: null, error: null });
    expect(findCall(secondClassCalls, 'second', 'namespace-b')).toBeDefined();
  });
  it('ignores stale success and error callbacks after a newer request starts', () => {
    const calls: ApiGetCall[] = [];
    const resourceClass = makeResourceClass(calls);
    const staleItem = makeResource('stale');
    const currentItem = makeResource('current');

    const { result, rerender } = renderHook(
      ({ name }) => useResourceDetails(resourceClass, name, 'gatekeeper-system'),
      { initialProps: { name: 'stale' } }
    );
    const staleRequest = findCall(calls, 'stale', 'gatekeeper-system');

    rerender({ name: 'current' });
    const currentRequest = findCall(calls, 'current', 'gatekeeper-system');

    act(() => staleRequest.onGet(staleItem));
    expect(result.current).toEqual({ item: null, error: null });

    act(() => currentRequest.onGet(currentItem));
    expect(result.current).toEqual({ item: currentItem, error: null });

    act(() => {
      staleRequest.onError(Object.assign(new Error('stale forbidden'), { status: 403 }));
      staleRequest.onGet(staleItem);
    });
    expect(result.current).toEqual({ item: currentItem, error: null });
  });
});
