const mockRequirePermission = jest.fn((permission) => {
  const middleware = (_req, _res, next) => next();
  middleware.permission = permission;
  return middleware;
});

jest.mock('../src/middleware/auth', () => ({
  requireAuth: (_req, _res, next) => next(),
  requirePermission: mockRequirePermission,
}));

jest.mock('../src/db', () => ({
  query: jest.fn(),
  pool: {
    connect: jest.fn(),
  },
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

function findRoute(router, method, path) {
  return router.stack.find((layer) => {
    const route = layer.route;
    return route?.path === path && route.methods[method.toLowerCase()];
  });
}

function routePermissions(router, method, path) {
  const layer = findRoute(router, method, path);
  if (!layer) {
    return [];
  }
  return layer.route.stack
    .map((entry) => entry.handle.permission)
    .filter(Boolean);
}

function expectRoutePermission(router, method, path, permission) {
  expect(routePermissions(router, method, path)).toContain(permission);
}

describe('owned backend read route permissions', () => {
  const routeCases = [
    ['partners', require('../src/routes/partners'), [
      ['/', 'customers.view'],
      ['/check-unique', 'customers.view'],
      ['/:id', 'customers.view'],
      ['/:id/GetKPIs', 'customers.view'],
    ]],
    ['appointments', require('../src/routes/appointments'), [
      ['/', 'appointments.view'],
      ['/:id', 'appointments.view'],
    ]],
    ['employees', require('../src/routes/employees'), [
      ['/', 'employees.view'],
      ['/:id', 'employees.view'],
    ]],
    ['products', require('../src/routes/products'), [
      ['/', 'services.view'],
      ['/:id', 'services.view'],
    ]],
    ['saleOrders', require('../src/routes/saleOrders'), [
      ['/', 'services.view'],
      ['/lines', 'services.view'],
      ['/:id', 'services.view'],
    ]],
    ['accountPayments', require('../src/routes/accountPayments'), [
      ['/', 'payment.view'],
      ['/:id', 'payment.view'],
    ]],
    ['payments', require('../src/routes/payments'), [
      ['/', 'payment.view'],
      ['/deposits', 'payment.view'],
      ['/deposit-usage', 'payment.view'],
      ['/:id', 'payment.view'],
    ]],
    ['customerReceipts', require('../src/routes/customerReceipts'), [
      ['/', 'customers.view'],
      ['/:id', 'customers.view'],
    ]],
    ['companies', require('../src/routes/companies'), [
      ['/', 'locations.view'],
    ]],
  ];

  it.each(routeCases)('%s GET routes declare expected view permissions', (_name, router, cases) => {
    for (const [path, permission] of cases) {
      expectRoutePermission(router, 'get', path, permission);
    }
  });
});

describe('face recognition route permissions', () => {
  const faceRouter = require('../src/routes/faceRecognition');

  it('POST /recognize requires customers.view', () => {
    expectRoutePermission(faceRouter, 'post', '/recognize', 'customers.view');
  });

  it('POST /register requires customers.edit', () => {
    expectRoutePermission(faceRouter, 'post', '/register', 'customers.edit');
  });

  it('GET /status/:partnerId requires customers.view', () => {
    expectRoutePermission(faceRouter, 'get', '/status/:partnerId', 'customers.view');
  });
});
