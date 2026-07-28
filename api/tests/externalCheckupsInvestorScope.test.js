'use strict';

/**
 * ExternalCheckups investor IDOR scoping — behavioral proof (AUD-005 / INV-021).
 *
 * Customer-derived ExternalCheckups routes (list by customer code, image by name,
 * patient create, health-checkup upload) must call resolveInvestorScope and
 * fail closed so investors cannot read or mutate checkups for non-allowlisted
 * customers. Staff are unaffected.
 */

jest.mock('../src/middleware/auth', () => ({
  requireAuth: (_req, _res, next) => next(),
  requirePermission: () => (_req, _res, next) => next(),
}));

const mockResolveInvestorScope = jest.fn();
jest.mock('../src/services/permissionService', () => ({
  resolveInvestorScope: (...args) => mockResolveInvestorScope(...args),
  resolveEffectivePermissions: jest.fn().mockResolvedValue({ effectivePermissions: ['*'] }),
  hasPermission: jest.fn().mockResolvedValue(true),
}));

jest.mock('../src/db', () => ({
  query: jest.fn(),
  pool: { connect: jest.fn(), query: jest.fn(), end: jest.fn() },
}));

const request = require('supertest');
const express = require('express');
const { query } = require('../src/db');

const ALLOWED = '11111111-1111-1111-8111-111111111111';
const FORBIDDEN = '22222222-2222-2222-8222-222222222222';
const ALLOWED_REF = 'T8250';
const FORBIDDEN_REF = 'T9999';

const originalFetch = global.fetch;
const originalEnv = process.env;

function makeApp() {
  // nosemgrep: javascript.express.security.audit.express-check-csurf-middleware-usage.express-check-csurf-middleware-usage -- isolated Jest route harness, not a production Express app.
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { id: 'user-1', employeeId: 'investor-1' };
    next();
  });
  app.use('/api/ExternalCheckups', require('../src/routes/externalCheckups'));
  return app;
}

function asInvestor(allowed = [ALLOWED]) {
  mockResolveInvestorScope.mockResolvedValue({ isInvestor: true, allowedCustomerIds: allowed });
}

function asStaff() {
  mockResolveInvestorScope.mockResolvedValue({ isInvestor: false, allowedCustomerIds: [] });
}

function partnerRow(id, ref, name = 'Patient') {
  return { id, ref, name, phone: '0901234567' };
}

beforeEach(() => {
  query.mockReset();
  mockResolveInvestorScope.mockReset();
  process.env = {
    ...originalEnv,
    HOSOONLINE_API_KEY: 'test-key',
    HOSOONLINE_USERNAME: '',
    HOSOONLINE_PASSWORD: '',
  };
  global.fetch = jest.fn().mockResolvedValue(
    new Response(JSON.stringify({ checkups: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  );
});

afterEach(() => {
  process.env = originalEnv;
  global.fetch = originalFetch;
});

describe('GET /api/ExternalCheckups/:customerCode investor scope', () => {
  it('404s when investor requests a non-allowlisted customer (no PII leak)', async () => {
    asInvestor([ALLOWED]);
    query.mockResolvedValueOnce([partnerRow(FORBIDDEN, FORBIDDEN_REF, 'Secret Patient')]);

    const res = await request(makeApp())
      .get(`/api/ExternalCheckups/${FORBIDDEN_REF}`);

    expect(mockResolveInvestorScope).toHaveBeenCalledWith('investor-1');
    expect(res.status).toBe(404);
    expect(JSON.stringify(res.body)).not.toMatch(/Secret Patient/);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('404s fail-closed when investor allowlist is empty', async () => {
    asInvestor([]);
    query.mockResolvedValueOnce([partnerRow(ALLOWED, ALLOWED_REF)]);

    const res = await request(makeApp()).get(`/api/ExternalCheckups/${ALLOWED_REF}`);
    expect(res.status).toBe(404);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('404s when investor customer code does not resolve to a local partner', async () => {
    asInvestor([ALLOWED]);
    query.mockResolvedValueOnce([]).mockResolvedValueOnce([]); // ref + phone miss

    const res = await request(makeApp()).get('/api/ExternalCheckups/UNKNOWN');
    expect(res.status).toBe(404);
  });

  it('allows investor for an allowlisted customer', async () => {
    asInvestor([ALLOWED]);
    // Scope check + resolveHosoPatientCode local lookups (best-effort).
    query.mockResolvedValue([partnerRow(ALLOWED, ALLOWED_REF)]);
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ patientCode: ALLOWED_REF, checkups: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const res = await request(makeApp()).get(`/api/ExternalCheckups/${ALLOWED_REF}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(expect.objectContaining({
      source: expect.any(String),
      checkups: expect.any(Array),
    }));
  });

  it('staff can read any customer (no investor filter)', async () => {
    asStaff();
    query.mockResolvedValue([partnerRow(FORBIDDEN, FORBIDDEN_REF, 'Any Patient')]);
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ patientCode: FORBIDDEN_REF, checkups: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const res = await request(makeApp()).get(`/api/ExternalCheckups/${FORBIDDEN_REF}`);
    expect(res.status).toBe(200);
    expect(res.body.patientName).toBe('Any Patient');
  });
});

describe('GET /api/ExternalCheckups/images/:imageName investor scope', () => {
  it('404s investor image by name when customerCode query is outside allowlist', async () => {
    asInvestor([ALLOWED]);
    query.mockResolvedValueOnce([partnerRow(FORBIDDEN, FORBIDDEN_REF)]);

    const res = await request(makeApp()).get(
      `/api/ExternalCheckups/images/2026-04-20_T9999_IMG.jpeg?customerCode=${FORBIDDEN_REF}`
    );

    expect(res.status).toBe(404);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('404s investor image by name when embedded code is outside allowlist', async () => {
    asInvestor([ALLOWED]);
    // getLocalPartner for extracted T9999
    query.mockResolvedValueOnce([partnerRow(FORBIDDEN, FORBIDDEN_REF)]);

    const res = await request(makeApp()).get(
      '/api/ExternalCheckups/images/2026-04-18-15-17-06_6397T9999_IMG_6734.jpeg'
    );

    expect(res.status).toBe(404);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('404s when an allowlisted customerCode is paired with a forbidden embedded image code', async () => {
    asInvestor([ALLOWED]);
    query
      .mockResolvedValueOnce([partnerRow(ALLOWED, ALLOWED_REF)])
      .mockResolvedValueOnce([partnerRow(FORBIDDEN, FORBIDDEN_REF)]);

    const res = await request(makeApp()).get(
      `/api/ExternalCheckups/images/2026-04-20_T9999_IMG.jpeg?customerCode=${ALLOWED_REF}`
    );

    expect(res.status).toBe(404);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('allows investor image when customerCode query is allowlisted', async () => {
    asInvestor([ALLOWED]);
    query.mockResolvedValueOnce([partnerRow(ALLOWED, ALLOWED_REF)]);
    global.fetch = jest.fn().mockResolvedValue(
      new Response(Buffer.from([0xff, 0xd8, 0xff]), {
        status: 200,
        headers: { 'Content-Type': 'image/jpeg' },
      })
    );

    const res = await request(makeApp()).get(
      `/api/ExternalCheckups/images/2026-04-20_T8250_IMG.jpeg?customerCode=${ALLOWED_REF}`
    );

    expect(res.status).toBe(200);
    expect(global.fetch).toHaveBeenCalled();
  });

  it('staff can proxy any image name without customer scope', async () => {
    asStaff();
    global.fetch = jest.fn().mockResolvedValue(
      new Response(Buffer.from([0xff, 0xd8, 0xff]), {
        status: 200,
        headers: { 'Content-Type': 'image/jpeg' },
      })
    );

    const res = await request(makeApp()).get(
      '/api/ExternalCheckups/images/2026-04-20_T9999_IMG.jpeg'
    );

    expect(res.status).toBe(200);
    expect(query).not.toHaveBeenCalled();
  });
});

describe('POST ExternalCheckups mutations investor scope (fail-closed before side effects)', () => {
  it('POST /:customerCode/patient 404s outside allowlist and does not call Hosoonline', async () => {
    asInvestor([ALLOWED]);
    query.mockResolvedValueOnce([partnerRow(FORBIDDEN, FORBIDDEN_REF)]);

    const res = await request(makeApp()).post(`/api/ExternalCheckups/${FORBIDDEN_REF}/patient`);
    expect(res.status).toBe(404);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('POST /:customerCode/health-checkups 404s outside allowlist and does not upload', async () => {
    asInvestor([ALLOWED]);
    query.mockResolvedValueOnce([partnerRow(FORBIDDEN, FORBIDDEN_REF)]);

    const res = await request(makeApp())
      .post(`/api/ExternalCheckups/${FORBIDDEN_REF}/health-checkups`)
      .field('service', 'X-ray')
      .field('doctor', 'Dr A')
      .field('date', '2026-04-20');

    expect(res.status).toBe(404);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
