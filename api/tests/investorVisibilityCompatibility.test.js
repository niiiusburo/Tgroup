'use strict';

jest.mock('../src/db', () => ({
  query: jest.fn(),
}));

jest.mock('../src/services/permissionService', () => ({
  resolveEffectivePermissions: jest.fn(),
}));

const { getConfiguredInvestor } = require('../src/routes/partners/investorVisibility');

describe('investor visibility live-schema compatibility', () => {
  it('uses investor_accounts.id when investor_clients has the legacy account FK', async () => {
    const runQuery = jest
      .fn()
      .mockResolvedValueOnce([{ present: 1 }])
      .mockResolvedValueOnce([{ investorAccountId: 'account-id', investorId: 'partner-id' }]);

    await expect(getConfiguredInvestor(runQuery)).resolves.toEqual({
      investorAccountId: 'account-id',
      investorId: 'partner-id',
      scopeInvestorId: 'account-id',
    });
  });

  it('uses partner id when investor_clients stores same-portal partner ids directly', async () => {
    const runQuery = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ investorAccountId: 'account-id', investorId: 'partner-id' }]);

    await expect(getConfiguredInvestor(runQuery)).resolves.toEqual({
      investorAccountId: 'account-id',
      investorId: 'partner-id',
      scopeInvestorId: 'partner-id',
    });
  });
});
