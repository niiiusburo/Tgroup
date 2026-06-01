'use strict';

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
  return {
    rowCount: totalItems,
    summary: [
      { label: 'Tổng khách hàng mới', value: totalItems },
      { label: 'Nha khoa', value: byLob.dental || 0 },
      { label: 'Thẩm mỹ', value: byLob.cosmetic || 0 },
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
  }));

  populateDataSheet(workbook.getWorksheet('Data'), COLUMNS, dataRows);
  populateSummarySheet(workbook.getWorksheet('Summary'), [
    { label: 'Tổng khách hàng mới', value: items.length },
  ]);

  return { workbook, rowCount: dataRows.length };
}

module.exports = { preview, build };
