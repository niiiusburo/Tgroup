'use strict';

const ExcelJS = require('exceljs');

const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF97316' } };
const HEADER_FONT = { bold: true, color: { argb: 'FFFFFFFF' } };
const BORDER_STYLE = { style: 'thin', color: { argb: 'FFE5E7EB' } };
const DATE_FORMAT = 'dd/mm/yyyy';
const DATETIME_FORMAT = 'dd/mm/yyyy hh:mm';
const VN_TIMEZONE = 'Asia/Ho_Chi_Minh';

/**
 * Normalize a database date value for consistent Excel export display.
 *
 * PostgreSQL timestamp (without timezone) values are parsed by node-pg
 * using the Node.js process local timezone. This means `new Date()` on
 * the same database value produces different results on a UTC server vs
 * a Vietnam server vs an American server.
 *
 * This function extracts the wall-clock components that pg interpreted
 * and builds a new Date object treating those exact components as UTC.
 * The resulting Date always serialises to the same Excel serial number,
 * so the exported file shows the same time regardless of where the API
 * server is running.
 *
 * @param {string|Date|null|undefined} dateValue
 * @returns {Date|null}
 */
function toVNDate(dateValue) {
  if (!dateValue) return null;

  // Plain YYYY-MM-DD strings (from our custom pg DATE parser) — treat as midnight UTC
  if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    const [year, month, day] = dateValue.split('-').map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (
      parsed.getUTCFullYear() !== year ||
      parsed.getUTCMonth() !== month - 1 ||
      parsed.getUTCDate() !== day
    ) {
      return null;
    }
    return parsed;
  }

  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return null;

  // Extract wall-clock components as interpreted in the server local TZ
  const year = d.getFullYear();
  const month = d.getMonth();
  const day = d.getDate();
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const seconds = d.getSeconds();

  // Re-build as UTC so Excel stores the exact intended wall-clock time
  return new Date(Date.UTC(year, month, day, hours, minutes, seconds));
}

function getDateTimeParts(date, timezone) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value ?? '00';
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute'), second: get('second') };
}

/**
 * Create a new workbook with the standard 3-sheet structure.
 * @param {string} label - Human-readable export label (for Filters sheet)
 * @param {object} meta - { exportedBy, filters: [{label, value}] }
 */
function createWorkbook(label, meta = {}) {
  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.creator = meta.exportedBy || 'TGClinic';

  workbook.addWorksheet('Data');
  workbook.addWorksheet('Summary');
  workbook.addWorksheet('Filters');

  populateFiltersSheet(workbook.getWorksheet('Filters'), label, meta);
  return workbook;
}

function populateFiltersSheet(worksheet, label, meta) {
  worksheet.columns = [
    { header: 'Thuộc tính', key: 'key', width: 24 },
    { header: 'Giá trị', key: 'value', width: 48 },
  ];

  const rows = [
    { key: 'Loại xuất', value: label },
    { key: 'Xuất lúc', value: formatDateTimeVN(new Date()) },
    { key: 'Xuất bởi', value: meta.exportedBy || '' },
  ];

  if (meta.filters && meta.filters.length > 0) {
    meta.filters.forEach((f) => rows.push({ key: f.label, value: f.value }));
  }

  rows.forEach((r, idx) => {
    const row = worksheet.addRow(r);
    if (idx === 0) {
      row.font = { bold: true };
    }
  });
}

function formatDateTimeVN(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const p = getDateTimeParts(d, VN_TIMEZONE);
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
}

/**
 * Populate the Data sheet with columns and rows.
 * @param {ExcelJS.Worksheet} worksheet
 * @param {Array<{key:string, header:string, width?:number, style?:object}>} columns
 * @param {Array<object>} rows
 */
function populateDataSheet(worksheet, columns, rows) {
  worksheet.columns = columns.map((col) => ({
    header: col.header,
    key: col.key,
    width: col.width || 18,
  }));

  // Header styling
  const headerRow = worksheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.border = {
      bottom: BORDER_STYLE,
    };
  });
  headerRow.alignment = { vertical: 'middle', wrapText: true };

  // Freeze header
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];

  // Add rows
  rows.forEach((rowData) => {
    const row = worksheet.addRow(rowData);
    row.eachCell((cell, colNumber) => {
      const colDef = columns[colNumber - 1];
      if (!colDef) return;

      // Number formatting for VND
      if (colDef.style === 'vnd') {
        cell.numFmt = '#,##0';
      }
      if (colDef.style === 'date') {
        cell.numFmt = DATE_FORMAT;
      }
      if (colDef.style === 'datetime') {
        cell.numFmt = DATETIME_FORMAT;
      }

      // Sanitize formula injection
      if (cell.value && typeof cell.value === 'string') {
        const trimmed = cell.value.trim();
        if (/^[=+\-@]/.test(trimmed)) {
          cell.value = `'${cell.value}`;
        }
      }
    });
  });

  // Auto-filter
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length },
  };
}

/**
 * Populate the Summary sheet with key-value pairs.
 * @param {ExcelJS.Worksheet} worksheet
 * @param {Array<{label:string, value:string|number}>} summaryRows
 */
function populateSummarySheet(worksheet, summaryRows) {
  worksheet.columns = [
    { header: 'Chỉ tiêu', key: 'label', width: 32 },
    { header: 'Giá trị', key: 'value', width: 24 },
  ];

  const headerRow = worksheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
  });

  summaryRows.forEach((r) => {
    const row = worksheet.addRow(r);
    if (typeof r.value === 'number') {
      row.getCell(2).numFmt = '#,##0';
    }
  });
}

/**
 * Generate filename with timestamp suffix.
 * @param {string} prefix - e.g. 'DichVu'
 */
function buildFilename(prefix) {
  const p = getDateTimeParts(new Date(), VN_TIMEZONE);
  const ts = `${p.year}${p.month}${p.day}_${p.hour}${p.minute}`;
  return `${prefix}_${ts}.xlsx`;
}

module.exports = {
  createWorkbook,
  populateDataSheet,
  populateSummarySheet,
  buildFilename,
  formatDateTimeVN,
  toVNDate,
};
