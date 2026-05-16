'use strict';

const { query } = require('../../../db');
const { resolveEffectivePermissions } = require('../../permissionService');
const { createWorkbook, populateSummarySheet, toVNDate } = require('../exportWorkbook');

const MAX_ROWS = 100_000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const EMPLOYEE_TYPES = {
  doctor: {
    label: 'Bác sĩ',
    employeeExpr: 'so.doctorid',
  },
  assistant: {
    label: 'Phụ tá',
    employeeExpr: 'COALESCE(so.assistantid, so.dentalaideid)',
  },
  consultant: {
    label: 'Tư vấn',
    employeeExpr: 'COALESCE(sol.counselorid, sol.advisoryid)',
  },
  sales: {
    label: 'Nhân viên sale',
    employeeExpr: 'COALESCE(cust.salestaffid, sol.employeeid)',
  },
};

const METHOD_LABELS = {
  cash: 'Tiền mặt',
  bank: 'Chuyển khoản',
  bank_transfer: 'Chuyển khoản',
  card: 'Thẻ',
  deposit: 'Cọc',
  momo: 'MoMo',
  vnpay: 'VNPay',
  zalopay: 'ZaloPay',
};

const DATA_COLUMNS = [
  { key: 'employee', header: 'Nhân viên', width: 26 },
  { key: 'employeeTotal', header: 'Doanh thu', width: 16 },
  { key: 'paymentDate', header: 'Ngày thanh toán', width: 16 },
  { key: 'paymentReference', header: 'Mã phiếu thu', width: 18 },
  { key: 'saleOrderCode', header: 'Mã phiếu khám', width: 18 },
  { key: 'saleOrderName', header: 'Số phiếu điều trị', width: 18 },
  { key: 'customerName', header: 'Khách hàng', width: 26 },
  { key: 'customerPhone', header: 'Số điện thoại', width: 16 },
  { key: 'roleLabel', header: 'Vai trò', width: 14 },
  { key: 'productName', header: 'Dịch vụ/Thuốc', width: 30 },
  { key: 'paymentAmount', header: 'Thanh toán', width: 16 },
  { key: 'companyName', header: 'Chi nhánh', width: 24 },
  { key: 'paymentMethod', header: 'Phương thức', width: 16 },
];

function makeError(message, status, code) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

function normalizeId(value) {
  if (!value || value === 'all') return '';
  return String(value);
}

function assertUuid(value, label) {
  if (value && !UUID_RE.test(value)) {
    throw makeError(`${label} không hợp lệ.`, 400, 'EXPORT_FILTER_INVALID');
  }
}

function resolveEmployeeType(type) {
  return EMPLOYEE_TYPES[type] || EMPLOYEE_TYPES.doctor;
}

function hasAllLocationAccess(permissionState) {
  const perms = permissionState?.effectivePermissions || [];
  const groupName = String(permissionState?.groupName || '');
  return perms.includes('*') || /admin/i.test(groupName);
}

async function resolveCompanyScope(user, companyId) {
  const requestedCompanyId = normalizeId(companyId);
  assertUuid(requestedCompanyId, 'Chi nhánh');

  const permissionState = await resolveEffectivePermissions(user?.employeeId);
  if (hasAllLocationAccess(permissionState)) {
    return {
      companyIds: requestedCompanyId ? [requestedCompanyId] : null,
      label: requestedCompanyId || 'Tất cả',
    };
  }

  const allowedIds = (permissionState.locations || []).map((loc) => loc.id).filter(Boolean);
  if (requestedCompanyId) {
    if (!allowedIds.includes(requestedCompanyId)) {
      throw makeError('Bạn không có quyền xuất dữ liệu cho chi nhánh này.', 403, 'EXPORT_LOCATION_DENIED');
    }
    return { companyIds: [requestedCompanyId], label: requestedCompanyId };
  }

  if (allowedIds.length === 0) {
    throw makeError('Tài khoản chưa có phạm vi chi nhánh để xuất báo cáo.', 403, 'EXPORT_LOCATION_SCOPE_REQUIRED');
  }

  return {
    companyIds: allowedIds,
    label: permissionState.locations.map((loc) => loc.name || loc.id).join(', '),
  };
}

function buildWhere(filters, scope, employeeType) {
  const conditions = [
    "p.status = 'posted'",
    'pa.invoice_id IS NOT NULL',
    'COALESCE(so.isdeleted, false) = false',
    `${employeeType.employeeExpr} IS NOT NULL`,
  ];
  const params = [];
  let idx = 1;

  if (filters.dateFrom) {
    conditions.push(`COALESCE(p.payment_date, p.created_at)::date >= $${idx}`);
    params.push(filters.dateFrom);
    idx += 1;
  }

  if (filters.dateTo) {
    conditions.push(`COALESCE(p.payment_date, p.created_at)::date <= $${idx}`);
    params.push(filters.dateTo);
    idx += 1;
  }

  if (scope.companyIds) {
    conditions.push(`so.companyid = ANY($${idx}::uuid[])`);
    params.push(scope.companyIds);
    idx += 1;
  }

  const employeeId = normalizeId(filters.employeeId);
  assertUuid(employeeId, 'Nhân viên');
  if (employeeId) {
    conditions.push(`${employeeType.employeeExpr} = $${idx}::uuid`);
    params.push(employeeId);
    idx += 1;
  }

  return { where: conditions.join(' AND '), params };
}

async function getRows(filters, user) {
  const employeeType = resolveEmployeeType(filters.employeeType);
  const scope = await resolveCompanyScope(user, filters.companyId);
  const { where, params } = buildWhere(filters, scope, employeeType);

  const sql = `
    WITH line_totals AS (
      SELECT
        orderid,
        NULLIF(SUM(ABS(COALESCE(pricetotal, 0))), 0) AS line_total
      FROM saleorderlines
      WHERE COALESCE(isdeleted, false) = false
      GROUP BY orderid
    ),
    allocation_totals AS (
      SELECT
        payment_id,
        SUM(allocated_amount) AS total_allocated_for_payment
      FROM payment_allocations
      GROUP BY payment_id
    )
    SELECT
      ${employeeType.employeeExpr} AS employeeid,
      emp.name AS employeename,
      emp.ref AS employee_ref,
      $${params.length + 1}::text AS rolelabel,
      c.name AS companyname,
      COALESCE(p.payment_date, p.created_at)::date AS paymentdate,
      p.reference_code AS paymentreference,
      COALESCE(
        NULLIF((
          SELECT STRING_AGG(DISTINCT NULLIF(solx.productname, ''), ', ')
          FROM saleorderlines solx
          WHERE solx.orderid = so.id
            AND COALESCE(solx.isdeleted, false) = false
        ), ''),
        NULLIF(so.name, so.code),
        so.name
      ) AS saleordername,
      so.code AS saleordercode,
      cust.name AS customername,
      cust.phone AS customerphone,
      COALESCE(sol.productname, sol.name, so.notes, 'Thanh toán dịch vụ') AS productname,
      p.method AS paymentmethod,
      CASE
        WHEN sol.id IS NULL OR lt.line_total IS NULL THEN
          CASE
            WHEN at.total_allocated_for_payment > p.amount AND at.total_allocated_for_payment > 0
            THEN pa.allocated_amount * p.amount / at.total_allocated_for_payment
            ELSE pa.allocated_amount
          END
        ELSE (
          CASE
            WHEN at.total_allocated_for_payment > p.amount AND at.total_allocated_for_payment > 0
            THEN pa.allocated_amount * p.amount / at.total_allocated_for_payment
            ELSE pa.allocated_amount
          END
        ) * ABS(COALESCE(sol.pricetotal, 0)) / lt.line_total
      END AS paymentamount
    FROM payment_allocations pa
    JOIN payments p ON p.id = pa.payment_id
    LEFT JOIN allocation_totals at ON at.payment_id = pa.payment_id
    JOIN saleorders so ON so.id = pa.invoice_id
    LEFT JOIN saleorderlines sol
      ON sol.orderid = so.id
      AND COALESCE(sol.isdeleted, false) = false
      AND COALESCE(sol.isactive, true) = true
    LEFT JOIN line_totals lt ON lt.orderid = so.id
    LEFT JOIN partners cust ON cust.id = COALESCE(p.customer_id, so.partnerid)
    LEFT JOIN partners emp ON emp.id = ${employeeType.employeeExpr}
    LEFT JOIN companies c ON c.id = so.companyid
    WHERE ${where}
    ORDER BY emp.name NULLS LAST, COALESCE(p.payment_date, p.created_at)::date, p.reference_code, so.name
    LIMIT ${MAX_ROWS + 1}
  `;

  return query(sql, [...params, employeeType.label]);
}

function toNumber(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function summarize(rows, employeeType) {
  const employees = new Set(rows.map((row) => row.employeeid).filter(Boolean));
  const total = rows.reduce((sum, row) => sum + toNumber(row.paymentamount), 0);
  return [
    { label: 'Số nhân viên', value: employees.size },
    { label: 'Số dòng thanh toán', value: rows.length },
    { label: 'Tổng thanh toán', value: total },
    { label: 'Loại nhân viên', value: employeeType.label },
  ];
}

function sanitizeText(value) {
  const text = value == null ? '' : String(value);
  return /^[=+\-@]/.test(text.trim()) ? `'${text}` : text;
}

function employeeLabel(row) {
  const name = row.employeename || 'Chưa có tên';
  return row.employee_ref ? `${name} (${row.employee_ref})` : name;
}

function groupRows(rows) {
  const groups = new Map();
  rows.forEach((row) => {
    const key = row.employeeid || 'unknown';
    if (!groups.has(key)) {
      groups.set(key, {
        employeeLabel: employeeLabel(row),
        total: 0,
        rows: [],
      });
    }
    const group = groups.get(key);
    group.total += toNumber(row.paymentamount);
    group.rows.push(row);
  });
  return Array.from(groups.values());
}

function styleHeaderRow(row) {
  row.height = 28;
  row.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF97316' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', wrapText: true };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } } };
  });
}

function populateGroupedDataSheet(worksheet, rows, filters, employeeType) {
  worksheet.mergeCells(1, 1, 1, DATA_COLUMNS.length);
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'BÁO CÁO DOANH THU THEO NHÂN VIÊN';
  titleCell.font = { bold: true, size: 14, color: { argb: 'FF111827' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

  worksheet.mergeCells(2, 1, 2, DATA_COLUMNS.length);
  const filterCell = worksheet.getCell('A2');
  filterCell.value = [
    `Loại nhân viên: ${employeeType.label}`,
    `Từ ngày: ${filters.dateFrom || 'Tất cả'}`,
    `Đến ngày: ${filters.dateTo || 'Tất cả'}`,
  ].join(' | ');
  filterCell.font = { italic: true, color: { argb: 'FF6B7280' } };
  filterCell.alignment = { vertical: 'middle', horizontal: 'center' };

  worksheet.columns = DATA_COLUMNS.map((column) => ({
    key: column.key,
    width: column.width,
  }));

  const headerRow = worksheet.getRow(3);
  DATA_COLUMNS.forEach((column, index) => {
    headerRow.getCell(index + 1).value = column.header;
  });
  styleHeaderRow(headerRow);

  let rowIndex = 4;
  groupRows(rows).forEach((group) => {
    const groupRow = worksheet.getRow(rowIndex);
    groupRow.getCell(1).value = sanitizeText(group.employeeLabel);
    groupRow.getCell(2).value = group.total;
    groupRow.font = { bold: true };
    groupRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF7ED' } };
      cell.border = { top: { style: 'thin', color: { argb: 'FFFED7AA' } } };
    });
    groupRow.getCell(2).numFmt = '#,##0';
    rowIndex += 1;

    group.rows.forEach((detail) => {
      const detailRow = worksheet.getRow(rowIndex);
      detailRow.getCell(3).value = detail.paymentdate ? toVNDate(detail.paymentdate) : null;
      detailRow.getCell(4).value = sanitizeText(detail.paymentreference);
      detailRow.getCell(5).value = sanitizeText(detail.saleordercode || '');
      detailRow.getCell(6).value = sanitizeText(detail.saleordername || '');
      detailRow.getCell(7).value = sanitizeText(detail.customername);
      detailRow.getCell(8).value = sanitizeText(detail.customerphone);
      detailRow.getCell(9).value = sanitizeText(detail.rolelabel);
      detailRow.getCell(10).value = sanitizeText(detail.productname);
      detailRow.getCell(11).value = toNumber(detail.paymentamount);
      detailRow.getCell(12).value = sanitizeText(detail.companyname);
      detailRow.getCell(13).value = METHOD_LABELS[detail.paymentmethod?.toLowerCase()] || detail.paymentmethod || '';
      detailRow.getCell(3).numFmt = 'dd/mm/yyyy';
      detailRow.getCell(11).numFmt = '#,##0';
      rowIndex += 1;
    });
  });

  worksheet.views = [{ state: 'frozen', ySplit: 3 }];
  worksheet.autoFilter = {
    from: { row: 3, column: 1 },
    to: { row: 3, column: DATA_COLUMNS.length },
  };
}

function filterRows(filters, scopeLabel, employeeType, user) {
  return [
    { label: 'Chi nhánh', value: scopeLabel || filters.companyId || 'Tất cả' },
    { label: 'Loại nhân viên', value: employeeType.label },
    { label: 'Nhân viên', value: filters.employeeId && filters.employeeId !== 'all' ? filters.employeeId : 'Tất cả' },
    { label: 'Từ ngày', value: filters.dateFrom || 'Tất cả' },
    { label: 'Đến ngày', value: filters.dateTo || 'Tất cả' },
    { label: 'Xuất bởi', value: user?.name || user?.email || '' },
  ];
}

async function preview(filters, user) {
  const employeeType = resolveEmployeeType(filters.employeeType);
  const rows = await getRows(filters, user);
  const exceedsMax = rows.length > MAX_ROWS;
  const visibleRows = exceedsMax ? rows.slice(0, MAX_ROWS) : rows;

  return {
    rowCount: visibleRows.length,
    summary: summarize(visibleRows, employeeType),
    exceedsMax,
  };
}

async function build(filters, user) {
  const employeeType = resolveEmployeeType(filters.employeeType);
  const scope = await resolveCompanyScope(user, filters.companyId);
  const rows = await getRows(filters, user);

  if (rows.length > MAX_ROWS) {
    throw makeError(
      `Kết quả vượt quá ${MAX_ROWS.toLocaleString('vi-VN')} dòng. Vui lòng thu hẹp bộ lọc.`,
      400,
      'EXPORT_ROW_LIMIT_EXCEEDED'
    );
  }

  const workbook = createWorkbook('Báo cáo doanh thu theo nhân viên', {
    exportedBy: user?.name || user?.email || '',
    filters: filterRows(filters, scope.label, employeeType, user),
  });

  populateGroupedDataSheet(workbook.getWorksheet('Data'), rows, filters, employeeType);
  populateSummarySheet(workbook.getWorksheet('Summary'), summarize(rows, employeeType));

  return { workbook, rowCount: rows.length };
}

module.exports = {
  preview,
  build,
};
