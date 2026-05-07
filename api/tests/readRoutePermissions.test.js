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
  const perms = routePermissions(router, method, path);
  const required = Array.isArray(permission) ? permission : [permission];
  const matched = perms.some((p) => {
    const declared = Array.isArray(p) ? p : [p];
    return required.some((r) => declared.includes(r));
  });
  expect(matched).toBe(true);
}

function expectReadPermission(router, path, permission) {
  expectRoutePermission(router, 'get', path, permission);
}

describe('owned backend read route permissions', () => {
  const routeCases = [
    ['partners', require('../src/routes/partners'), [
      ['/', ['customers.view', 'customers.search']],
      ['/check-unique', ['customers.view', 'customers.search']],
      ['/:id', ['customers.view', 'customers.search']],
      ['/:id/GetKPIs', ['customers.view', 'customers.search']],
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
      expectReadPermission(router, path, permission);
    }
  });
});

describe('payment route granular permissions', () => {
  const payments = require('../src/routes/payments');

  it('POST / uses payment.edit or payment.add', () => {
    expectRoutePermission(payments, 'post', '/', ['payment.edit', 'payment.add']);
  });

  it('POST /refund uses payment.edit or payment.refund', () => {
    expectRoutePermission(payments, 'post', '/refund', ['payment.edit', 'payment.refund']);
  });

  it('PATCH /:id uses payment.edit or payment.update', () => {
    expectRoutePermission(payments, 'patch', '/:id', ['payment.edit', 'payment.update']);
  });

  it('DELETE /:id uses payment.edit or payment.void', () => {
    expectRoutePermission(payments, 'delete', '/:id', ['payment.edit', 'payment.void']);
  });

  it('POST /:id/void uses payment.edit or payment.void', () => {
    expectRoutePermission(payments, 'post', '/:id/void', ['payment.edit', 'payment.void']);
  });

  it('POST /:id/proof uses payment.edit or payment.add', () => {
    expectRoutePermission(payments, 'post', '/:id/proof', ['payment.edit', 'payment.add']);
  });
});

describe('products route granular permissions', () => {
  const products = require('../src/routes/products');

  it('POST / uses services.edit or services.add', () => {
    expectRoutePermission(products, 'post', '/', ['services.edit', 'services.add']);
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

  it('has exactly three face recognition endpoints', () => {
    const routes = faceRouter.stack
      .filter((layer) => layer.route)
      .map((layer) => ({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods),
      }));
    expect(routes).toHaveLength(3);
    expect(routes.map((r) => `${r.methods[0].toUpperCase()} ${r.path}`).sort()).toEqual([
      'GET /status/:partnerId',
      'POST /recognize',
      'POST /register',
    ]);
  });
});
