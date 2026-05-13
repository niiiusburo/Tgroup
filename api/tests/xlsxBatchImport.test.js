const {
  buildAppointmentPlan,
  buildCustomerByRef,
  buildCustomerPlan,
  composeAppointmentNote,
  mapAppointmentStatus,
  normalizeAppointmentSheetRow,
  parseDatePart,
  parseTimePart,
} = require('../scripts/xlsx-batch-import');

function lookups() {
  return {
    companyByName: new Map([['TAM DENTIST QUAN 3', { id: 'company-q3', name: 'Tấm Dentist Quận 3' }]]),
    customerByRef: new Map([
      ['T162057', { id: 'customer-162057', ref: 'T162057', name: 'NGUYỄN VĂN HƯỜNG - G1 + 26', phone: '0903307060', companyid: 'company-q3' }],
    ]),
    staffByName: new Map([
      ['PHAN THI TUYET MAI', { id: 'assistant-mai', name: 'PHAN THỊ TUYẾT MAI' }],
    ]),
    appointmentSignatures: new Set(),
    defaultCompanyId: 'company-q3',
  };
}

describe('xlsx batch import helpers', () => {
  it('parses Vietnamese date/time values without shifting days', () => {
    expect(parseDatePart('4/5/2026')).toBe('2026-05-04');
    expect(parseTimePart('09:00')).toBe('09:00');
  });

  it('parses typed Excel date/time values without coercing them to strings', () => {
    expect(parseDatePart(new Date(Date.UTC(2026, 4, 14)))).toBe('2026-05-14');
    expect(parseTimePart(new Date(Date.UTC(1899, 11, 30, 11, 30)))).toBe('11:30');
  });

  it('maps appointment statuses from the daily appointment spreadsheet', () => {
    expect(mapAppointmentStatus('Đang hẹn')).toBe('scheduled');
    expect(mapAppointmentStatus('Đã đến')).toBe('arrived');
    expect(mapAppointmentStatus('Hủy hẹn')).toBe('cancelled');
  });

  it('normalizes appointment rows from the legacy sheet headers case-insensitively', () => {
    const row = normalizeAppointmentSheetRow({
      rowNumber: 2,
      source: {
        'Cơ sở': 'Tấm Dentist Thủ Đức',
        'Mã Khách hàng': ' T162057 ',
        'Họ và tên': 'NGUYỄN VĂN HƯỜNG - G1 + 26',
        'Số điện thoại': '0903307060',
        'Ngày hẹn': '4/5/2026',
        'Giờ hẹn': '15:15',
        'Nội dung': 'KIẾM TRA NƯỚU CÒN SƯNG - Q',
        'Loại khám': 'Khám mới',
        'Trạng thái': 'Đang hẹn',
      },
    });

    expect(row).toMatchObject({
      rowNumber: 2,
      ref: 'T162057',
      branchName: 'Tấm Dentist Thủ Đức',
      customerName: 'NGUYỄN VĂN HƯỜNG - G1 + 26',
      phone: '0903307060',
      date: '2026-05-04',
      time: '15:15',
      datetime: '2026-05-04 15:15:00',
      content: 'KIẾM TRA NƯỚU CÒN SƯNG - Q',
      status: 'scheduled',
    });
  });

  it('normalizes appointment rows from the Đống Đa upload sheet headers', () => {
    const row = normalizeAppointmentSheetRow({
      rowNumber: 2,
      source: {
        'Mã KH': 'T9045',
        'Khách hàng': 'Nguyễn Thị Ngọc Trâm',
        'SĐT': '0374192956',
        'Giờ hẹn': new Date(Date.UTC(1899, 11, 30, 11, 0)),
        'Ngày hẹn': new Date(Date.UTC(2026, 4, 14)),
        'Dịch vụ': '',
        'Bác sĩ': 'Bác sĩ 1',
        'Chi nhánh': 'Tấm Dentist Đống Đa',
        'Loại hẹn': 'Tái khám',
        'Ghi chú': 'chỉnh',
      },
    });

    expect(row).toMatchObject({
      rowNumber: 2,
      ref: 'T9045',
      customerName: 'Nguyễn Thị Ngọc Trâm',
      phone: '0374192956',
      date: '2026-05-14',
      time: '11:00',
      datetime: '2026-05-14 11:00:00',
      branchName: 'Tấm Dentist Đống Đa',
      doctorName: 'Bác sĩ 1',
      content: 'chỉnh',
      appointmentType: 'Tái khám',
      status: 'scheduled',
    });
  });

  it('preserves assistant-only appointments in notes without adding customer code/name noise', () => {
    const note = composeAppointmentNote({
      content: 'KIẾM TRA NƯỚU CÒN SƯNG - Q',
      service: '',
      doctorName: '',
      doctorId: null,
      assistantName: 'PHAN THỊ TUYẾT MAI',
      assistantId: 'assistant-mai',
      dentalAideName: '',
      dentalAideId: null,
    });

    expect(note).toContain('KIẾM TRA NƯỚU CÒN SƯNG - Q');
    expect(note).toContain('Phụ tá: PHAN THỊ TUYẾT MAI');
    expect(note).not.toContain('T162057');
    expect(note).not.toContain('NGUYỄN VĂN HƯỜNG');
  });

  it('plans customer updates by exact customer code instead of phone/name merging', () => {
    const plan = buildCustomerPlan([
      { rowNumber: 2, ref: 'T164499', name: 'bạn Hương', phone: '0374483829', branchName: 'Tấm Dentist Quận 3' },
    ], lookups());

    expect(plan.actions).toMatchObject([
      { type: 'create', ref: 'T164499', name: 'bạn Hương', phone: '0374483829', companyid: 'company-q3' },
    ]);
    expect(plan.anomalies).toHaveLength(0);
  });

  it('plans the T162057 assistant appointment as a create with assistant id and note', () => {
    const plan = buildAppointmentPlan([
      {
        rowNumber: 8,
        ref: 'T162057',
        customerName: 'NGUYỄN VĂN HƯỜNG - G1 + 26',
        phone: '0903307060',
        date: '2026-05-04',
        time: '15:15',
        datetime: '2026-05-04 15:15:00',
        service: '',
        doctorName: '',
        assistantName: 'PHAN THỊ TUYẾT MAI',
        dentalAideName: '',
        content: 'KIẾM TRA NƯỚU CÒN SƯNG - Q',
        appointmentType: 'Khám mới',
        status: 'arrived',
      },
    ], lookups());

    expect(plan.actions).toHaveLength(1);
    expect(plan.actions[0]).toMatchObject({
      type: 'create',
      partnerid: 'customer-162057',
      assistantid: 'assistant-mai',
      doctorid: null,
      state: 'arrived',
    });
    expect(plan.actions[0].note).toContain('Phụ tá: PHAN THỊ TUYẾT MAI');
    expect(plan.anomalies).toHaveLength(0);
  });

  it('uses the appointment sheet branch when it differs from the customer home branch', () => {
    const data = lookups();
    data.companyByName.set('TAM DENTIST THU DUC', { id: 'company-thu-duc', name: 'Tấm Dentist Thủ Đức' });
    const plan = buildAppointmentPlan([
      {
        rowNumber: 2,
        ref: 'T162057',
        branchName: 'Tấm Dentist Thủ Đức',
        customerName: 'NGUYỄN VĂN HƯỜNG - G1 + 26',
        phone: '0903307060',
        date: '2026-05-04',
        time: '15:15',
        datetime: '2026-05-04 15:15:00',
        service: '',
        doctorName: '',
        assistantName: '',
        dentalAideName: '',
        content: 'KIẾM TRA NƯỚU CÒN SƯNG - Q',
        appointmentType: 'Khám mới',
        status: 'scheduled',
      },
    ], data);

    expect(plan.actions).toHaveLength(1);
    expect(plan.actions[0]).toMatchObject({
      companyid: 'company-thu-duc',
    });
    expect(plan.anomalies).toHaveLength(0);
  });

  it('matches customer refs when existing database refs contain spacing differences', () => {
    const data = lookups();
    data.customerByRef = buildCustomerByRef([
      {
        id: 'customer-160333-36',
        ref: 'T160333 +36',
        name: 'NGUYỄN THỊ PHƯƠNG + 26',
        phone: '0399676275',
        companyid: 'company-q3',
      },
    ]);
    const plan = buildAppointmentPlan([
      {
        rowNumber: 999,
        ref: 'T160333+36',
        branchName: 'Tấm Dentist Quận 3',
        customerName: 'NGUYỄN THỊ PHƯƠNG + 26',
        phone: '0399676275',
        date: '2026-05-09',
        time: '14:00',
        datetime: '2026-05-09 14:00:00',
        service: '',
        doctorName: '',
        assistantName: '',
        dentalAideName: '',
        content: 'TĂNG LỰC',
        appointmentType: 'Tái khám',
        status: 'scheduled',
      },
    ], data);

    expect(plan.actions).toHaveLength(1);
    expect(plan.actions[0]).toMatchObject({
      partnerid: 'customer-160333-36',
    });
    expect(plan.anomalies).toHaveLength(0);
  });
});
