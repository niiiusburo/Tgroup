/**
 * AUD-011: Employee create/update must never return password_hash (or plaintext password).
 * Password write path must still hash and persist.
 */
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

jest.mock('../src/middleware/auth', () => ({
  requireAuth: (req, _res, next) => {
    req.user = { employeeId: 'admin-1' };
    next();
  },
  requirePermission: jest.fn(() => (_req, _res, next) => next()),
}));

jest.mock('../src/db', () => ({
  query: jest.fn(),
  pool: {
    connect: jest.fn(),
  },
}));

const request = require('supertest');
const bcrypt = require('bcryptjs');
const express = require('express');
const { query, pool } = require('../src/db');
const employeesRouter = require('../src/routes/employees');

const PLAINTEXT_PASSWORD = 'Test-Only-Passw0rd!';
const EMPLOYEE_ID = '11111111-1111-4111-8111-111111111111';

function buildPartnerRow(overrides = {}) {
  return {
    id: EMPLOYEE_ID,
    name: 'Nguyen Van A',
    ref: null,
    phone: '0901234567',
    email: 'a@example.com',
    street: null,
    avatar: null,
    isdoctor: false,
    isassistant: false,
    isreceptionist: false,
    active: true,
    companyid: 'comp-1',
    hrjobid: null,
    wage: null,
    allowance: null,
    startworkdate: null,
    jobtitle: 'Le tan',
    tier_id: null,
    datecreated: '2026-07-23T00:00:00',
    lastupdated: '2026-07-23T00:00:00',
    employee: true,
    customer: false,
    supplier: false,
    password_hash: '$2a$10$abcdefghijklmnopqrstuuDUMMYHASHVALUE000000000000000',
    ...overrides,
  };
}

function makeClient({ partnerRow } = {}) {
  const row = partnerRow || buildPartnerRow();
  const client = {
    query: jest.fn(async (sql, params = []) => {
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
        return { rows: [] };
      }
      if (sql.includes('INSERT INTO partners')) {
        expect(sql).toContain('password_hash');
        const hashParam = params.find(
          (p) => typeof p === 'string' && (p.startsWith('$2a$') || p.startsWith('$2b$'))
        );
        return {
          rows: [
            buildPartnerRow({
              ...row,
              name: params[1] ?? row.name,
              phone: params[2] ?? row.phone,
              email: params[3] ?? row.email,
              password_hash: hashParam || row.password_hash,
            }),
          ],
        };
      }
      if (sql.includes('UPDATE partners SET') && sql.includes('RETURNING')) {
        const hashParam = params.find(
          (p) => typeof p === 'string' && (p.startsWith('$2a$') || p.startsWith('$2b$'))
        );
        return {
          rows: [
            buildPartnerRow({
              ...row,
              password_hash: hashParam || row.password_hash,
              lastupdated: '2026-07-23T12:00:00',
            }),
          ],
        };
      }
      if (sql.includes('SELECT * FROM partners')) {
        return { rows: [row] };
      }
      if (sql.includes('INSERT INTO employee_location_scope')) {
        return { rows: [] };
      }
      if (sql.includes('DELETE FROM employee_location_scope')) {
        return { rows: [] };
      }
      if (sql.includes('INSERT INTO employee_permissions')) {
        return { rows: [] };
      }
      throw new Error(`Unexpected client query: ${sql}`);
    }),
    release: jest.fn(),
  };
  pool.connect.mockResolvedValue(client);
  return client;
}

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/Employees', employeesRouter);
  return app;
}

describe('AUD-011 employee mutation password_hash leak', () => {
  let consoleError;
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    query.mockImplementation(async (sql) => {
      if (sql.includes('employee_location_scope')) return [];
      return [];
    });
    app = createApp();
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('POST /api/Employees never returns password_hash even when password is set', async () => {
    const client = makeClient();

    const res = await request(app)
      .post('/api/Employees')
      .send({
        name: 'Nguyen Van A',
        phone: '0901234567',
        email: 'a@example.com',
        password: PLAINTEXT_PASSWORD,
        jobtitle: 'Le tan',
      });

    expect(res.status).toBe(201);
    expect(res.body).toBeTruthy();
    expect(Object.keys(res.body)).not.toContain('password_hash');
    expect(Object.keys(res.body)).not.toContain('password');
    expect(JSON.stringify(res.body)).not.toContain('password_hash');
    expect(JSON.stringify(res.body)).not.toContain(PLAINTEXT_PASSWORD);

    // Negative path: hash write still happened (bcrypt hash bound, not plaintext)
    const insertCall = client.query.mock.calls.find(([sql]) =>
      sql.includes('INSERT INTO partners')
    );
    expect(insertCall).toBeTruthy();
    const insertParams = insertCall[1];
    const boundHash = insertParams.find(
      (p) => typeof p === 'string' && (p.startsWith('$2a$') || p.startsWith('$2b$'))
    );
    expect(boundHash).toBeTruthy();
    expect(boundHash).not.toBe(PLAINTEXT_PASSWORD);
    expect(await bcrypt.compare(PLAINTEXT_PASSWORD, boundHash)).toBe(true);

    // Must not log the real password
    const logged = consoleError.mock.calls.map((c) => JSON.stringify(c)).join('\n');
    expect(logged).not.toContain(PLAINTEXT_PASSWORD);
  });

  it('PUT /api/Employees/:id never returns password_hash even when password is rotated', async () => {
    const client = makeClient();

    const res = await request(app)
      .put(`/api/Employees/${EMPLOYEE_ID}`)
      .send({
        name: 'Nguyen Van A',
        password: PLAINTEXT_PASSWORD,
      });

    expect(res.status).toBe(200);
    expect(res.body).toBeTruthy();
    expect(Object.keys(res.body)).not.toContain('password_hash');
    expect(Object.keys(res.body)).not.toContain('password');
    expect(JSON.stringify(res.body)).not.toContain('password_hash');
    expect(JSON.stringify(res.body)).not.toContain(PLAINTEXT_PASSWORD);

    const updateCall = client.query.mock.calls.find(
      ([sql]) => sql.includes('UPDATE partners SET') && sql.includes('password_hash')
    );
    expect(updateCall).toBeTruthy();
    const updateParams = updateCall[1];
    const boundHash = updateParams.find(
      (p) => typeof p === 'string' && (p.startsWith('$2a$') || p.startsWith('$2b$'))
    );
    expect(boundHash).toBeTruthy();
    expect(boundHash).not.toBe(PLAINTEXT_PASSWORD);
    expect(await bcrypt.compare(PLAINTEXT_PASSWORD, boundHash)).toBe(true);

    const logged = consoleError.mock.calls.map((c) => JSON.stringify(c)).join('\n');
    expect(logged).not.toContain(PLAINTEXT_PASSWORD);
  });
});
