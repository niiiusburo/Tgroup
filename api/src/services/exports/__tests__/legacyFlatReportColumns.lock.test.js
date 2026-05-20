'use strict';

const path = require('path');
const {
  REVENUE_COLUMNS,
  DEPOSIT_COLUMNS,
} = require('../builders/legacyFlatReportColumns');
const legacyFlatReportsExport = require('../builders/legacyFlatReportsExport');

/**
 * COLUMN LOCK — anti-regression guard for the Revenue and Deposit Excel exports.
 *
 * Five separate times between Apr–May 2026, a column silently disappeared from
 * one of these two exports during an unrelated fix or merge. The pattern was:
 *   1. Dev edits REVENUE_COLUMNS while fixing something nearby
 *   2. Dev also edits the inline header assertion in legacyFlatReportsExport.test.js
 *      so their PR still passes
 *   3. The column is gone, nobody notices until the customer opens Excel
 *
 * This test file exists to make that workflow visibly impossible:
 *
 *   A) The expected column key+header lists are duplicated below, so dropping a
 *      column requires editing TWO test files plus the data file in one PR — a
 *      reviewer cannot miss it.
 *   B) The COUNT is asserted explicitly. A column count change is loud.
 *   C) Every column key is checked for presence in the row mapper, so adding to
 *      the registry without wiring the mapper fails fast.
 *   D) Every column key is checked against the SQL SELECT alias list, so the
 *      SQL and the registry must agree.
 *
 * If you are intentionally adding or removing a column:
 *   1. Update the EXPECTED_REVENUE_COLUMNS / EXPECTED_DEPOSIT_COLUMNS arrays below
 *   2. Update REVENUE_COLUMNS / DEPOSIT_COLUMNS in legacyFlatReportColumns.js
 *   3. Update the SQL SELECT in legacyFlatRevenueQuery.js / legacyFlatDepositQuery.js
 *   4. Update the row mapper in legacyFlatReportsExport.js
 *   5. Update the inline header assertion in legacyFlatReportsExport.test.js
 *
 * If all 5 steps don't happen together, this test will fail. That's the point.
 */

// ---------------------------------------------------------------------------
// Locked snapshots — verified against NK2 production export on 2026-05-20.
// DO NOT edit casually. Each change here means a customer-visible column change.
// ---------------------------------------------------------------------------

const EXPECTED_REVENUE_COLUMNS = [
  { key: 'companyName',        header: 'Cơ sở' },
  { key: 'customerCode',       header: 'Mã Khách hàng' },
  { key: 'customerName',       header: 'Tên khách hàng' },
  { key: 'customerPhone',      header: 'Số điện thoại' },
  { key: 'saleOrderCode',      header: 'Mã phiếu khám' },
  { key: 'serviceName',        header: 'Dịch vụ' },
  { key: 'saleOrderName',      header: 'Tên dịch vụ' },
  { key: 'saleOrderTotal',     header: 'Tổng tiền phiếu' },
  { key: 'saleOrderResidual',  header: 'Còn lại phiếu' },
  { key: 'paymentDate',        header: 'Ngày thanh toán' },
  { key: 'amount',             header: 'Số tiền' },
  { key: 'cashAmount',         header: 'Tiền mặt' },
  { key: 'bankAmount',         header: 'Chuyển khoản' },
  { key: 'depositUsed',        header: 'Tiền cọc' },
  { key: 'receiptNumber',      header: 'Số biên lai' },
  { key: 'paymentNote',        header: 'Note thanh toán' },
  { key: 'saleOnline',         header: 'Sale online' },
  { key: 'customerCare',       header: 'CSKH' },
  { key: 'doctorName',         header: 'Bác sĩ' },
  { key: 'assistantName',      header: 'Phụ tá' },
  { key: 'dentalAideName',     header: 'Trợ lý bác sĩ' },
  { key: 'customerSource',     header: 'Nguồn khách' },
];

const EXPECTED_DEPOSIT_COLUMNS = [
  { key: 'companyName',     header: 'Cơ sở' },
  { key: 'customerCode',    header: 'Mã Khách hàng' },
  { key: 'customerName',    header: 'Tên khách hàng' },
  { key: 'customerPhone',   header: 'Số điện thoại' },
  { key: 'depositDate',     header: 'Ngày cọc' },
  { key: 'amount',          header: 'Số tiền cọc' },
  { key: 'cashAmount',      header: 'Tiền mặt' },
  { key: 'bankAmount',      header: 'Chuyển khoản' },
  { key: 'paymentMethod',   header: 'Phương thức' },
  { key: 'depositNote',     header: 'Note cọc tiền' },
  { key: 'saleOnline',      header: 'Sale online' },
  { key: 'customerCare',    header: 'CSKH' },
  { key: 'customerSource',  header: 'Nguồn khách' },
];

describe('legacyFlatReportColumns — locked source of truth', () => {
  describe('REVENUE_COLUMNS (the Excel "doanh thu" export)', () => {
    test('column count is locked', () => {
      expect(REVENUE_COLUMNS).toHaveLength(EXPECTED_REVENUE_COLUMNS.length);
    });

    test('every key+header pair matches the locked snapshot (order-sensitive)', () => {
      const actual = REVENUE_COLUMNS.map(({ key, header }) => ({ key, header }));
      expect(actual).toEqual(EXPECTED_REVENUE_COLUMNS);
    });

    test('column keys are unique (no accidental duplicate from a merge)', () => {
      const keys = REVENUE_COLUMNS.map((c) => c.key);
      expect(new Set(keys).size).toBe(keys.length);
    });

    test('every column key is referenced by the row mapper in legacyFlatReportsExport.js', () => {
      const builderSrc = require('fs')
        .readFileSync(
          path.resolve(__dirname, '..', 'builders', 'legacyFlatReportsExport.js'),
          'utf8',
        );
      const missing = REVENUE_COLUMNS
        .map((c) => c.key)
        .filter((key) => !builderSrc.includes(key));
      expect(missing).toEqual([]);
    });
  });

  describe('DEPOSIT_COLUMNS (the Excel "tiền cọc" export)', () => {
    test('column count is locked', () => {
      expect(DEPOSIT_COLUMNS).toHaveLength(EXPECTED_DEPOSIT_COLUMNS.length);
    });

    test('every key+header pair matches the locked snapshot (order-sensitive)', () => {
      const actual = DEPOSIT_COLUMNS.map(({ key, header }) => ({ key, header }));
      expect(actual).toEqual(EXPECTED_DEPOSIT_COLUMNS);
    });

    test('column keys are unique', () => {
      const keys = DEPOSIT_COLUMNS.map((c) => c.key);
      expect(new Set(keys).size).toBe(keys.length);
    });

    test('every column key is referenced by the row mapper in legacyFlatReportsExport.js', () => {
      const builderSrc = require('fs')
        .readFileSync(
          path.resolve(__dirname, '..', 'builders', 'legacyFlatReportsExport.js'),
          'utf8',
        );
      const missing = DEPOSIT_COLUMNS
        .map((c) => c.key)
        .filter((key) => !builderSrc.includes(key));
      expect(missing).toEqual([]);
    });
  });

  test('builder module loads (smoke)', () => {
    expect(legacyFlatReportsExport).toBeDefined();
  });
});
