process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

/**
 * PUT /api/Permissions/employees/:employeeId performs six writes, two of which are
 * DELETE-then-INSERT "replacements". Before this was wrapped in a transaction, a failure
 * partway through could commit the DELETE and lose the INSERT, leaving an employee with
 * no location scope at all — the same state that produces a blank calendar and overview.
 *
 * These tests drive the real withTransaction against a fake pg client so the assertions
 * are about actual BEGIN/COMMIT/ROLLBACK ordering, not a re-implementation of it.
 */

jest.mock('../src/middleware/auth', () => ({
  requireAuth: (_req, _res, next) => next(),
  requirePermission: jest.fn(() => (_req, _res, next) => next()),
}));

jest.mock('../src/db', () => {
  const actual = jest.requireActual('../src/db');
  // withTransaction closes over the module-scoped pool, so the stub has to be installed
  // on that object rather than on a replacement exported here.
  actual.pool.connect = jest.fn();
  return {
    pool: actual.pool,
    query: jest.fn(),
    withTransaction: actual.withTransaction,
  };
});

// uuid ships ESM only, which jest cannot load from node_modules without a transform.
jest.mock('uuid', () => ({ v4: jest.fn(() => 'mock-uuid') }));

const request = require('supertest');
const app = require('../src/server');
const { query, pool } = require('../src/db');

const EMPLOYEE_ID = '11111111-1111-4111-8111-111111111111';
const GROUP_ID = '22222222-2222-4222-8222-222222222222';
const LOCATION_A = '33333333-3333-4333-8333-333333333333';
const LOCATION_B = '44444444-4444-4444-8444-444444444444';

function mockIpAccess() {
  query.mockImplementation(async (sql) => {
    if (sql.includes('ip_access_settings')) return [{ mode: 'disabled' }];
    if (sql.includes('ip_access_entries')) return [];
    throw new Error(`Unexpected global query: ${sql}`);
  });
}

function makeClient(implementation) {
  const client = {
    query: jest.fn(implementation),
    release: jest.fn(),
  };
  pool.connect.mockResolvedValue(client);
  return client;
}

const EMPLOYEE_ROW = {
  employeeId: EMPLOYEE_ID,
  employeeName: 'Nguyen Thi B',
  employeeEmail: 'b@clinic.vn',
  groupId: GROUP_ID,
  groupName: 'Editor',
  groupColor: '#0EA5E9',
  locScope: 'assigned',
};

// Resolves every statement the handler issues on the happy path.
function happyPath(overrides = {}) {
  return async (sql) => {
    if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [] };
    if (sql.includes('UPDATE partners SET tier_id')) return { rows: [] };
    if (sql.includes('INSERT INTO employee_permissions')) return { rows: [] };
    if (sql.includes('DELETE FROM employee_location_scope')) return { rows: [] };
    if (sql.includes('INSERT INTO employee_location_scope')) {
      if (overrides.locationInsertThrows) throw new Error('insert failed');
      return { rows: [] };
    }
    if (sql.includes('DELETE FROM permission_overrides')) return { rows: [] };
    if (sql.includes('INSERT INTO permission_overrides')) return { rows: [] };
    if (sql.includes('FROM employee_permissions ep')) {
      return { rows: overrides.employeeRows ?? [EMPLOYEE_ROW] };
    }
    if (sql.includes('location_candidates')) {
      return { rows: [{ location_id: LOCATION_A, location_name: 'Chi nhánh 1' }] };
    }
    if (sql.includes('FROM permission_overrides WHERE employee_id')) {
      return { rows: [{ permission: 'payment.edit', override_type: 'grant' }] };
    }
    throw new Error(`Unexpected transaction query: ${sql}`);
  };
}

function putBody() {
  return {
    groupId: GROUP_ID,
    locScope: 'assigned',
    locationIds: [LOCATION_A, LOCATION_B],
    overrides: { grant: ['payment.edit'], revoke: ['customers.delete'] },
  };
}

function statements(client) {
  return client.query.mock.calls.map(([sql]) => sql);
}

describe('PUT /api/Permissions/employees/:employeeId transaction integrity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIpAccess();
  });

  it('runs every write on one client and commits once', async () => {
    const client = makeClient(happyPath());

    const res = await request(app)
      .put(`/api/Permissions/employees/${EMPLOYEE_ID}`)
      .send(putBody());

    expect(res.status).toBe(200);

    const sqls = statements(client);
    expect(sqls[0]).toBe('BEGIN');
    expect(sqls[sqls.length - 1]).toBe('COMMIT');
    expect(sqls).not.toContain('ROLLBACK');

    // All six writes, on the transaction client rather than the pool.
    expect(sqls.filter(s => s.includes('UPDATE partners SET tier_id'))).toHaveLength(1);
    expect(sqls.filter(s => s.includes('INSERT INTO employee_permissions'))).toHaveLength(1);
    expect(sqls.filter(s => s.includes('DELETE FROM employee_location_scope'))).toHaveLength(1);
    expect(sqls.filter(s => s.includes('INSERT INTO employee_location_scope'))).toHaveLength(1);
    expect(sqls.filter(s => s.includes('DELETE FROM permission_overrides'))).toHaveLength(1);
    expect(sqls.filter(s => s.includes('INSERT INTO permission_overrides'))).toHaveLength(1);
    expect(client.release).toHaveBeenCalled();
  });

  it('reads the response data back inside the same transaction', async () => {
    const client = makeClient(happyPath());

    const res = await request(app)
      .put(`/api/Permissions/employees/${EMPLOYEE_ID}`)
      .send(putBody());

    expect(res.status).toBe(200);
    expect(res.body.locations).toEqual([{ id: LOCATION_A, name: 'Chi nhánh 1' }]);
    expect(res.body.overrides).toEqual({ grant: ['payment.edit'], revoke: [] });

    // The read-backs must appear before COMMIT, otherwise another writer could change
    // the rows between the write and the response.
    const sqls = statements(client);
    const commitAt = sqls.indexOf('COMMIT');
    const readAt = sqls.findIndex(s => s.includes('location_candidates'));
    expect(readAt).toBeGreaterThan(-1);
    expect(readAt).toBeLessThan(commitAt);
  });

  it('rolls back and returns 404 when the employee/group does not resolve', async () => {
    // The old code committed the tier_id update and THEN returned 404, leaving the
    // employee pointing at a group that does not exist.
    const client = makeClient(happyPath({ employeeRows: [] }));

    const res = await request(app)
      .put(`/api/Permissions/employees/${EMPLOYEE_ID}`)
      .send(putBody());

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Employee permission not found');

    const sqls = statements(client);
    expect(sqls).toContain('ROLLBACK');
    expect(sqls).not.toContain('COMMIT');
    expect(client.release).toHaveBeenCalled();
  });

  it('rolls back the location DELETE when the following INSERT fails', async () => {
    // This is the case that could strip an employee of every location.
    const client = makeClient(happyPath({ locationInsertThrows: true }));

    const res = await request(app)
      .put(`/api/Permissions/employees/${EMPLOYEE_ID}`)
      .send(putBody());

    expect(res.status).toBe(500);

    const sqls = statements(client);
    expect(sqls).toContain('DELETE FROM employee_location_scope WHERE employee_id = $1');
    expect(sqls).toContain('ROLLBACK');
    expect(sqls).not.toContain('COMMIT');
  });

  it('still rejects a missing groupId before opening a transaction', async () => {
    const client = makeClient(happyPath());

    const res = await request(app)
      .put(`/api/Permissions/employees/${EMPLOYEE_ID}`)
      .send({ locationIds: [LOCATION_A] });

    expect(res.status).toBe(400);
    expect(pool.connect).not.toHaveBeenCalled();
    expect(client.query).not.toHaveBeenCalled();
  });
});
