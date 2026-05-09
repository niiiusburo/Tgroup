const mockRequirePermission = jest.fn((permission) => {
  const middleware = (_req, _res, next) => next();
  middleware.permission = permission;
  return middleware;
});

const mockRequireAnyPermission = jest.fn((permissions) => {
  const middleware = (_req, _res, next) => next();
  middleware.permissionAny = permissions;
  return middleware;
});

jest.mock('../src/middleware/auth', () => ({
  requireAuth: (_req, _res, next) => next(),
  requirePermission: mockRequirePermission,
  requireAnyPermission: mockRequireAnyPermission,
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
  const declared = [];
  for (const entry of layer.route.stack) {
    if (entry?.handle?.permission) declared.push(entry.handle.permission);
    if (Array.isArray(entry?.handle?.permissionAny)) declared.push(...entry.handle.permissionAny);
  }
  return declared.filter(Boolean);
}

function expectRoutePermission(router, method, path, permission) {
  expect(routePermissions(router, method, path)).toContain(permission);
}

describe('owned backend read route permissions', () => {
  const routeCases = [
    ['partners', require('../src/routes/partners'), [
      ['/', 'customers.view'],
      ['/', 'appointments.add'],
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

describe('payments mutation route permissions', () => {
  const paymentRouter = require('../src/routes/payments');

  it('POST / uses payment.add instead of broad edit access', () => {
    expectRoutePermission(paymentRouter, 'post', '/', 'payment.add');
  });

  it('POST /refund requires payment.refund', () => {
    expectRoutePermission(paymentRouter, 'post', '/refund', 'payment.refund');
  });

  it('PATCH /:id uses payment.add (record/manage payments)', () => {
    expectRoutePermission(paymentRouter, 'patch', '/:id', 'payment.add');
  });

  it('POST /:id/proof uses payment.add (proof upload is part of payment workflow)', () => {
    expectRoutePermission(paymentRouter, 'post', '/:id/proof', 'payment.add');
  });

  it('POST /:id/proof/confirm requires payment.confirm', () => {
    expectRoutePermission(paymentRouter, 'post', '/:id/proof/confirm', 'payment.confirm');
  });

  it('DELETE /:id requires payment.void for destructive reversal', () => {
    expectRoutePermission(paymentRouter, 'delete', '/:id', 'payment.void');
  });

  it('POST /:id/void requires payment.void', () => {
    expectRoutePermission(paymentRouter, 'post', '/:id/void', 'payment.void');
  });
});

describe('external checkups route permissions', () => {
  const externalCheckupsRouter = require('../src/routes/externalCheckups');

  it('GET routes require external_checkups.view', () => {
    expectRoutePermission(externalCheckupsRouter, 'get', '/images/:imageName', 'external_checkups.view');
    expectRoutePermission(externalCheckupsRouter, 'get', '/:customerCode', 'external_checkups.view');
  });

  it('patient creation and image upload use separate permissions', () => {
    expectRoutePermission(externalCheckupsRouter, 'post', '/:customerCode/patient', 'external_checkups.create');
    expectRoutePermission(externalCheckupsRouter, 'post', '/:customerCode/health-checkups', 'external_checkups.upload');
  });
});
