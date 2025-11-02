import '@testing-library/jest-dom';

// Mock Headlamp plugin modules
jest.mock('@kinvolk/headlamp-plugin/lib/CommonComponents', () => ({
  SectionBox: ({ children, title }: any) => <div data-testid="section-box" title={title}>{children}</div>,
  Link: ({ children, routeName, params }: any) => (
    <a data-testid="headlamp-link" data-route={routeName} data-params={JSON.stringify(params)}>
      {children}
    </a>
  ),
  Loader: ({ title }: any) => <div data-testid="loader">{title}</div>,
  SimpleTable: ({ children }: any) => <div data-testid="simple-table">{children}</div>,
}));

jest.mock('@kinvolk/headlamp-plugin/lib/lib/k8s/cluster', () => ({
  KubeObject: class {
    jsonData: any;
    constructor(data: any) {
      this.jsonData = data;
    }
  },
}));

jest.mock('@kinvolk/headlamp-plugin/lib/lib/k8s/crd', () => ({
  makeCustomResourceClass: jest.fn(() => ({
    useApiList: jest.fn(),
    useApiGet: jest.fn(),
  })),
}));

jest.mock('@kinvolk/headlamp-plugin/lib/ApiProxy', () => ({
  request: jest.fn(),
}));

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    goBack: jest.fn(),
  }),
  useLocation: () => ({
    pathname: '/c/test-cluster/gatekeeper/constraint-templates',
    search: '',
    hash: '',
    state: undefined,
  }),
  useParams: () => ({}),
}));

// Suppress console errors in tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
