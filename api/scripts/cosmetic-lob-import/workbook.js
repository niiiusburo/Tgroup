const ExcelJS = require('exceljs');
const {
  REQUIRED_SHEETS,
  buildSourceRef,
  canonicalBranch,
  clean,
  mapPaymentMethod,
  normalizePhone,
  normalizeText,
  numberValue,
  parseDate,
} = require('./normalizers');

function getCellByHeader(row, headerIndex, aliases) {
  for (const alias of aliases) {
    const index = headerIndex.get(normalizeText(alias));
    if (index !== undefined) {
      const value = row.getCell(index).value;
      if (clean(value) !== '') return value;
    }
  }
  return '';
}

function rowsFromWorksheet(worksheet) {
  const headers = worksheet.getRow(1).values.slice(1).map(clean);
  const headerIndex = new Map(headers.map((header, index) => [normalizeText(header), index + 1]));
  const rows = [];
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const hasValue = headers.some((_, index) => clean(row.getCell(index + 1).value) !== '');
    if (!hasValue) continue;
    rows.push({ rowNumber, row, headerIndex });
  }
  return { headers, rows };
}

function validateWorkbookSheets(workbook) {
  const names = workbook.worksheets.map((sheet) => sheet.name);
  const missing = REQUIRED_SHEETS.filter((name) => !names.includes(name));
  const extra = names.filter((name) => !REQUIRED_SHEETS.includes(name));
  if (missing.length > 0 || extra.length > 0) {
    throw new Error(`Cosmetic workbook must contain exactly these 3 tabs: ${REQUIRED_SHEETS.join(', ')}. Missing: ${missing.join(', ') || 'none'}. Extra: ${extra.join(', ') || 'none'}.`);
  }
}

function normalizeProfileEntry(entry) {
  const { row, headerIndex, rowNumber } = entry;
  return {
    sheet: 'Hồ sơ',
    rowNumber,
    intakeDate: parseDate(getCellByHeader(row, headerIndex, ['Ngày nhập'])),
    name: clean(getCellByHeader(row, headerIndex, ['Họ và tên'])),
    phone: normalizePhone(getCellByHeader(row, headerIndex, ['Số điện thoại', 'SĐT'])),
    branchName: canonicalBranch(getCellByHeader(row, headerIndex, ['Cơ sở', 'Cơ Sở'])),
    saleOnlineName: clean(getCellByHeader(row, headerIndex, ['Sale online'])),
    referralText: clean(getCellByHeader(row, headerIndex, ['Người giới thiệu'])),
    note: clean(getCellByHeader(row, headerIndex, ['Note'])),
  };
}

function normalizeDepositEntry(entry) {
  const { row, headerIndex, rowNumber } = entry;
  const amount = numberValue(getCellByHeader(row, headerIndex, ['Số tiền cọc']));
  const date = parseDate(getCellByHeader(row, headerIndex, ['Ngày cọc']));
  const phone = normalizePhone(getCellByHeader(row, headerIndex, ['SĐT', 'Số điện thoại']));
  return {
    sheet: 'Phiếu cọc',
    rowNumber,
    depositDate: date,
    phone,
    amount,
    method: mapPaymentMethod(getCellByHeader(row, headerIndex, ['Hình thức'])),
    note: clean(getCellByHeader(row, headerIndex, ['Ghi chú cọc'])),
    referenceCode: buildSourceRef('PHIEU_COC', rowNumber, phone, date, amount),
  };
}

function normalizeExamEntry(entry) {
  const { row, headerIndex, rowNumber } = entry;
  const serviceDate = parseDate(getCellByHeader(row, headerIndex, ['Ngày làm']));
  const paymentDate = parseDate(getCellByHeader(row, headerIndex, ['Ngày thanh toán'])) || serviceDate;
  const phone = normalizePhone(getCellByHeader(row, headerIndex, ['Số điện thoại', 'SĐT']));
  const serviceName = clean(getCellByHeader(row, headerIndex, ['Dịch vụ']));
  const serviceAmount = numberValue(getCellByHeader(row, headerIndex, ['Số tiền']));
  const paidAmount = numberValue(getCellByHeader(row, headerIndex, ['Đã thanh toán']));
  return {
    sheet: 'Phiếu khám',
    rowNumber,
    serviceDate,
    phone,
    branchName: canonicalBranch(getCellByHeader(row, headerIndex, ['Cơ Sở', 'Cơ sở'])),
    serviceName,
    serviceAmount,
    paidAmount,
    paymentDate,
    method: mapPaymentMethod(getCellByHeader(row, headerIndex, ['Hình thức thanh toán'])),
    doctorName: clean(getCellByHeader(row, headerIndex, ['Bác sĩ'])),
    assistantName: clean(getCellByHeader(row, headerIndex, ['Trợ lý bác sĩ', 'Phụ tá'])),
    note: clean(getCellByHeader(row, headerIndex, ['Note phiếu khám', 'Note'])),
    orderCode: buildSourceRef('PHIEU_KHAM_ORDER', rowNumber, phone, serviceDate, serviceAmount),
    paymentReferenceCode: buildSourceRef('PHIEU_KHAM_PAYMENT', rowNumber, phone, paymentDate, paidAmount),
  };
}

async function readCosmeticWorkbook(file) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(file);
  validateWorkbookSheets(workbook);

  const profileSheet = rowsFromWorksheet(workbook.getWorksheet('Hồ sơ'));
  const depositSheet = rowsFromWorksheet(workbook.getWorksheet('Phiếu cọc'));
  const examSheet = rowsFromWorksheet(workbook.getWorksheet('Phiếu khám'));

  return {
    tabs: [
      { name: 'Hồ sơ', rows: profileSheet.rows.length, columns: profileSheet.headers },
      { name: 'Phiếu cọc', rows: depositSheet.rows.length, columns: depositSheet.headers },
      { name: 'Phiếu khám', rows: examSheet.rows.length, columns: examSheet.headers },
    ],
    profiles: profileSheet.rows.map(normalizeProfileEntry),
    deposits: depositSheet.rows.map(normalizeDepositEntry),
    exams: examSheet.rows.map(normalizeExamEntry),
  };
}

module.exports = {
  readCosmeticWorkbook,
  validateWorkbookSheets,
};
