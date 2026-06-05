'use strict';

const bcrypt = require('bcryptjs');

jest.mock('../../db', () => ({
  getDb: jest.fn(),
}));

const { getDb } = require('../../db');
const {
  updateCtvSelfProfile,
  changeCtvSelfPassword,
} = require('../ctvSelfProfile');

describe('ctvSelfProfile service', () => {
  let dentalDb;
  let cosmeticDb;

  beforeEach(() => {
    jest.clearAllMocks();
    dentalDb = { queryRows: jest.fn() };
    cosmeticDb = { queryRows: jest.fn() };
    getDb.mockImplementation((lob) => (lob === 'cosmetic' ? cosmeticDb : dentalDb));
  });

  test('updates the authenticated CTV name in dental and cosmetic rows', async () => {
    dentalDb.queryRows.mockResolvedValueOnce([
      { id: 'ctv-1', name: 'CTV New Name', email: 'ctv@example.com', phone: '0909000000' },
    ]);
    cosmeticDb.queryRows.mockResolvedValueOnce([
      { id: 'ctv-1', name: 'CTV New Name', email: 'ctv@example.com', phone: '0909000000' },
    ]);

    const result = await updateCtvSelfProfile('ctv-1', { name: '  CTV   New Name  ' });

    expect(result).toEqual({
      id: 'ctv-1',
      name: 'CTV New Name',
      email: 'ctv@example.com',
      phone: '0909000000',
      role: 'CTV',
    });
    expect(dentalDb.queryRows).toHaveBeenCalledWith(expect.stringContaining('UPDATE dbo.partners'), ['CTV New Name', 'ctv-1']);
    expect(cosmeticDb.queryRows).toHaveBeenCalledWith(expect.stringContaining('UPDATE dbo.partners'), ['CTV New Name', 'ctv-1']);
  });

  test('rejects password changes when the current password is wrong', async () => {
    const hash = await bcrypt.hash('old-secret', 4);
    dentalDb.queryRows.mockResolvedValueOnce([
      { id: 'ctv-1', name: 'CTV', email: 'ctv@example.com', phone: '', password_hash: hash, is_ctv: true },
    ]);
    cosmeticDb.queryRows.mockResolvedValueOnce([]); // CTV not mirrored in cosmetic

    await expect(
      changeCtvSelfPassword('ctv-1', { currentPassword: 'wrong-secret', newPassword: 'new-secret' })
    ).rejects.toMatchObject({
      status: 401,
      code: 'P_CURRENT_PASSWORD_INVALID',
    });
    const dentalUpdates = dentalDb.queryRows.mock.calls.filter(([sql]) => /UPDATE dbo\.partners/.test(sql));
    const cosmeticUpdates = cosmeticDb.queryRows.mock.calls.filter(([sql]) => /UPDATE dbo\.partners/.test(sql));
    expect(dentalUpdates).toHaveLength(0);
    expect(cosmeticUpdates).toHaveLength(0);
  });

  test('rejects the change when the current password does not match EVERY LOB hash (blocks cross-LOB takeover)', async () => {
    const dentalHash = await bcrypt.hash('dental-secret', 4);
    const cosmeticHash = await bcrypt.hash('cosmetic-secret', 4);
    // Hashes have diverged between the two LOB databases.
    dentalDb.queryRows.mockResolvedValueOnce([
      { id: 'ctv-1', name: 'CTV', email: 'ctv@example.com', phone: '', password_hash: dentalHash, is_ctv: true },
    ]);
    cosmeticDb.queryRows.mockResolvedValueOnce([
      { id: 'ctv-1', name: 'CTV', email: 'ctv@example.com', phone: '', password_hash: cosmeticHash, is_ctv: true },
    ]);

    // The caller only knows the dental password — they must NOT be able to
    // overwrite (and hijack) the cosmetic credential.
    await expect(
      changeCtvSelfPassword('ctv-1', { currentPassword: 'dental-secret', newPassword: 'attacker-secret' })
    ).rejects.toMatchObject({ status: 401, code: 'P_CURRENT_PASSWORD_INVALID' });

    const dentalUpdates = dentalDb.queryRows.mock.calls.filter(([sql]) => /UPDATE dbo\.partners/.test(sql));
    const cosmeticUpdates = cosmeticDb.queryRows.mock.calls.filter(([sql]) => /UPDATE dbo\.partners/.test(sql));
    expect(dentalUpdates).toHaveLength(0);
    expect(cosmeticUpdates).toHaveLength(0);
  });

  test('writes a new password hash to every mirrored CTV row after verifying the current password in all LOBs', async () => {
    const hash = await bcrypt.hash('old-secret', 4);
    // CTV mirrored in both LOBs with the SAME (synced) hash.
    dentalDb.queryRows
      .mockResolvedValueOnce([
        { id: 'ctv-1', name: 'CTV', email: 'ctv@example.com', phone: '', password_hash: hash, is_ctv: true },
      ]) // find (dental)
      .mockResolvedValueOnce([{ id: 'ctv-1' }]); // update (dental)
    cosmeticDb.queryRows
      .mockResolvedValueOnce([
        { id: 'ctv-1', name: 'CTV', email: 'ctv@example.com', phone: '', password_hash: hash, is_ctv: true },
      ]) // find (cosmetic)
      .mockResolvedValueOnce([{ id: 'ctv-1' }]); // update (cosmetic)

    const result = await changeCtvSelfPassword('ctv-1', {
      currentPassword: 'old-secret',
      newPassword: 'new-secret',
    });

    expect(result).toEqual({ success: true });
    const dentalUpdate = dentalDb.queryRows.mock.calls.find(([sql]) => /UPDATE dbo\.partners/.test(sql));
    const cosmeticUpdate = cosmeticDb.queryRows.mock.calls.find(([sql]) => /UPDATE dbo\.partners/.test(sql));
    expect(dentalUpdate).toBeDefined();
    expect(cosmeticUpdate).toBeDefined();
    expect(dentalUpdate[1][0]).not.toBe(hash); // a fresh hash was written
    expect(dentalUpdate[1][1]).toBe('ctv-1');
  });
});
