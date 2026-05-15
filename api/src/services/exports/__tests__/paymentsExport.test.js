'use strict';

jest.mock('../../../db', () => ({
  query: jest.fn(),
}));

const { query } = require('../../../db');
const paymentsExport = require('../builders/paymentsExport');

const USER = {
  employeeId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  name: 'Admin',
};

const LOC_A = '11111111-1111-4111-8111-111111111111';
const DOCTOR_ID = '22222222-2222-4222-8222-222222222222';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('paymentsExport report filters', () => {
  it('previews service payments with date, time, location, and doctor filters', async () => {
    query.mockResolvedValueOnce([{
      total: '3',
      posted_count: '2',
      voided_count: '1',
      draft_count: '0',
      total_amount: '1500000',
      cash_amount: '500000',
      bank_amount: '1000000',
      deposit_used: '0',
    }]);

    const preview = await paymentsExport.preview({
      paymentCategory: 'payment',
      companyId: LOC_A,
      doctorId: DOCTOR_ID,
      dateFrom: '2026-05-09',
      dateTo: '2026-05-09',
      timeFrom: '08:00',
      timeTo: '17:30',
      status: 'posted',
    }, USER);

    expect(preview).toMatchObject({
      rowCount: 3,
      exceedsMax: false,
      summary: expect.arrayContaining([
        { label: 'Tổng phiếu thu', value: 3 },
        { label: 'Tổng tiền (đã ghi sổ)', value: 1500000 },
      ]),
    });

    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain("COALESCE(p.payment_date, p.created_at::date) >= $1");
    expect(sql).toContain("COALESCE(p.payment_date, p.created_at::date) <= $2");
    expect(sql).toContain("COALESCE(p.created_at::time, TIME '00:00') >= $3::time");
    expect(sql).toContain("COALESCE(p.payment_category, 'payment') = 'payment'");
    expect(sql).toContain('payment_allocations company_pa');
    expect(sql).toContain('payment_allocations doctor_pa');
    expect(params).toEqual(['2026-05-09', '2026-05-09', '08:00', '17:30', 'posted', LOC_A, DOCTOR_ID]);
  });

  it('builds a deposit workbook with deposit-specific columns and filters', async () => {
    query
      .mockResolvedValueOnce([{
        reference_code: 'PAY/001',
        payment_date: '2026-05-09',
        created_at: '2026-05-09T09:15:00',
        amount: '2000000',
        cash_amount: '2000000',
        bank_amount: '0',
        deposit_used: '0',
        method: 'cash',
        status: 'posted',
        payment_category: 'deposit',
        deposit_type: 'deposit',
        receipt_number: 'TUKH/2026/00001',
        partnercode: 'T8250',
        partnername: 'Nguyen A',
        partnerdisplayname: 'Nguyen A',
        partnerphone: '0909000000',
        companyname: 'Tam Dentist',
        saleordername: null,
        direct_doctorname: null,
        allocation_doctorname: null,
        notes: 'Deposit',
      }])
      .mockResolvedValueOnce([{
        total: '1',
        posted_count: '1',
        voided_count: '0',
        draft_count: '0',
        total_amount: '2000000',
        cash_amount: '2000000',
        bank_amount: '0',
        deposit_used: '0',
      }]);

    const result = await paymentsExport.build({
      paymentCategory: 'deposit',
      depositType: 'deposit',
      companyId: 'all',
      dateFrom: '2026-05-09',
      dateTo: '2026-05-09',
    }, USER);

    expect(result.rowCount).toBe(1);
    const dataSheet = result.workbook.getWorksheet('Data');
    expect(dataSheet.getRow(1).values).toEqual(expect.arrayContaining([
      'Mã phiếu thu',
      'Loại phiếu',
      'Loại đặt cọc',
      'Số biên nhận',
    ]));
    expect(dataSheet.getCell('A2').value).toBe('PAY/001');
    expect(dataSheet.getCell('L2').value).toBe('Đặt cọc');
    expect(dataSheet.getCell('M2').value).toBe('Nạp đặt cọc');

    const filtersSheet = result.workbook.getWorksheet('Filters');
    expect(filtersSheet.getCell('B2').value).toBe('Danh sách đặt cọc');
  });

  it('returns empty preview when no payments match', async () => {
    query.mockResolvedValueOnce([{
      total: '0',
      posted_count: '0',
      voided_count: '0',
      draft_count: '0',
      total_amount: '0',
      cash_amount: '0',
      bank_amount: '0',
      deposit_used: '0',
    }]);

    const preview = await paymentsExport.preview({
      paymentCategory: 'payment',
      companyId: 'all',
      dateFrom: '2026-05-09',
      dateTo: '2026-05-09',
    }, USER);

    expect(preview.rowCount).toBe(0);
    expect(preview.exceedsMax).toBe(false);
    expect(preview.summary).toEqual(expect.arrayContaining([
      { label: 'Tổng phiếu thu', value: 0 },
      { label: 'Đã ghi sổ', value: 0 },
    ]));
  });

  it('skips company subquery when companyId is "all"', async () => {
    query.mockResolvedValueOnce([{
      total: '1',
      posted_count: '1',
      voided_count: '0',
      draft_count: '0',
      total_amount: '1000000',
      cash_amount: '1000000',
      bank_amount: '0',
      deposit_used: '0',
    }]);

    await paymentsExport.preview({
      paymentCategory: 'payment',
      companyId: 'all',
    }, USER);

    const [sql] = query.mock.calls[0];
    expect(sql).not.toContain('payment_allocations company_pa');
    expect(sql).not.toContain('so.companyid =');
    expect(sql).not.toContain('pr.companyid =');
  });

  it('throws EXPORT_ROW_LIMIT_EXCEEDED when rows exceed MAX_ROWS', async () => {
    const tooMany = Array(paymentsExport.MAX_ROWS + 1).fill({ reference_code: 'X' });
    query
      .mockResolvedValueOnce(tooMany)
      .mockResolvedValueOnce([{
        total: String(paymentsExport.MAX_ROWS + 1),
        posted_count: '0',
        voided_count: '0',
        draft_count: '0',
        total_amount: '0',
        cash_amount: '0',
        bank_amount: '0',
        deposit_used: '0',
      }]);

    await expect(
      paymentsExport.build({ paymentCategory: 'payment', companyId: 'all' }, USER)
    ).rejects.toMatchObject({ code: 'EXPORT_ROW_LIMIT_EXCEEDED' });
  });

  it('maps unknown method/status/category to fallback values', async () => {
    query
      .mockResolvedValueOnce([{
        reference_code: 'PAY/002',
        payment_date: '2026-05-09',
        created_at: '2026-05-09T10:00:00',
        amount: '1000',
        cash_amount: '1000',
        bank_amount: '0',
        deposit_used: '0',
        method: 'UNKNOWN_METHOD',
        status: 'UNKNOWN_STATUS',
        payment_category: 'UNKNOWN_CATEGORY',
        deposit_type: 'UNKNOWN_TYPE',
        receipt_number: 'R002',
        partnercode: 'C002',
        partnername: 'Test',
        partnerdisplayname: null,
        partnerphone: null,
        companyname: null,
        saleordername: null,
        direct_doctorname: null,
        allocation_doctorname: null,
        notes: null,
      }])
      .mockResolvedValueOnce([{
        total: '1',
        posted_count: '0',
        voided_count: '0',
        draft_count: '1',
        total_amount: '0',
        cash_amount: '0',
        bank_amount: '0',
        deposit_used: '0',
      }]);

    const result = await paymentsExport.build({
      paymentCategory: 'payment',
      companyId: 'all',
    }, USER);

    const dataSheet = result.workbook.getWorksheet('Data');
    expect(dataSheet.getCell('K2').value).toBe('UNKNOWN_METHOD'); // method fallback
    expect(dataSheet.getCell('O2').value).toBe('UNKNOWN_STATUS'); // status fallback
    expect(dataSheet.getCell('L2').value).toBe('UNKNOWN_CATEGORY'); // category fallback
    expect(dataSheet.getCell('M2').value).toBe('UNKNOWN_TYPE'); // deposit type fallback
  });
});
