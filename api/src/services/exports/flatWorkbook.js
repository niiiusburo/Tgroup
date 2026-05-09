'use strict';

const ExcelJS = require('exceljs');

function sanitizeValue(value) {
  if (typeof value !== 'string') return value;
  return /^[\t\r\n]*[=+\-@]/.test(value.trim()) ? `'${value}` : value;
}

function createFlatWorkbook(columns, rows, meta = {}) {
  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.creator = meta.exportedBy || 'TGClinic';

  const worksheet = workbook.addWorksheet('Sheet1');
  worksheet.columns = columns.map((column) => ({
    header: column.header,
    key: column.key,
    width: column.width,
  }));

  rows.forEach((rowData) => {
    const row = worksheet.addRow(rowData);
    row.eachCell((cell, colNumber) => {
      const column = columns[colNumber - 1];
      if (cell.value !== null && cell.value !== undefined) {
        cell.value = sanitizeValue(cell.value);
      }
      if (column?.style === 'date') {
        cell.numFmt = 'dd/mm/yyyy';
      }
      if (column?.style === 'vnd') {
        cell.numFmt = '#,##0';
      }
    });
  });

  return workbook;
}

module.exports = {
  createFlatWorkbook,
};
