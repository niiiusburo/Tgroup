const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '../..');

describe('foundation migration script safety gates', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    jest.unmock(path.join(repoRoot, 'scripts/migration/config.js'));
    process.env = { ...originalEnv, SOURCE_DB_HOST: '127.0.0.1' };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.resetModules();
  });

  it('requires an explicit source database host and has no remote source default', () => {
    const config = require('../../scripts/migration/config');
    const configSource = fs.readFileSync(path.join(repoRoot, 'scripts/migration/config.js'), 'utf8');

    expect(() => config.resolveSourceDbConfig({})).toThrow(/SOURCE_DB_HOST.*explicit/i);
    expect(config.resolveSourceDbConfig({ SOURCE_DB_HOST: 'localhost' })).toMatchObject({
      host: 'localhost',
      database: 'tdental_demo',
    });
    expect(configSource).not.toContain('vps.tamtmv.com');
  });

  it('blocks source cleanup writes unless the write gate is explicitly enabled', () => {
    const config = require('../../scripts/migration/config');

    expect(() => config.assertSourceWritesAllowed({ SOURCE_DB_HOST: '127.0.0.1' }))
      .toThrow(/source db writes are disabled by default/i);
    expect(() => config.assertSourceWritesAllowed({
      SOURCE_DB_HOST: '127.0.0.1',
      ALLOW_SOURCE_DB_WRITES: '1',
    })).not.toThrow();
  });

  it('checks the write gate before opening a source cleanup connection', async () => {
    const connect = jest.fn();
    const assertSourceWritesAllowed = jest.fn(() => {
      throw new Error('Source DB writes are disabled by default');
    });

    jest.doMock(path.join(repoRoot, 'scripts/migration/config.js'), () => ({
      sourcePool: { connect },
      assertSourceWritesAllowed,
      CLEANING_RULES: {
        dummyUuid: '00000000-0000-0000-0000-000000000001',
        dummyUuidColumns: [],
        so2026: { strategy: 'preserve' },
      },
    }));

    const { fixDummyUuids } = require('../../scripts/migration/clean');

    await expect(fixDummyUuids()).rejects.toThrow(/source db writes are disabled by default/i);
    expect(assertSourceWritesAllowed).toHaveBeenCalledTimes(1);
    expect(connect).not.toHaveBeenCalled();
  });

  it('makes the obsolete deploy bootstrap refuse and point to the current production runbook', () => {
    const script = path.join(repoRoot, 'scripts/deploy-tbot.sh');
    const content = fs.readFileSync(script, 'utf8');

    expect(content).not.toContain('tbot.vn');
    expect(content).toContain('nk.2checkin.com');

    const syntax = spawnSync('bash', ['-n', script], { encoding: 'utf8' });
    expect(syntax.status).toBe(0);

    const run = spawnSync('bash', [script, '203.0.113.10'], { encoding: 'utf8' });
    const output = `${run.stdout}\n${run.stderr}`;
    expect(run.status).not.toBe(0);
    expect(output).toMatch(/obsolete|refus/i);
    expect(output).toContain('docs/runbooks/DEPLOYMENT.md');
    expect(output).toContain('nk.2checkin.com');
  });
});

describe('TDental import safety gates', () => {
  afterEach(() => {
    delete process.env.TDENTAL_ALLOW_LEGACY_GREEDY_ALLOCATIONS;
  });

  it('blocks relation-driven apply when posted payments exist but allocation relation data is absent', () => {
    const { assertRelationDrivenAllocationData } = require('../scripts/tdental-import/allocation-safety');

    expect(() => assertRelationDrivenAllocationData({
      accountpayments: [{ Id: 'payment-1', State: 'posted', Amount: '100000' }],
      saleorderpaymentaccountpaymentrels: [],
    })).toThrow(/SaleOrderPaymentAccountPaymentRels/);

    expect(() => assertRelationDrivenAllocationData({
      accountpayments: [{ Id: 'payment-1', State: 'cancel', Amount: '100000' }],
      saleorderpaymentaccountpaymentrels: [],
    })).not.toThrow();

    expect(() => assertRelationDrivenAllocationData({
      accountpayments: [{ Id: 'payment-1', State: 'posted', Amount: '100000' }],
      saleorderpaymentaccountpaymentrels: [{ AccountPaymentId: 'payment-1', SaleOrderPaymentId: 'sop-1' }],
    })).not.toThrow();
  });

  it('keeps the one-client greedy allocation apply path disabled unless the legacy flag is set', async () => {
    const { applyClientImport } = require('../scripts/tdental-import/database');
    const client = { query: jest.fn() };
    const plan = {
      partner: { Id: '00000000-0000-0000-0000-000000000001' },
      rows: {
        lines: [{ OrderId: '00000000-0000-0000-0000-000000000002', PriceTotal: '100000' }],
        payments: [{ Id: '00000000-0000-0000-0000-000000000003', State: 'posted', Amount: '100000' }],
      },
      mapping: { salesStaff: null },
    };

    await expect(applyClientImport(client, plan)).rejects.toThrow(/legacy greedy allocation/i);
    expect(client.query).not.toHaveBeenCalled();

    process.env.TDENTAL_ALLOW_LEGACY_GREEDY_ALLOCATIONS = '1';
    await expect(applyClientImport(client, plan)).rejects.not.toThrow(/legacy greedy allocation/i);
  });

  it('records CSV parser repairs as source anomalies', () => {
    const { readCsv } = require('../scripts/tdental-import/utils');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tdental-csv-anomalies-'));
    const partnersFile = path.join(dir, 'dbo.Partners.csv');
    const quoteFile = path.join(dir, 'dbo.AccountPayments.csv');

    fs.writeFileSync(
      partnersFile,
      [
        'Id,Name,Street,Phone',
        'P1,Nguyen,TAN BINH, Q12,0901',
      ].join('\n'),
    );
    fs.writeFileSync(quoteFile, 'Id,Name\nP1,"broken quote\n');

    const anomalies = [];
    expect(readCsv(partnersFile, { anomalies })[0]).toMatchObject({
      Street: 'TAN BINH, Q12',
      Phone: '0901',
    });
    expect(readCsv(quoteFile, { anomalies })[0]).toMatchObject({
      Name: 'broken quote',
    });

    expect(anomalies).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'csv_partner_street_repair',
        file: partnersFile,
        lineNumber: 2,
      }),
      expect.objectContaining({
        code: 'csv_odd_quote_sanitized',
        file: quoteFile,
        lineNumber: 2,
      }),
    ]));
  });
});
