'use strict';

jest.mock('../../../db', () => ({
  query: jest.fn(),
}));

jest.mock('../../permissionService', () => ({
  resolveEffectivePermissions: jest.fn(),
}));

const { query } = require('../../../db');
const { resolveEffectivePermissions } = require('../../permissionService');

const reportSalesEmployeesExport = require('../builders/reportSalesEmployeesExport');

const ADMIN_USER = {
  employeeId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  name: 'Admin',
};
const LOC_A = '11111111-1111-4111-8111-111111111111';
const LOC_B = '22222222-2222-4222-8222-222222222222';
const EMPLOYEE_ID = '33333333-3333-4333-8333-333333333333';

const rows = [
  {
    employeeid: EMPLOYEE_ID,
    employeename: 'BS An',
    employee_ref: 'BS01',
    rolelabel: 'Bác sĩ',
    companyname: 'Tấm Dentist Thủ Đức',
    paymentdate: '2026-05-02',
    paymentreference: 'CUST.IN/2026/1',
    saleordername: 'SO001',
    treatmentcode: 'DK001',
    customername: 'Nguyễn Văn A',
    customerphone: '0909000000',
    productname: 'Răng sứ',
    paymentmethod: 'cash',
    paymentamount: '1000000',
  },
  {
    employeeid: EMPLOYEE_ID,
    employeename: 'BS An',
    employee_ref: 'BS01',
    rolelabel: 'Bác sĩ',
    companyname: 'Tấm Dentist Thủ Đức',
    paymentdate: '2026-05-03',
    paymentreference: 'CUST.IN/2026/2',
    saleordername: 'SO002',
    treatmentcode: 'DK002',
    customername: 'Trần Thị B',
    customerphone: '0909111111',
    productname: 'Tẩy trắng',
    paymentmethod: 'bank',
    paymentamount: '500000',
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  resolveEffectivePermissions.mockResolvedValue({
    groupName: 'Manager',
    effectivePermissions: ['reports.view', 'reports.export'],
    locations: [{ id: LOC_A, name: 'Tấm Dentist Thủ Đức' }],
  });
});

describe('reportSalesEmployeesExport', () => {
  it('previews grouped employee revenue through scoped location and role filters', async () => {
    query.mockResolvedValueOnce(rows);

    const preview = await reportSalesEmployeesExport.preview({
      companyId: LOC_A,
      employeeType: 'doctor',
      employeeId: EMPLOYEE_ID,
      dateFrom: '2026-05-01',
      dateTo: '2026-05-31',
    }, ADMIN_USER);

    expect(preview).toEqual(expect.objectContaining({
      rowCount: 2,
      exceedsMax: false,
      summary: expect.arrayContaining([
        { label: 'Số nhân viên', value: 1 },
        { label: 'Tổng thanh toán', value: 1500000 },
        { label: 'Loại nhân viên', value: 'Bác sĩ' },
      ]),
    }));

    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain('pa.allocated_amount');
    expect(sql).toContain('allocation_totals AS');
    expect(sql).toContain('total_allocated_for_payment > p.amount');
    expect(sql).toContain('pa.allocated_amount * p.amount / at.total_allocated_for_payment');
    expect(sql).toContain('so.doctorid');
    expect(sql).toContain('so.companyid = ANY');
    expect(sql).toContain("p.status = 'posted'");
    expect(params).toContain('2026-05-01');
    expect(params).toContain('2026-05-31');
    expect(params).toContainEqual([LOC_A]);
    expect(params).toContain(EMPLOYEE_ID);
  });

  it('builds a TDental-style grouped Excel workbook by employee', async () => {
    query.mockResolvedValueOnce(rows);

    const result = await reportSalesEmployeesExport.build({
      companyId: LOC_A,
      employeeType: 'doctor',
      employeeId: EMPLOYEE_ID,
      dateFrom: '2026-05-01',
      dateTo: '2026-05-31',
    }, ADMIN_USER);

    expect(result.rowCount).toBe(2);
    const dataSheet = result.workbook.getWorksheet('Data');
    expect(dataSheet.getCell('A1').value).toBe('BÁO CÁO DOANH THU THEO NHÂN VIÊN');
    expect(dataSheet.getRow(3).values).toEqual(expect.arrayContaining([
      'Nhân viên',
      'Doanh thu',
      'Ngày thanh toán',
      'Khách hàng',
      'Dịch vụ/Thuốc',
      'Thanh toán',
    ]));
    expect(dataSheet.getCell('A4').value).toBe('BS An (BS01)');
    expect(dataSheet.getCell('B4').value).toBe(1500000);
    expect(dataSheet.getCell('C5').value).toEqual(new Date('2026-05-02'));
    expect(dataSheet.getCell('F5').value).toBe('Nguyễn Văn A');
    expect(dataSheet.getCell('J5').value).toBe(1000000);

    const summarySheet = result.workbook.getWorksheet('Summary');
    expect(summarySheet.getCell('A2').value).toBe('Số nhân viên');
    expect(summarySheet.getCell('B2').value).toBe(1);
  });

  it('rejects a requested location outside the employee export scope', async () => {
    await expect(reportSalesEmployeesExport.preview({
      companyId: LOC_B,
      employeeType: 'doctor',
      dateFrom: '2026-05-01',
      dateTo: '2026-05-31',
    }, ADMIN_USER)).rejects.toMatchObject({
      status: 403,
      code: 'EXPORT_LOCATION_DENIED',
    });
    expect(query).not.toHaveBeenCalled();
  });
});
