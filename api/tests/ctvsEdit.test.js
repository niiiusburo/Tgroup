'use strict';

/**
 * Tests for PUT /api/Ctvs/:id — admin CTV profile edit (name/phone/email/password).
 * Mounts the ctvs router in isolation with mocked auth, permissions, and DB.
 * NOTE: variables referenced inside jest.mock factories must be `mock`-prefixed.
 */

let mockCurrentUser = { employeeId: 'admin-1' };
let mockIsAdmin = true;
const mockDentalRows = jest.fn();
const mockCosmeticRows = jest.fn();

jest.mock('../src/middleware/auth', () => ({
  requireAuth: (req, _res, next) => { req.user = mockCurrentUser; next(); },
  requirePermission: () => (_req, _res, next) => next(),
  requireLobScope: () => (_req, _res, next) => next(),
}));

jest.mock('../src/services/permissionService', () => ({
  resolveEffectivePermissions: jest.fn(async () => ({ effectivePermissions: mockIsAdmin ? ['*'] : ['something.else'] })),
  isAdminPermissionState: (s) => (s.effectivePermissions || []).includes('*'),
}));

jest.mock('../src/db', () => ({
  getDb: (lob) => (lob === 'cosmetic' ? { queryRows: mockCosmeticRows } : { queryRows: mockDentalRows }),
}));

const express = require('express');
const request = require('supertest');
const ctvsRouter = require('../src/routes/ctvs');

const app = express();
app.use(express.json());
app.use('/api/Ctvs', ctvsRouter);

beforeEach(() => {
  jest.clearAllMocks();
  mockCurrentUser = { employeeId: 'admin-1' };
  mockIsAdmin = true;
  mockCosmeticRows.mockResolvedValue([]); // cosmetic mirror: no row by default
});

describe('PUT /api/Ctvs/:id', () => {
  it('updates name, phone and email and returns the updated row', async () => {
    mockDentalRows.mockImplementation(async (sql) => {
      if (sql.includes('id = $1 AND is_ctv = true')) return [{ id: 'ctv-1' }];
      if (sql.includes('LOWER(phone)')) return []; // no dup
      if (sql.includes('LOWER(email)')) return []; // no dup
      if (sql.trim().startsWith('UPDATE dbo.partners SET')) {
        return [{ id: 'ctv-1', name: 'New Name', phone: '0900000001', email: 'new@x.vn', active: true }];
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const res = await request(app)
      .put('/api/Ctvs/ctv-1')
      .send({ name: 'New Name', phone: '0900000001', email: 'new@x.vn' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 'ctv-1', name: 'New Name', email: 'new@x.vn' });

    const update = mockDentalRows.mock.calls.find(([sql]) => sql.trim().startsWith('UPDATE dbo.partners SET'));
    expect(update[0]).toContain('name =');
    expect(update[0]).toContain('phone =');
    expect(update[0]).toContain('email =');
    expect(update[0]).not.toContain('password_hash'); // no password sent
  });

  it('hashes a provided password into password_hash', async () => {
    mockDentalRows.mockImplementation(async (sql) => {
      if (sql.includes('id = $1 AND is_ctv = true')) return [{ id: 'ctv-1' }];
      if (sql.includes('LOWER(email)')) return [];
      if (sql.trim().startsWith('UPDATE dbo.partners SET')) return [{ id: 'ctv-1', name: 'X' }];
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const res = await request(app)
      .put('/api/Ctvs/ctv-1')
      .send({ email: 'who@x.vn', password: 'secret123' });

    expect(res.status).toBe(200);
    const update = mockDentalRows.mock.calls.find(([sql]) => sql.trim().startsWith('UPDATE dbo.partners SET'));
    expect(update[0]).toContain('password_hash =');
    // The stored value must be a bcrypt hash, NOT the plaintext.
    const hashParam = update[1].find((p) => typeof p === 'string' && p.startsWith('$2'));
    expect(hashParam).toBeDefined();
    expect(hashParam).not.toBe('secret123');
  });

  it('rejects a duplicate phone belonging to another partner', async () => {
    mockDentalRows.mockImplementation(async (sql) => {
      if (sql.includes('id = $1 AND is_ctv = true')) return [{ id: 'ctv-1' }];
      if (sql.includes('LOWER(phone)')) return [{ id: 'other-ctv' }]; // dup!
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const res = await request(app)
      .put('/api/Ctvs/ctv-1')
      .send({ phone: '0900000009' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('U_DUPLICATE_PHONE');
  });

  it('allows saving when the phone is shared by a CUSTOMER row (not another CTV)', async () => {
    // Regression: a CTV's phone often also appears on their own customer rows (and migration 044
    // allows duplicate customer phones). The dup guard must scope to is_ctv = true, so editing the
    // CTV does not falsely trip "Phone number already exists" on a customer collision.
    mockDentalRows.mockImplementation(async (sql) => {
      if (sql.includes('id = $1 AND is_ctv = true')) return [{ id: 'ctv-1' }]; // the CTV exists
      // dup query is scoped to is_ctv = true → no other CTV shares the phone (customers excluded)
      if (sql.includes('LOWER(phone)')) {
        expect(sql).toContain('is_ctv = true'); // guard must be CTV-scoped
        return [];
      }
      if (sql.includes('LOWER(email)')) return [];
      if (sql.trim().startsWith('UPDATE dbo.partners SET')) return [{ id: 'ctv-1', name: 'Trần Trung Kiên', phone: '0972020908' }];
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const res = await request(app)
      .put('/api/Ctvs/ctv-1')
      .send({ name: 'Trần Trung Kiên', phone: '0972020908', password: 'newpass123' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 'ctv-1' });
  });

  it('rejects an invalid email format', async () => {
    const res = await request(app)
      .put('/api/Ctvs/ctv-1')
      .send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('U_INVALID_EMAIL');
  });

  it('rejects a too-short password', async () => {
    const res = await request(app)
      .put('/api/Ctvs/ctv-1')
      .send({ password: '123' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('U_WEAK_PASSWORD');
  });

  it('returns 400 when no editable fields are supplied', async () => {
    const res = await request(app).put('/api/Ctvs/ctv-1').send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION');
  });

  it('returns 404 when the CTV does not exist', async () => {
    mockDentalRows.mockImplementation(async (sql) => {
      if (sql.includes('id = $1 AND is_ctv = true')) return []; // not found
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const res = await request(app).put('/api/Ctvs/missing').send({ name: 'X' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('S_NOT_FOUND');
  });

  it('forbids non-admin callers', async () => {
    mockIsAdmin = false;
    const res = await request(app).put('/api/Ctvs/ctv-1').send({ name: 'X' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('S_FORBIDDEN');
  });

  it('mirrors the update into the cosmetic DB when the row exists there', async () => {
    mockDentalRows.mockImplementation(async (sql) => {
      if (sql.includes('id = $1 AND is_ctv = true')) return [{ id: 'ctv-1' }];
      if (sql.includes('LOWER(email)')) return [];
      if (sql.trim().startsWith('UPDATE dbo.partners SET')) return [{ id: 'ctv-1', name: 'X' }];
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    // Cosmetic dup-check must return no conflict; only the mirror UPDATE "exists".
    mockCosmeticRows.mockImplementation(async (sql) => {
      if (sql.trim().startsWith('UPDATE dbo.partners SET')) return [{ id: 'ctv-1' }];
      return []; // dup checks: no conflict
    });

    const res = await request(app).put('/api/Ctvs/ctv-1').send({ email: 'm@x.vn' });
    expect(res.status).toBe(200);
    const mirror = mockCosmeticRows.mock.calls.find(([sql]) => sql.trim().startsWith('UPDATE dbo.partners SET'));
    expect(mirror).toBeDefined();
  });

  // --- Regression: empty email must be rejected (SEC-1: blanking the only login
  // identifier of a non-legacy CTV would lock them out permanently). ---
  it('rejects an empty email (lockout guard) and never persists a blank email', async () => {
    mockDentalRows.mockImplementation(async (sql) => {
      if (sql.includes('id = $1 AND is_ctv = true')) return [{ id: 'ctv-1' }];
      if (sql.trim().startsWith('UPDATE dbo.partners SET')) {
        throw new Error('UPDATE must not run for an empty email');
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const res = await request(app).put('/api/Ctvs/ctv-1').send({ email: '' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('U_INVALID_EMAIL');
    const update = mockDentalRows.mock.calls.find(([sql]) => sql.trim().startsWith('UPDATE dbo.partners SET'));
    expect(update).toBeUndefined();
  });

  it('rejects a name that is only whitespace', async () => {
    const res = await request(app).put('/api/Ctvs/ctv-1').send({ name: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('U_INVALID_NAME');
  });

  it('rejects a phone that is only whitespace', async () => {
    const res = await request(app).put('/api/Ctvs/ctv-1').send({ phone: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('U_INVALID_PHONE');
  });

  it('rejects a duplicate email belonging to another partner', async () => {
    mockDentalRows.mockImplementation(async (sql) => {
      if (sql.includes('id = $1 AND is_ctv = true')) return [{ id: 'ctv-1' }];
      if (sql.includes('LOWER(email)')) return [{ id: 'other-ctv' }]; // dup!
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const res = await request(app).put('/api/Ctvs/ctv-1').send({ email: 'taken@x.vn' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('U_DUPLICATE_EMAIL');
  });

  it('updates ONLY the name when no other field is provided', async () => {
    mockDentalRows.mockImplementation(async (sql) => {
      if (sql.includes('id = $1 AND is_ctv = true')) return [{ id: 'ctv-1' }];
      if (sql.trim().startsWith('UPDATE dbo.partners SET')) return [{ id: 'ctv-1', name: 'Only Name' }];
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const res = await request(app).put('/api/Ctvs/ctv-1').send({ name: 'Only Name' });
    expect(res.status).toBe(200);
    const update = mockDentalRows.mock.calls.find(([sql]) => sql.trim().startsWith('UPDATE dbo.partners SET'));
    expect(update[0]).toContain('name =');
    expect(update[0]).not.toContain('phone =');
    expect(update[0]).not.toContain('email =');
    expect(update[0]).not.toContain('password_hash');
  });

  it('updates ONLY the password when no other field is provided', async () => {
    mockDentalRows.mockImplementation(async (sql) => {
      if (sql.includes('id = $1 AND is_ctv = true')) return [{ id: 'ctv-1' }];
      if (sql.trim().startsWith('UPDATE dbo.partners SET')) return [{ id: 'ctv-1', name: 'X' }];
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const res = await request(app).put('/api/Ctvs/ctv-1').send({ password: 'newpass123' });
    expect(res.status).toBe(200);
    const update = mockDentalRows.mock.calls.find(([sql]) => sql.trim().startsWith('UPDATE dbo.partners SET'));
    expect(update[0]).toContain('password_hash =');
    expect(update[0]).not.toContain('name =');
    expect(update[0]).not.toContain('phone =');
    expect(update[0]).not.toContain('email =');
  });

  it('treats an empty-string password as "no change" (kept) while still applying other fields', async () => {
    mockDentalRows.mockImplementation(async (sql) => {
      if (sql.includes('id = $1 AND is_ctv = true')) return [{ id: 'ctv-1' }];
      if (sql.includes('LOWER(email)')) return [];
      if (sql.trim().startsWith('UPDATE dbo.partners SET')) return [{ id: 'ctv-1', name: 'X' }];
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const res = await request(app).put('/api/Ctvs/ctv-1').send({ email: 'keep@x.vn', password: '' });
    expect(res.status).toBe(200);
    const update = mockDentalRows.mock.calls.find(([sql]) => sql.trim().startsWith('UPDATE dbo.partners SET'));
    expect(update[0]).toContain('email =');
    expect(update[0]).not.toContain('password_hash'); // empty password ignored
  });

  it('resets a legacy CTV password without touching created_via (legacy login stays intact)', async () => {
    mockDentalRows.mockImplementation(async (sql) => {
      if (sql.includes('id = $1 AND is_ctv = true')) return [{ id: 'ctv-1' }];
      if (sql.trim().startsWith('UPDATE dbo.partners SET')) {
        return [{ id: 'ctv-1', name: 'Legacy', created_via: 'legacy_ctv_import_2026' }];
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const res = await request(app).put('/api/Ctvs/ctv-1').send({ password: 'brandnew1' });
    expect(res.status).toBe(200);
    const update = mockDentalRows.mock.calls.find(([sql]) => sql.trim().startsWith('UPDATE dbo.partners SET'));
    expect(update[0]).toContain('password_hash =');
    // created_via must NEVER be ASSIGNED (it appears only in RETURNING), so legacy
    // phone/ref login keeps working after a password reset.
    expect(update[0]).not.toContain('created_via =');
  });

  it('still returns 200 when the cosmetic mirror UPDATE throws (best-effort mirror)', async () => {
    mockDentalRows.mockImplementation(async (sql) => {
      if (sql.includes('id = $1 AND is_ctv = true')) return [{ id: 'ctv-1' }];
      if (sql.includes('LOWER(email)')) return [];
      if (sql.trim().startsWith('UPDATE dbo.partners SET')) return [{ id: 'ctv-1', name: 'X' }];
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    mockCosmeticRows.mockImplementation(async (sql) => {
      if (sql.trim().startsWith('UPDATE dbo.partners SET')) throw new Error('cosmetic row absent');
      return [];
    });
    const res = await request(app).put('/api/Ctvs/ctv-1').send({ email: 'm@x.vn' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 'ctv-1' });
  });
});
