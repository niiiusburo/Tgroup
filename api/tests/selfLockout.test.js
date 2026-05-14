/**
 * Self-Lockout Guard Tests
 * Verifies admin cannot accidentally revoke their own permissions.edit
 */

jest.mock('../src/db', () => ({
  query: jest.fn(),
}));

jest.mock('../src/services/permissionService', () => ({
  resolveEffectivePermissions: jest.fn(),
}));

const { query } = require('../src/db');
const { resolveEffectivePermissions } = require('../src/services/permissionService');
const request = require('supertest');
const app = require('../src/server');

describe('PUT /api/Permissions/employees/:employeeId self-lockout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('blocks self-revoke of permissions.edit without confirmation', async () => {
    const adminId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const groupId = 'gggggggg-gggg-gggg-gggg-gggggggggggg';

    // Mock auth middleware to set req.user
    jest.spyOn(require('../src/middleware/auth'), 'requirePermission').mockImplementation(() => (req, res, next) => {
      req.user = { employeeId: adminId };
      next();
    });

    query.mockResolvedValueOnce([{ permission: 'permissions.edit' }]);

    const res = await request(app)
      .put(`/api/Permissions/employees/${adminId}`)
      .send({ groupId, overrides: { grant: [], revoke: ['permissions.edit'] } });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('SELF_LOCKOUT_RISK');
  });

  it('allows self-revoke with confirm=true', async () => {
    const adminId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const groupId = 'gggggggg-gggg-gggg-gggg-gggggggggggg';

    jest.spyOn(require('../src/middleware/auth'), 'requirePermission').mockImplementation(() => (req, res, next) => {
      req.user = { employeeId: adminId };
      next();
    });

    query
      .mockResolvedValueOnce([{ permission: 'permissions.edit' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ employeeId: adminId, employeeName: 'Admin', employeeEmail: 'a@t.com', groupId, groupName: 'A', groupColor: '#000', locScope: 'all' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const res = await request(app)
      .put(`/api/Permissions/employees/${adminId}?confirm=true`)
      .send({ groupId, overrides: { grant: [], revoke: ['permissions.edit'] } });

    expect(res.status).toBe(200);
  });
});
