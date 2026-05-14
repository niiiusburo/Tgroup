/**
 * TDD: DELETE /api/Permissions/groups/:id
 * Permission group deletion endpoint
 */

const mockRequirePermission = jest.fn((permission) => {
  const middleware = (req, _res, next) => {
    req.user = { employeeId: 'admin-uuid', permissions: { effectivePermissions: ['*'] } };
    next();
  };
  middleware.permission = permission;
  return middleware;
});

jest.mock('../src/middleware/auth', () => ({
  requireAuth: (_req, _res, next) => next(),
  requirePermission: mockRequirePermission,
}));

const mockQuery = jest.fn();
jest.mock('../src/db', () => ({
  query: mockQuery,
  pool: { connect: jest.fn() },
}));

const request = require('supertest');
const express = require('express');

// Build minimal app with just the permissions router
const app = express();
app.use(express.json());

const permissionsRouter = require('../src/routes/permissions');
app.use('/api/Permissions', permissionsRouter);

describe('DELETE /api/Permissions/groups/:id', () => {
  beforeEach(() => {
    mockQuery.mockClear();
    mockRequirePermission.mockClear();
  });

  test('should delete a non-system permission group and unassign members', async () => {
    const groupId = 'test-group-uuid';

    // Mock: group exists, not system
    mockQuery
      .mockResolvedValueOnce([{ id: groupId, is_system: false }])  // SELECT check
      .mockResolvedValueOnce([])  // UPDATE partners (unassign members)
      .mockResolvedValueOnce([])  // DELETE group_permissions
      .mockResolvedValueOnce([]); // DELETE permission_groups

    const res = await request(app)
      .delete(`/api/Permissions/groups/${groupId}`)
      .set('Authorization', 'Bearer fake-token');

    expect(res.status).toBe(204);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE partners'),
      expect.anything()
    );
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM group_permissions'),
      [groupId]
    );
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM permission_groups'),
      [groupId]
    );
  });

  test('should reject deleting a system group', async () => {
    const groupId = 'system-group-uuid';

    mockQuery.mockResolvedValueOnce([{ id: groupId, is_system: true }]);

    const res = await request(app)
      .delete(`/api/Permissions/groups/${groupId}`)
      .set('Authorization', 'Bearer fake-token');

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/system/i);
  });

  test('should return 404 for non-existent group', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';

    mockQuery.mockResolvedValueOnce([]);

    const res = await request(app)
      .delete(`/api/Permissions/groups/${fakeId}`)
      .set('Authorization', 'Bearer fake-token');

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  test('should return 404 for missing group even with auth', async () => {
    // With mocked auth, request reaches the handler
    const res = await request(app)
      .delete('/api/Permissions/groups/00000000-0000-0000-0000-000000000000')
      .set('Authorization', 'Bearer fake-token');

    expect(res.status).toBe(404);
  });
});
