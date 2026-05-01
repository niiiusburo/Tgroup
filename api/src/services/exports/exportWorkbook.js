'use strict';

const ExcelJS = require('exceljs');

const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF97316' } };
const HEADER_FONT = { bold: true, color: { argb: 'FFFFFFFF' } };
const BORDER_STYLE = { style: 'thin', color: { argb: 'FFE5E7EB' } };
const DATE_FORMAT = 'dd/mm/yyyy';
const DATETIME_FORMAT = 'dd/mm/yyyy hh:mm';

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
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
  return `${prefix}_${ts}.xlsx`;
}

module.exports = {
  createWorkbook,
  populateDataSheet,
  populateSummarySheet,
  buildFilename,
  formatDateTimeVN,
};
