'use strict';

const { buildFilename } = require('./exportWorkbook');
const serviceCatalogExport = require('./builders/serviceCatalogExport');
const customersExport = require('./builders/customersExport');
const appointmentsExport = require('./builders/appointmentsExport');
const servicesExport = require('./builders/servicesExport');
const paymentsExport = require('./builders/paymentsExport');

/**
 * Export Registry
 * Maps export type keys to their builders, permissions, labels, and filename generators.
 * Each builder must expose:
 *   - preview(filters, user): Promise<{ rowCount, summary: [{label, value}] }>
 *   - build(filters, user): Promise<{ workbook, filename }>
 */
const REGISTRY = {
  'service-catalog': {
    label: 'Danh mục dịch vụ',
    permission: 'products.export',
    filename: () => buildFilename('DichVu'),
    builder: serviceCatalogExport,
    filterSchema: {
      search: { type: 'string', default: '' },
      companyId: { type: 'string', default: 'all' },
      categId: { type: 'string', default: '' },
      active: { type: 'string', default: 'true' },
    },
  },
  'customers': {
    label: 'Danh sách khách hàng',
    permission: 'customers.export',
    filename: () => buildFilename('KhachHang'),
    builder: customersExport,
    filterSchema: {
      search: { type: 'string', default: '' },
      companyId: { type: 'string', default: 'all' },
      status: { type: 'string', default: 'all' },
    },
  },
  'appointments': {
    label: 'Danh sách lịch hẹn',
    permission: 'appointments.export',
    filename: () => buildFilename('LichHen'),
    builder: appointmentsExport,
    filterSchema: {
      search: { type: 'string', default: '' },
      companyId: { type: 'string', default: 'all' },
      dateFrom: { type: 'string', default: '' },
      dateTo: { type: 'string', default: '' },
      state: { type: 'string', default: '' },
      doctorId: { type: 'string', default: '' },
    },
  },
  'services': {
    label: 'Phiếu điều trị',
    permission: 'services.export',
    filename: () => buildFilename('PhieuDieuTri'),
    builder: servicesExport,
    filterSchema: {
      search: { type: 'string', default: '' },
      companyId: { type: 'string', default: 'all' },
      dateFrom: { type: 'string', default: '' },
      dateTo: { type: 'string', default: '' },
      state: { type: 'string', default: '' },
    },
  },
  'payments': {
    label: 'Danh sách thanh toán',
    permission: 'payments.export',
    filename: () => buildFilename('ThanhToan'),
    builder: paymentsExport,
    filterSchema: {
      search: { type: 'string', default: '' },
      companyId: { type: 'string', default: 'all' },
      dateFrom: { type: 'string', default: '' },
      dateTo: { type: 'string', default: '' },
      status: { type: 'string', default: '' },
    },
  },
};

function getExportType(type) {
  const entry = REGISTRY[type];
  if (!entry) {
    const valid = Object.keys(REGISTRY).join(', ');
    throw new Error(`Unknown export type "${type}". Valid: ${valid}`);
  }
  return entry;
}

function listExportTypes() {
  return Object.entries(REGISTRY).map(([key, val]) => ({
    key,
    label: val.label,
    permission: val.permission,
  }));
}

function sanitizeFilters(type, rawFilters = {}) {
  const entry = getExportType(type);
  const sanitized = {};
  Object.entries(entry.filterSchema).forEach(([key, schema]) => {
    const raw = rawFilters[key];
    if (raw === undefined || raw === null) {
      sanitized[key] = schema.default;
      return;
    }
    if (schema.type === 'string') {
      sanitized[key] = String(raw);
    } else if (schema.type === 'number') {
      const n = Number(raw);
      sanitized[key] = Number.isNaN(n) ? schema.default : n;
    } else if (schema.type === 'boolean') {
      sanitized[key] = raw === true || raw === 'true';
    } else {
      sanitized[key] = raw;
    }
  });
  return sanitized;
}

module.exports = {
  getExportType,
  listExportTypes,
  sanitizeFilters,
};
