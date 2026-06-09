'use strict';

/**
 * @crossref:domain[ctv]
 * @crossref:used-in[NK3 backend service function: api/src/services/exports/builders/newClientsExport]
 * @crossref:uses[product-map/domains/ctv.yaml, docs/TEST-MATRIX.md, testbright.md]
 */
/**
 * newClientsExport.js — Excel export for the admin "New Clients" tab.
 * Reuses newClientsQuery (both LOB DBs) so the export matches the on-screen list.
 */

const { createWorkbook, populateDataSheet, populateSummarySheet, toVNDate } = require('../exportWorkbook');
const { listNewClients } = require('../../newClientsQuery');

const LOB_LABELS = { dental: 'Nha khoa', cosmetic: 'Thẩm mỹ' };

const COLUMNS = [
  { key: 'name', header: 'Khách hàng', width: 26 },
  { key: 'phone', header: 'SĐT', width: 16 },
  { key: 'ctvName', header: 'CTV giới thiệu', width: 26 },
  { key: 'ctvPhone', header: 'SĐT CTV', width: 16 },
  { key: 'lob', header: 'Lĩnh vực', width: 14 },
  { key: 'referredAt', header: 'Ngày giới thiệu', width: 16, style: 'date' },
  { key: 'serviceCount', header: 'Số dịch vụ', width: 12 },
  { key: 'serviceTotal', header: 'Doanh thu dịch vụ', width: 18, style: 'vnd' },
  { key: 'paidTotal', header: 'Đã thu', width: 16, style: 'vnd' },
  { key: 'commissionTotal', header: 'COM CTV', width: 16, style: 'vnd' },
  { key: 'commissionStatus', header: 'Trạng thái COM', width: 22 },
];

async function fetchAll(filters) {
  return listNewClients({
    lob: filters.lob,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    limit: 100000,
    offset: 0,
  });
}

async function preview(filters, _user) {
  const { items, totalItems } = await fetchAll(filters);
  const byLob = items.reduce((acc, c) => {
    acc[c.lob] = (acc[c.lob] || 0) + 1;
    return acc;
  }, {});
  const totals = items.reduce((acc, c) => {
    acc.serviceTotal += Number(c.service_total || 0);
    acc.commissionTotal += Number(c.commission_total || 0);
    acc.missingCommission += c.missing_commission ? 1 : 0;
    return acc;
  }, { serviceTotal: 0, commissionTotal: 0, missingCommission: 0 });
  return {
    rowCount: totalItems,
    summary: [
      { label: 'Tổng khách được giới thiệu', value: totalItems },
      { label: 'Nha khoa', value: byLob.dental || 0 },
      { label: 'Thẩm mỹ', value: byLob.cosmetic || 0 },
      { label: 'Tổng doanh thu dịch vụ', value: totals.serviceTotal },
      { label: 'Tổng COM CTV', value: totals.commissionTotal },
      { label: 'Dòng thiếu COM', value: totals.missingCommission },
    ],
  };
}

async function build(filters, user) {
  const { items } = await fetchAll(filters);

  const workbook = createWorkbook('Khách hàng mới', {
    exportedBy: user?.name || user?.email || '',
    filters: [
      { label: 'Lĩnh vực', value: filters.lob && filters.lob !== 'all' ? (LOB_LABELS[filters.lob] || filters.lob) : 'Tất cả' },
      { label: 'Từ ngày', value: filters.dateFrom || 'Tất cả' },
      { label: 'Đến ngày', value: filters.dateTo || 'Tất cả' },
    ],
  });

  const dataRows = items.map((c) => ({
    name: c.name || '',
    phone: c.phone || '',
    ctvName: c.referring_ctv_name || '',
    ctvPhone: c.referring_ctv_phone || '',
    lob: LOB_LABELS[c.lob] || c.lob,
    referredAt: c.referred_at ? toVNDate(c.referred_at) : null,
    serviceCount: c.service_count || 0,
    serviceTotal: c.service_total || 0,
    paidTotal: c.paid_total || 0,
    commissionTotal: c.commission_total || 0,
    commissionStatus: statusLabel(c.commission_status),
  }));

  populateDataSheet(workbook.getWorksheet('Data'), COLUMNS, dataRows);
  populateSummarySheet(workbook.getWorksheet('Summary'), [
    { label: 'Tổng khách được giới thiệu', value: items.length },
    { label: 'Tổng doanh thu dịch vụ', value: items.reduce((sum, c) => sum + Number(c.service_total || 0), 0) },
    { label: 'Tổng COM CTV', value: items.reduce((sum, c) => sum + Number(c.commission_total || 0), 0) },
    { label: 'Dòng thiếu COM', value: items.filter((c) => c.missing_commission).length },
  ]);

  return { workbook, rowCount: dataRows.length };
}

function statusLabel(status) {
  if (status === 'commission_recorded') return 'Đã ghi nhận COM';
  if (status === 'missing_commission') return 'Thiếu COM';
  return 'Chưa chuyển đổi';
}

module.exports = { preview, build };
