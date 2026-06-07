'use strict';

jest.mock('../../../services/permissionService', () => ({
  resolveEffectivePermissions: jest.fn(),
  isAdminPermissionState: jest.fn(),
}));

const {
  resolveEffectivePermissions,
  isAdminPermissionState,
} = require('../../../services/permissionService');
const {
  canViewFeedbackAdmin,
  canMutateFeedback,
  requireFeedbackPermission,
} = require('../admin');

describe('feedback admin permissions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    isAdminPermissionState.mockReturnValue(false);
  });

  it('allows super-admin state without explicit feedback perms', async () => {
    isAdminPermissionState.mockReturnValue(true);
    resolveEffectivePermissions.mockResolvedValue({
      effectivePermissions: [],
      groupId: '11111111-0000-0000-0000-000000000001',
      groupName: 'Super Admin',
    });

    await expect(canViewFeedbackAdmin('emp-1', 'dental')).resolves.toBe(true);
    await expect(canMutateFeedback('emp-1', 'dental', 'delete')).resolves.toBe(true);
  });

  it('allows feedback.view and legacy permissions.view for read access', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      effectivePermissions: ['feedback.view'],
      groupId: 'g1',
      groupName: 'Manager',
    });
    await expect(canViewFeedbackAdmin('emp-1', 'dental')).resolves.toBe(true);

    resolveEffectivePermissions.mockResolvedValue({
      effectivePermissions: ['permissions.view'],
      groupId: 'g1',
      groupName: 'Manager',
    });
    await expect(canViewFeedbackAdmin('emp-1', 'dental')).resolves.toBe(true);
  });

  it('denies read access when no view permissions are present', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      effectivePermissions: ['customers.view'],
      groupId: 'g1',
      groupName: 'Staff',
    });
    await expect(canViewFeedbackAdmin('emp-1', 'dental')).resolves.toBe(false);
  });

  it('allows scoped feedback mutations with legacy permissions.edit fallback', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      effectivePermissions: ['feedback.reply'],
      groupId: 'g1',
      groupName: 'Support',
    });
    await expect(canMutateFeedback('emp-1', 'dental', 'reply')).resolves.toBe(true);

    resolveEffectivePermissions.mockResolvedValue({
      effectivePermissions: ['permissions.edit'],
      groupId: 'g1',
      groupName: 'Support',
    });
    await expect(canMutateFeedback('emp-1', 'dental', 'delete')).resolves.toBe(true);
  });

  it('requireFeedbackPermission returns 403 when view is denied', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      effectivePermissions: [],
      groupId: null,
      groupName: null,
    });

    const req = { user: { employeeId: 'emp-1', authLob: 'dental' } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    requireFeedbackPermission('view')(req, res, next);
    await new Promise((resolve) => setImmediate(resolve));

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Permission denied: feedback.view' });
  });
});