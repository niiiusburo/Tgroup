'use strict';

const fs = require('fs');
const path = require('path');

/**
 * ALL-BUILDER COLUMN LOCK — anti-regression guard for every Excel export.
 *
 * The legacyFlatReportColumns.lock.test.js (added in commit 2b6e7618) locks
 * REVENUE_COLUMNS + DEPOSIT_COLUMNS — the two exports that actually regressed
 * five times. This file extends the same pattern to every other export
 * builder so the same class of drift cannot bite a different surface next.
 *
 * The export builders don't `module.exports` their COLUMNS array (they're
 * internal const). So this test reads each builder file as TEXT and asserts:
 *   1. The file contains a `const COLUMNS = [` (or `const DATA_COLUMNS = [` for
 *      reportSalesEmployeesExport).
 *   2. Every locked (key, header) pair appears verbatim in the file.
 *   3. The total count of `{ key:` literals matches the locked count.
 *   4. The order of keys in the source matches the locked order.
 *
 * If you intentionally add/remove/reorder a column in one of these builders:
 *   1. Update the locked EXPECTED_*_COLUMNS array below
 *   2. Update the builder file
 *   3. Run `npx jest src/services/exports/__tests__/*.lock.test.js`
 *   4. Both must pass before commit.
 *
 * Snapshots verified against working tree at commit 2b6e7618 (2026-05-20).
 */

const BUILDERS_DIR = path.resolve(__dirname, '..', 'builders');

function readBuilder(name) {
  return fs.readFileSync(path.join(BUILDERS_DIR, name), 'utf8');
}

function countColumnLiterals(src, arrayConstName) {
  // Find the `const NAME = [` block and count `{ key:` inside it (until the
  // matching `];`). Resistant to other `{ key:` occurrences elsewhere.
  const re = new RegExp(`const ${arrayConstName}\\s*=\\s*\\[([\\s\\S]*?)\\n\\];`);
  const match = src.match(re);
  if (!match) return 0;
  const body = match[1];
  return (body.match(/\{\s*key\s*:/g) || []).length;
}

function keyOrder(src, arrayConstName) {
  // Returns the in-source order of `key:` values within the array block.
  const re = new RegExp(`const ${arrayConstName}\\s*=\\s*\\[([\\s\\S]*?)\\n\\];`);
  const match = src.match(re);
  if (!match) return [];
  const body = match[1];
  const keys = [...body.matchAll(/\{\s*key\s*:\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
  return keys;
}

/** Generic 4-assertion lock for a single builder. */
function lockBuilder({ describeName, file, arrayConstName, expected }) {
  describe(describeName, () => {
    const src = readBuilder(file);

    test('column count is locked', () => {
      expect(countColumnLiterals(src, arrayConstName)).toBe(expected.length);
    });

    test('every (key, header) pair is present in source verbatim', () => {
      const missing = expected.filter(({ key, header }) => {
        // Match e.g. { key: 'foo', header: 'Bar', ... } (any trailing fields ok)
        const re = new RegExp(
          `\\{\\s*key\\s*:\\s*['"]${key}['"]\\s*,\\s*header\\s*:\\s*['"]${header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`,
        );
        return !re.test(src);
      });
      expect(missing).toEqual([]);
    });

    test('key order matches locked order', () => {
      expect(keyOrder(src, arrayConstName)).toEqual(expected.map((c) => c.key));
    });

    test('column keys are unique (no accidental duplicates from merge)', () => {
      const keys = expected.map((c) => c.key);
      expect(new Set(keys).size).toBe(keys.length);
    });
  });
}

// ─── appointmentsExport.js ───────────────────────────────────────────────────
lockBuilder({
  describeName: 'appointmentsExport COLUMNS',
  file: 'appointmentsExport.js',
  arrayConstName: 'COLUMNS',
  expected: [
    { key: 'id',              header: 'Mã lịch hẹn' },
    { key: 'datetime',        header: 'Ngày giờ hẹn' },
    { key: 'customerCode',    header: 'Mã KH' },
    { key: 'customerName',    header: 'Khách hàng' },
    { key: 'customerPhone',   header: 'SĐT' },
    { key: 'serviceName',     header: 'Dịch vụ' },
    { key: 'doctorName',      header: 'Bác sĩ' },
    { key: 'assistantName',   header: 'Phụ tá' },
    { key: 'dentalAideName',  header: 'Trợ lý BS' },
    { key: 'companyName',     header: 'Chi nhánh' },
    { key: 'type',            header: 'Loại hẹn' },
    { key: 'status',          header: 'Trạng thái' },
    { key: 'content',         header: 'Nội dung' },
    { key: 'notes',           header: 'Ghi chú' },
  ],
});

// ─── customersExport.js ──────────────────────────────────────────────────────
lockBuilder({
  describeName: 'customersExport COLUMNS',
  file: 'customersExport.js',
  arrayConstName: 'COLUMNS',
  expected: [
    { key: 'code',          header: 'Mã KH' },
    { key: 'displayname',   header: 'Tên khách hàng' },
    { key: 'phone',         header: 'SĐT' },
    { key: 'gender',        header: 'Giới tính' },
    { key: 'birthday',      header: 'Ngày sinh' },
    { key: 'sourcename',    header: 'Nguồn' },
    { key: 'salestaffname', header: 'Sale' },
    { key: 'cskhname',      header: 'CSKH' },
    { key: 'companyname',   header: 'Chi nhánh' },
    { key: 'address',       header: 'Địa chỉ' },
    { key: 'comment',       header: 'Ghi chú' },
    { key: 'datecreated',   header: 'Ngày tạo' },
    { key: 'status',        header: 'Trạng thái' },
  ],
});

// ─── paymentsExport.js ───────────────────────────────────────────────────────
lockBuilder({
  describeName: 'paymentsExport COLUMNS',
  file: 'paymentsExport.js',
  arrayConstName: 'COLUMNS',
  expected: [
    { key: 'referenceCode',  header: 'Mã phiếu thu' },
    { key: 'paymentDate',    header: 'Ngày thanh toán' },
    { key: 'customerCode',   header: 'Mã KH' },
    { key: 'customerName',   header: 'Khách hàng' },
    { key: 'customerPhone',  header: 'SĐT' },
    { key: 'amount',         header: 'Số tiền' },
    { key: 'cashAmount',     header: 'Tiền mặt' },
    { key: 'bankAmount',     header: 'Chuyển khoản' },
    { key: 'depositUsed',    header: 'Đặt cọc' },
    { key: 'method',         header: 'Phương thức' },
    { key: 'status',         header: 'Trạng thái' },
    { key: 'saleOrderName',  header: 'Số phiếu điều trị' },
    { key: 'notes',          header: 'Nội dung' },
    { key: 'companyName',    header: 'Chi nhánh' },
  ],
});

// ─── servicesExport.js ───────────────────────────────────────────────────────
lockBuilder({
  describeName: 'servicesExport COLUMNS',
  file: 'servicesExport.js',
  arrayConstName: 'COLUMNS',
  expected: [
    { key: 'name',           header: 'Số phiếu' },
    { key: 'datecreated',    header: 'Ngày tạo' },
    { key: 'customerCode',   header: 'Mã KH' },
    { key: 'customerName',   header: 'Khách hàng' },
    { key: 'productName',    header: 'Dịch vụ' },
    { key: 'quantity',       header: 'Số lượng' },
    { key: 'tooth',          header: 'Răng' },
    { key: 'doctorName',     header: 'Bác sĩ' },
    { key: 'assistantName',  header: 'Phụ tá' },
    { key: 'dentalAideName', header: 'Trợ lý BS' },
    { key: 'sourcename',     header: 'Nguồn' },
    { key: 'amountTotal',    header: 'Tổng tiền' },
    { key: 'totalPaid',      header: 'Đã thu' },
    { key: 'residual',       header: 'Còn lại' },
    { key: 'state',          header: 'Trạng thái' },
    { key: 'companyName',    header: 'Chi nhánh' },
    { key: 'notes',          header: 'Ghi chú' },
  ],
});

// ─── serviceCatalogExport.js ─────────────────────────────────────────────────
lockBuilder({
  describeName: 'serviceCatalogExport COLUMNS',
  file: 'serviceCatalogExport.js',
  arrayConstName: 'COLUMNS',
  expected: [
    { key: 'defaultcode', header: 'Mã dịch vụ' },
    { key: 'name',        header: 'Tên dịch vụ' },
    { key: 'categname',   header: 'Nhóm dịch vụ' },
    { key: 'uomname',     header: 'Đơn vị' },
    { key: 'listprice',   header: 'Giá niêm yết' },
    { key: 'saleprice',   header: 'Giá bán' },
    { key: 'laboprice',   header: 'Giá labo' },
    { key: 'companyname', header: 'Chi nhánh' },
    { key: 'active',      header: 'Trạng thái' },
    { key: 'datecreated', header: 'Ngày tạo' },
    { key: 'lastupdated', header: 'Cập nhật lần cuối' },
  ],
});

// ─── reportSalesEmployeesExport.js (DATA_COLUMNS, not COLUMNS) ───────────────
lockBuilder({
  describeName: 'reportSalesEmployeesExport DATA_COLUMNS',
  file: 'reportSalesEmployeesExport.js',
  arrayConstName: 'DATA_COLUMNS',
  expected: [
    { key: 'employee',          header: 'Nhân viên' },
    { key: 'employeeTotal',     header: 'Doanh thu' },
    { key: 'paymentDate',       header: 'Ngày thanh toán' },
    { key: 'paymentReference',  header: 'Mã phiếu thu' },
    { key: 'saleOrderCode',     header: 'Mã phiếu khám' },
    { key: 'saleOrderName',     header: 'Số phiếu điều trị' },
    { key: 'customerName',      header: 'Khách hàng' },
    { key: 'customerPhone',     header: 'Số điện thoại' },
    { key: 'roleLabel',         header: 'Vai trò' },
    { key: 'productName',       header: 'Dịch vụ/Thuốc' },
    { key: 'paymentAmount',     header: 'Thanh toán' },
    { key: 'companyName',       header: 'Chi nhánh' },
    { key: 'paymentMethod',     header: 'Phương thức' },
  ],
});
