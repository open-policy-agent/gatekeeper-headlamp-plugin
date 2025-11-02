import React from 'react';

// Mock plugin registry functions
export const registerRoute = jest.fn();
export const registerSidebarEntry = jest.fn();

// Mock common components
export const SectionBox = ({ children, title }: any) =>
  React.createElement('div', { 'data-testid': 'section-box', title }, children);

export const Link = ({ children, routeName, params }: any) =>
  React.createElement('a', {
    'data-testid': 'headlamp-link',
    'data-route': routeName,
    'data-params': JSON.stringify(params),
  }, children);

export const Loader = ({ title }: any) =>
  React.createElement('div', { 'data-testid': 'loader' }, title);

export const SimpleTable = ({ children }: any) =>
  React.createElement('div', { 'data-testid': 'simple-table' }, children);

// Mock KubeObject
export class KubeObject {
  jsonData: any;
  constructor(data: any) {
    this.jsonData = data;
  }
}

// Mock makeCustomResourceClass
export const makeCustomResourceClass = jest.fn(() => ({
  useApiList: jest.fn(),
  useApiGet: jest.fn(),
}));

// Mock API Proxy
export const ApiProxy = {
  request: jest.fn(),
};

// Default exports for different import paths
export default {
  registerRoute,
  registerSidebarEntry,
  CommonComponents: {
    SectionBox,
    Link,
    Loader,
    SimpleTable,
  },
  ApiProxy,
  K8s: {
    cluster: {
      KubeObject,
    },
    crd: {
      makeCustomResourceClass,
    },
  },
};
