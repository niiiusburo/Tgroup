'use strict';

const { createWorkbook, populateDataSheet, populateSummarySheet } = require('./exportWorkbook');

const MAX_ROWS = 100_000;

/**
 * Factory for creating standard export builders.
 *
 * Each builder shares the same orchestration (preview / build / row-limit guard)
 * but supplies its own SQL, column layout, and data mapping.
 *
 * @param {object} config
 * @param {Array} config.columns - Column definitions for the Data sheet
 * @param {function} config.buildWhere - (filters) => { where, params }
 * @param {function} config.getRows - (filters) => Promise<Array>
 * @param {function} config.getSummary - (filters) => Promise<Object>
 * @param {function} config.toDataRow - (dbRow) => data-sheet row object
 * @param {function} config.getWorkbookLabel - (filters) => string
 * @param {function} config.getFilterMeta - (filters) => Array<{label, value}>
 * @param {function} config.getSummaryRows - (summary) => Array<{label, value}>
 */
function createExportBuilder(config) {
  async function preview(filters) {
    const summary = await config.getSummary(filters);
    const total = parseInt(summary.total, 10);
    return {
      rowCount: total,
      summary: config.getSummaryRows(summary),
      exceedsMax: total > MAX_ROWS,
    };
  }

  async function build(filters, user) {
    const [rows, summary] = await Promise.all([
      config.getRows(filters),
      config.getSummary(filters),
    ]);

    if (rows.length > MAX_ROWS) {
      const err = new Error(
        `Kết quả vượt quá ${MAX_ROWS.toLocaleString('vi-VN')} dòng. Vui lòng thu hẹp bộ lọc.`
      );
      err.code = 'EXPORT_ROW_LIMIT_EXCEEDED';
      throw err;
    }

    const workbook = createWorkbook(config.getWorkbookLabel(filters), {
      exportedBy: user?.name || user?.email || '',
      filters: config.getFilterMeta(filters),
    });

    const dataRows = rows.map(config.toDataRow);
    populateDataSheet(workbook.getWorksheet('Data'), config.columns, dataRows);
    populateSummarySheet(workbook.getWorksheet('Summary'), config.getSummaryRows(summary));

    return { workbook, rowCount: dataRows.length };
  }

  return { preview, build, MAX_ROWS };
}

module.exports = { createExportBuilder, MAX_ROWS };
