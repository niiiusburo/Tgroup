const ExcelJS = require('exceljs');
const {
  buildCosmeticImportPlan,
  canonicalBranch,
  mapPaymentMethod,
  normalizePhone,
  normalizeText,
  parseArgs,
  resolveProjectPath,
  validateWorkbookSheets,
} = require('../scripts/cosmetic-lob-import');

function snapshot(overrides = {}) {
  return {
    companyByName: new Map(),
    customersByPhone: new Map(),
    staffByName: new Map(),
    productsByName: new Map(),
    paymentRefs: new Set(),
    orderCodes: new Set(),
    ...overrides,
  };
}

describe('cosmetic LOB import dry-run helpers', () => {
  it('requires the exact three source workbook tabs', () => {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet('Hồ sơ');
    workbook.addWorksheet('Phiếu cọc');
    workbook.addWorksheet('Phiếu khám');

    expect(() => validateWorkbookSheets(workbook)).not.toThrow();

    workbook.addWorksheet('Extra');
    expect(() => validateWorkbookSheets(workbook)).toThrow('exactly these 3 tabs');
  });

  it('normalizes Google Sheets phone, branch, and payment method values', () => {
    expect(normalizePhone(303015032)).toBe('0303015032');
    expect(normalizePhone('84 912 345 678')).toBe('0912345678');
    expect(canonicalBranch('Hà Nội -Thẩm mỹ')).toBe('Thẩm mỹ Hà Nội');
    expect(canonicalBranch('Hồ Chí Minh -Thẩm mỹ')).toBe('Thẩm mỹ Hồ Chí Minh');
    expect(mapPaymentMethod('Chuyển khoản')).toBe('bank_transfer');
  });

  it('plans the three tabs into cosmetic clients, deposits, treatments, and payments', () => {
    const source = {
      tabs: [
        { name: 'Hồ sơ', rows: 1, columns: [] },
        { name: 'Phiếu cọc', rows: 1, columns: [] },
        { name: 'Phiếu khám', rows: 1, columns: [] },
      ],
      profiles: [{
        sheet: 'Hồ sơ',
        rowNumber: 2,
        intakeDate: '2025-05-30',
        name: 'Nguyễn Thị A',
        phone: '0901234567',
        branchName: 'Thẩm mỹ Hà Nội',
        saleOnlineName: 'SALE A',
        referralText: '',
        note: 'Lead note',
      }],
      deposits: [{
        sheet: 'Phiếu cọc',
        rowNumber: 2,
        depositDate: '2025-05-30',
        phone: '0901234567',
        amount: 1000000,
        method: 'bank_transfer',
        note: 'Cọc 1tr',
        referenceCode: 'COSMETIC_SHEET:PHIEU_COC:2:test',
      }],
      exams: [{
        sheet: 'Phiếu khám',
        rowNumber: 2,
        serviceDate: '2025-06-01',
        phone: '0901234567',
        branchName: 'Thẩm mỹ Hà Nội',
        serviceName: 'Cắt mí Line Mini',
        serviceAmount: 15000000,
        paidAmount: 15000000,
        paymentDate: '2025-06-01',
        method: 'bank_transfer',
        doctorName: 'BS 8',
        assistantName: 'NGANOT',
        note: '',
        orderCode: 'COSMETIC_SHEET:PHIEU_KHAM_ORDER:2:test',
        paymentReferenceCode: 'COSMETIC_SHEET:PHIEU_KHAM_PAYMENT:2:test',
      }],
    };

    const plan = buildCosmeticImportPlan(source, snapshot());

    expect(plan.summary).toMatchObject({
      companies: { create: 1 },
      staff: { create: 3 },
      products: { create: 1 },
      customers: { create: 1, updateFromProfile: 0 },
      deposits: { create: 1, skipExisting: 0, manualReview: 0 },
      treatments: { create: 1, skipExisting: 0, manualReview: 0 },
      payments: { create: 1, skipExisting: 0 },
      anomalies: 0,
    });
    expect(plan.fieldMapping['Phiếu khám']).toContain('saleorders');
  });

  it('keeps ambiguous money rows in manual review instead of guessing a customer', () => {
    const source = {
      tabs: [],
      profiles: [],
      deposits: [{
        sheet: 'Phiếu cọc',
        rowNumber: 7,
        depositDate: '2025-05-30',
        phone: '0909999999',
        amount: 500000,
        method: 'bank_transfer',
        note: '',
        referenceCode: 'COSMETIC_SHEET:PHIEU_COC:7:test',
      }],
      exams: [{
        sheet: 'Phiếu khám',
        rowNumber: 8,
        serviceDate: '2025-06-01',
        phone: '0909999999',
        branchName: 'Thẩm mỹ Hồ Chí Minh',
        serviceName: 'Combo',
        serviceAmount: 1000000,
        paidAmount: 1000000,
        paymentDate: '2025-06-01',
        method: 'bank_transfer',
        doctorName: '',
        assistantName: '',
        note: '',
        orderCode: 'COSMETIC_SHEET:PHIEU_KHAM_ORDER:8:test',
        paymentReferenceCode: 'COSMETIC_SHEET:PHIEU_KHAM_PAYMENT:8:test',
      }],
    };

    const plan = buildCosmeticImportPlan(source, snapshot({
      companyByName: new Map([[normalizeText('Thẩm mỹ Hồ Chí Minh'), { id: 'company-hcm', name: 'Thẩm mỹ Hồ Chí Minh' }]]),
    }));

    expect(plan.summary.deposits.manualReview).toBe(1);
    expect(plan.summary.treatments.manualReview).toBe(1);
    expect(plan.summary.anomalies).toBe(2);
    expect(plan.anomalies.map((item) => item.code)).toEqual([
      'deposit_needs_manual_customer_match',
      'exam_needs_manual_customer_or_service_match',
    ]);
  });

  it('requires an explicit dry-run or apply mode', () => {
    expect(() => parseArgs(['--workbook', 'source.xlsx'])).toThrow('Choose --dry-run or --apply');
    expect(parseArgs(['--workbook', 'source.xlsx', '--apply', '--allow-manual-review'])).toMatchObject({
      apply: true,
      allowManualReview: true,
    });
    expect(() => parseArgs(['--workbook', 'source.xlsx', '--dry-run', '--apply'])).toThrow('Choose only one mode');
  });

  it('keeps audit output paths inside the project workspace', () => {
    expect(resolveProjectPath('artifacts/cosmetic-lob-import', 'audit-dir')).toContain('artifacts');
    expect(() => resolveProjectPath('/tmp/out', 'audit-dir')).toThrow('relative path');
    expect(() => resolveProjectPath('../out', 'audit-dir')).toThrow('traversal');
  });
});
