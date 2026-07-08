'use strict';

jest.mock('../src/db', () => ({
  query: jest.fn(),
}));

jest.mock('../src/services/permissionService', () => ({
  resolveEffectivePermissions: jest.fn(),
}));

const { getConfiguredInvestor } = require('../src/routes/partners/investorVisibility');

// getConfiguredInvestor runs three queries in order:
//   1. investorClientsUseAccountId  -> FK-present probe
//   2. ranking SELECT               -> candidate investor accounts (ordered)
//   3. active account ids           -> SELECT id FROM investor_accounts WHERE partner_id=$1
function mockRunQuery({ fkPresent, ranking, accountIds }) {
  return jest
    .fn()
    .mockResolvedValueOnce(fkPresent ? [{ present: 1 }] : [])
    .mockResolvedValueOnce(ranking)
    .mockResolvedValueOnce(accountIds.map((id) => ({ id })));
}

describe('investor visibility live-schema compatibility', () => {
  it('uses investor_accounts.id as the write key when the legacy account FK is present', async () => {
    const runQuery = mockRunQuery({
      fkPresent: true,
      ranking: [{ investorAccountId: 'account-id', investorId: 'partner-id', visibleClientCount: 3 }],
      accountIds: ['account-id'],
    });

    const result = await getConfiguredInvestor(runQuery);

    expect(result).toEqual({
      investorAccountId: 'account-id',
      investorId: 'partner-id',
      scopeInvestorId: 'account-id',
      writeKey: 'account-id',
      scopeMatchIds: ['partner-id', 'account-id'],
    });
  });

  it('uses the partner id as the write key when investor_clients stores same-portal partner ids directly', async () => {
    const runQuery = mockRunQuery({
      fkPresent: false,
      ranking: [{ investorAccountId: 'account-id', investorId: 'partner-id', visibleClientCount: 2 }],
      accountIds: ['account-id'],
    });

    const result = await getConfiguredInvestor(runQuery);

    expect(result).toEqual({
      investorAccountId: 'account-id',
      investorId: 'partner-id',
      scopeInvestorId: 'partner-id',
      writeKey: 'partner-id',
      // The union still includes the account id so reads/untick stay symmetric
      // with resolveInvestorScope even if a row was written under the account key.
      scopeMatchIds: ['partner-id', 'account-id'],
    });
  });

  it('scopeMatchIds unions the partner id with EVERY active account id (mirrors resolveInvestorScope)', async () => {
    const runQuery = mockRunQuery({
      fkPresent: true,
      ranking: [{ investorAccountId: 'acc-1', investorId: 'partner-id', visibleClientCount: 5 }],
      accountIds: ['acc-1', 'acc-2'],
    });

    const result = await getConfiguredInvestor(runQuery);

    expect(result.scopeMatchIds).toEqual(['partner-id', 'acc-1', 'acc-2']);
  });

  it('resolves deterministically to the most-in-use account and NEVER 409s on multiple investors', async () => {
    // The ranking SQL already orders by visible-client count DESC, so rows[0] is
    // the canonical investor. A stray/E2E second account must not throw.
    const runQuery = mockRunQuery({
      fkPresent: true,
      ranking: [
        { investorAccountId: 'acc-canonical', investorId: 'partner-canonical', visibleClientCount: 3569 },
        { investorAccountId: 'acc-stray', investorId: 'partner-stray', visibleClientCount: 0 },
      ],
      accountIds: ['acc-canonical'],
    });

    const result = await getConfiguredInvestor(runQuery);

    expect(result.investorId).toBe('partner-canonical');
    expect(result.scopeInvestorId).toBe('acc-canonical');
  });

  it('throws 404 INVESTOR_ACCOUNT_NOT_CONFIGURED when no active investor account exists', async () => {
    const runQuery = jest
      .fn()
      .mockResolvedValueOnce([{ present: 1 }])
      .mockResolvedValueOnce([]);

    await expect(getConfiguredInvestor(runQuery)).rejects.toMatchObject({
      status: 404,
      code: 'INVESTOR_ACCOUNT_NOT_CONFIGURED',
    });
  });
});
