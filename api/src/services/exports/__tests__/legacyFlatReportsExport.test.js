'use strict';

jest.mock('../../../db', () => ({
  query: jest.fn(),
}));

const { query } = require('../../../db');
const legacyFlatReportsExport = require('../builders/legacyFlatReportsExport');
const { getExportType } = require('../exportRegistry');

const USER = {
  employeeId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  name: 'Admin',
};

const LOC_A = '11111111-1111-4111-8111-111111111111';
const DOCTOR_ID = '22222222-2222-4222-8222-222222222222';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('legacyFlatReportsExport', () => {
  it('registers the flat report export filenames', () => {
    expect(getExportType('revenue-flat')).toMatchObject({
      label: 'Báo cáo doanh thu',
      permission: 'payments.export',
    });
    expect(getExportType('deposit-flat')).toMatchObject({
      label: 'Báo cáo cọc tiền',
      permission: 'payments.export',
    });
    expect(getExportType('revenue-flat').filename()).toMatch(/^BaoCaoDoanhThu_\d{8}_\d{4}\.xlsx$/);
    expect(getExportType('deposit-flat').filename()).toMatch(/^BaoCaoCocTien_\d{8}_\d{4}\.xlsx$/);
  });

  it('builds the revenue workbook with the exact flat legacy template', async () => {
    query.mockResolvedValueOnce([
      {
        companyname: 'Tấm Dentist Quận 3',
        partnercode: 'T8250',
        partnername: 'Nguyễn Văn A',
        partnerdisplayname: 'Nguyễn Văn A',
        partnerphone: '0909000000',
        saleordername: 'SO001',
        paymentdate: '2026-05-09',
        row_amount: '1000000',
        row_cash_amount: '600000',
        row_bank_amount: '300000',
        row_deposit_used: '100000',
        salestaffname: 'Sale Online A',
        cskhname: 'CSKH B',
        doctorname: 'Bác sĩ C',
        assistantname: 'Phụ tá D',
        dentalaidename: 'Trợ lý E',
      },
    ]);

    const result = await legacyFlatReportsExport.revenue.build({
      companyId: LOC_A,
      dateFrom: '2026-05-09',
      dateTo: '2026-05-09',
    }, USER);

    expect(result.rowCount).toBe(1);
    expect(result.workbook.worksheets.map((sheet) => sheet.name)).toEqual(['Sheet1']);

    const sheet = result.workbook.getWorksheet('Sheet1');
    expect(sheet.getRow(1).values.slice(1)).toEqual([
      'Cơ sở',
      'Mã Khách hàng',
      'Tên khách hàng',
      'Số điện thoại',
      'Phiếu khám',
      'Ngày thanh toán',
      'Số tiền',
      'Tiền mặt',
      'Chuyển khoản',
      'Tiền cọc',
      'Sale online',
      'CSKH',
      'Bác sĩ',
      'Phụ tá',
      'Trợ lý bác sĩ',
    ]);
    expect(sheet.getColumn(1).width).toBe(13);
    expect(sheet.getColumn(2).width).toBe(16);
    expect(sheet.getColumn(6).width).toBe(18.19921875);
    expect(sheet.autoFilter).toBeNull();
    expect(sheet.views).toEqual([]);

    expect(sheet.getCell('A2').value).toBe('Tấm Dentist Quận 3');
    expect(sheet.getCell('B2').value).toBe('T8250');
    expect(sheet.getCell('C2').value).toBe('Nguyễn Văn A');
    expect(sheet.getCell('E2').value).toBe('SO001');
    expect(sheet.getCell('F2').value).toEqual(new Date(Date.UTC(2026, 4, 9)));
    expect(sheet.getCell('G2').value).toBe(1000000);
    expect(sheet.getCell('H2').value).toBe(600000);
    expect(sheet.getCell('I2').value).toBe(300000);
    expect(sheet.getCell('J2').value).toBe(100000);
    expect(sheet.getCell('K2').value).toBe('Sale Online A');
    expect(sheet.getCell('L2').value).toBe('CSKH B');
    expect(sheet.getCell('M2').value).toBe('Bác sĩ C');
    expect(sheet.getCell('N2').value).toBe('Phụ tá D');
    expect(sheet.getCell('O2').value).toBe('Trợ lý E');
  });

  it('previews revenue with posted service payment filters and allocation proration SQL', async () => {
    query.mockResolvedValueOnce([{ total: '2', total_amount: '1500000' }]);

    const preview = await legacyFlatReportsExport.revenue.preview({
      companyId: LOC_A,
      doctorId: DOCTOR_ID,
      dateFrom: '2026-05-09',
      dateTo: '2026-05-09',
      timeFrom: '08:00',
      timeTo: '17:30',
    }, USER);

    expect(preview).toMatchObject({
      rowCount: 2,
      exceedsMax: false,
      summary: [
        { label: 'Tổng dòng', value: 2 },
        { label: 'Tổng tiền', value: 1500000 },
      ],
    });

    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain("p.status = 'posted'");
    expect(sql).toContain('pa.invoice_id IS NOT NULL');
    expect(sql).toContain("COALESCE(p.payment_category, 'payment') = 'payment'");
    expect(sql).toContain("COALESCE(p.deposit_type, '') NOT IN ('deposit', 'refund', 'usage')");
    expect(sql).toContain('pa.allocated_amount * p.amount / at.total_allocated_for_payment');
    expect(sql).toContain('so.companyid = $5');
    expect(sql).toContain('so.doctorid = $6');
    expect(params).toEqual(['2026-05-09', '2026-05-09', '08:00', '17:30', LOC_A, DOCTOR_ID]);
  });

  it('builds the deposit workbook with the exact flat legacy template', async () => {
    query.mockResolvedValueOnce([
      {
        companyname: 'Tấm Dentist Gò Vấp',
        partnercode: 'T9000',
        partnername: 'Trần Thị B',
        partnerdisplayname: 'Trần Thị B',
        partnerphone: '0909111111',
        paymentdate: '2026-05-09',
        amount: '2000000',
        cash_amount: '500000',
        bank_amount: '1500000',
        salestaffname: 'Sale Online C',
        cskhname: 'CSKH D',
      },
    ]);

    const result = await legacyFlatReportsExport.deposit.build({
      companyId: 'all',
      dateFrom: '2026-05-09',
      dateTo: '2026-05-09',
    }, USER);

    expect(result.rowCount).toBe(1);
    const sheet = result.workbook.getWorksheet('Sheet1');
    expect(result.workbook.worksheets.map((worksheet) => worksheet.name)).toEqual(['Sheet1']);
    expect(sheet.getRow(1).values.slice(1)).toEqual([
      'Cơ sở',
      'Mã Khách hàng',
      'Tên khách hàng',
      'Số điện thoại',
      'Ngày cọc',
      'Số tiền cọc',
      'Tiền mặt',
      'Chuyển khoản',
      'Sale online',
      'CSKH',
    ]);
    expect(sheet.getColumn(5).width).toBe(12.796875);
    expect(sheet.getCell('A2').value).toBe('Tấm Dentist Gò Vấp');
    expect(sheet.getCell('E2').value).toEqual(new Date(Date.UTC(2026, 4, 9)));
    expect(sheet.getCell('F2').value).toBe(2000000);
    expect(sheet.getCell('G2').value).toBe(500000);
    expect(sheet.getCell('H2').value).toBe(1500000);
    expect(sheet.getCell('I2').value).toBe('Sale Online C');
    expect(sheet.getCell('J2').value).toBe('CSKH D');
  });

  it('previews deposit top-ups only', async () => {
    query.mockResolvedValueOnce([{ total: '1', total_amount: '2000000' }]);

    await legacyFlatReportsExport.deposit.preview({
      companyId: LOC_A,
      dateFrom: '2026-05-09',
      dateTo: '2026-05-09',
      timeFrom: '08:00',
      timeTo: '17:30',
    }, USER);

    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain("p.status = 'posted'");
    expect(sql).toContain("p.payment_category = 'deposit'");
    expect(sql).toContain("p.deposit_type = 'deposit'");
    expect(sql).not.toContain('pa.invoice_id IS NOT NULL');
    expect(sql).toContain('COALESCE(p.companyid, pr.companyid) = $5');
    expect(params).toEqual(['2026-05-09', '2026-05-09', '08:00', '17:30', LOC_A]);
  });

  it('throws EXPORT_ROW_LIMIT_EXCEEDED when the flat export exceeds the row limit', async () => {
    query.mockResolvedValueOnce(Array(legacyFlatReportsExport.MAX_ROWS + 1).fill({}));

    await expect(
      legacyFlatReportsExport.deposit.build({ companyId: 'all' }, USER)
    ).rejects.toMatchObject({ code: 'EXPORT_ROW_LIMIT_EXCEEDED' });
  });
});
