'use strict';

const { toVNDate } = require('../exportWorkbook');
const { createFlatWorkbook } = require('../flatWorkbook');
const { REVENUE_COLUMNS, DEPOSIT_COLUMNS } = require('./legacyFlatReportColumns');
const { getRevenueRows, previewRevenue } = require('./legacyFlatRevenueQuery');
const { getDepositRows, previewDeposit } = require('./legacyFlatDepositQuery');

const MAX_ROWS = 100_000;

function makeRowLimitError() {
  const err = new Error(`Kết quả vượt quá ${MAX_ROWS.toLocaleString('vi-VN')} dòng. Vui lòng thu hẹp bộ lọc.`);
  err.code = 'EXPORT_ROW_LIMIT_EXCEEDED';
  return err;
}

function numberValue(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateValue(value) {
  return value ? toVNDate(value) : null;
}

function createBuilder({ columns, getRows, getPreview, toDataRow }) {
  return {
    async preview(filters) {
      const summary = await getPreview(filters);
      const total = parseInt(summary.total || 0, 10);
      return {
        rowCount: total,
        summary: [
          { label: 'Tổng dòng', value: total },
          { label: 'Tổng tiền', value: numberValue(summary.total_amount) },
        ],
        exceedsMax: total > MAX_ROWS,
      };
    },

    async build(filters, user) {
      const rows = await getRows(filters, MAX_ROWS);
      if (rows.length > MAX_ROWS) {
        throw makeRowLimitError();
      }

      const workbook = createFlatWorkbook(columns, rows.map(toDataRow), {
        exportedBy: user?.name || user?.email || '',
      });
      return { workbook, rowCount: rows.length };
    },
  };
}

const revenue = createBuilder({
  columns: REVENUE_COLUMNS,
  getRows: getRevenueRows,
  getPreview: previewRevenue,
  toDataRow: (row) => ({
    companyName: row.companyname || '',
    customerCode: row.partnercode || '',
    customerName: row.partnerdisplayname || row.partnername || '',
    customerPhone: row.partnerphone || '',
    saleOrderCode: row.saleordercode || '',
    saleOrderName: row.saleordername || '',
    saleOrderTotal: numberValue(row.saleorder_total),
    saleOrderResidual: numberValue(row.saleorder_residual),
    receiptNumber: row.receipt_number || '',
    paymentDate: dateValue(row.paymentdate),
    amount: numberValue(row.row_amount),
    cashAmount: numberValue(row.row_cash_amount),
    bankAmount: numberValue(row.row_bank_amount),
    depositUsed: numberValue(row.row_deposit_used),
    saleOnline: row.salestaffname || '',
    customerCare: row.cskhname || '',
    doctorName: row.doctorname || '',
    assistantName: row.assistantname || '',
    dentalAideName: row.dentalaidename || '',
    customerSource: row.customersourcename || '',
  }),
});

const deposit = createBuilder({
  columns: DEPOSIT_COLUMNS,
  getRows: getDepositRows,
  getPreview: previewDeposit,
  toDataRow: (row) => ({
    companyName: row.companyname || '',
    customerCode: row.partnercode || '',
    customerName: row.partnerdisplayname || row.partnername || '',
    customerPhone: row.partnerphone || '',
    depositDate: dateValue(row.paymentdate),
    amount: numberValue(row.amount),
    cashAmount: numberValue(row.cash_amount),
    bankAmount: numberValue(row.bank_amount),
    saleOnline: row.salestaffname || '',
    customerCare: row.cskhname || '',
    customerSource: row.customersourcename || '',
  }),
});

module.exports = {
  revenue,
  deposit,
  MAX_ROWS,
};
