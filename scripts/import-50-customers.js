const { Client } = require('pg');
const { parse } = require('csv-parse/sync');
const fs2 = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const EXPORT_DIR = '/Users/thuanle/Downloads/TamDentistExport2';
const DB_URL = 'postgresql://postgres:postgres@127.0.0.1:55433/tdental_demo';
const DEFAULT_CATEG_ID = '7ab70791-8567-4f11-9f67-cc93621b7fbe';

const COMPANY_MAP = {
  'Tấm Dentist Quận 3': 'c6b4b453-d260-46d4-4fd9-08db24f7ae8e',
  'Tấm Dentist Thủ Đức': 'b178d5ee-d9ac-477e-088e-08db9a4c4cf4',
  'Tấm Dentist Gò Vấp': '765f6593-2b19-4d06-cc8c-08dc4d479451',
  'Tấm Dentist Đống Đa': 'cad65000-6ff3-47c7-cc8d-08dc4d479451',
  'Tấm Dentist Quận 7': '6861c928-0e13-4664-c781-08dcdfa45074',
  'Tấm Dentist Quận 10': 'f0f6361e-b99d-4ac7-4108-08dd8159c64a',
  'Nha khoa Tấm Dentist': 'dde8b85e-e35a-41fa-4a6b-08de107d59ec',
};

const DEFAULT_COMPANY_ID = 'c6b4b453-d260-46d4-4fd9-08db24f7ae8e';

// Skip test/internal accounts
const SKIP_REFS = new Set(['KH0001', 'T0365', 'T042633', 'T042634']);

function log(msg) {
  console.log('[' + new Date().toISOString() + '] ' + msg);
}

function parseDate(val) {
  if (!val || val === '') return null;
  const m = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s*(.*)$/);
  if (m) {
    const d = m[1], mo = m[2], y = m[3], rest = m[4];
    return y + '-' + mo.padStart(2, '0') + '-' + d.padStart(2, '0') + (rest ? ' ' + rest : '');
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(val)) return val;
  return null;
}

function parseBirthday(val) {
  if (!val || val === '') return { year: null, month: null, day: null };
  const m = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return { year: parseInt(m[3]), month: parseInt(m[2]), day: parseInt(m[1]) };
  return { year: null, month: null, day: null };
}

function parseGender(val) {
  if (val === 'Nam') return 'male';
  if (val === 'Nữ') return 'female';
  return null;
}

function parseStatus(val) {
  const map = { 'Đã đến': 'arrived', 'Đã xác nhận': 'confirmed', 'Hủy hẹn': 'cancelled', 'Chưa xác nhận': 'pending', 'Chờ khám': 'waiting', 'Đã khám': 'done' };
  return map[val] || val;
}

function parseType(val) {
  const map = { 'Khám mới': 'new', 'Tái khám': 'followup' };
  return map[val] || val;
}

function parseMoney(val) {
  if (!val || val === '') return 0;
  const n = parseFloat(String(val).replace(/,/g, ''));
  return isNaN(n) ? 0 : n;
}

function readCSV(filename) {
  const raw = fs2.readFileSync(path.join(EXPORT_DIR, filename), 'utf-8');
  const content = raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw;
  return parse(content, { columns: true, skip_empty_lines: true, relaxQuotes: true, relaxColumnCount: true });
}

async function cleanDatabase(client) {
  log('Cleaning database...');
  await client.query(`SET session_replication_role = 'replica'`);
  await client.query(`
    TRUNCATE TABLE
      dbo.payment_allocations, dbo.payment_proofs, dbo.payments,
      dbo.monthlyplan_items, dbo.planinstallments, dbo.monthlyplans,
      dbo.saleorderlines, dbo.saleorders,
      dbo.dotkhamsteps, dbo.dotkhams, dbo.appointments,
      dbo.feedback_attachments, dbo.feedback_messages, dbo.feedback_threads,
      dbo.employee_location_scope, dbo.employee_permissions, dbo.permission_overrides,
      dbo.ip_access_entries, dbo.employees, dbo.partners
    RESTART IDENTITY
  `);
  await client.query(`SET session_replication_role = 'origin'`);
  log('Database cleaned');
}

async function seedCompanies(client) {
  const exists = await client.query(`SELECT COUNT(*) as c FROM dbo.companies`);
  if (parseInt(exists.rows[0].c) > 0) {
    log('Companies already seeded');
    return;
  }
  log('Seeding companies...');
  await client.query(`
    INSERT INTO dbo.companies (id, name, partnerid, active, notallowexportinventorynegative, isuppercasepartnername, ishead, paymentsmsvalidation, isconnectconfigmedicalprescription, datecreated, lastupdated)
    VALUES
      ('c6b4b453-d260-46d4-4fd9-08db24f7ae8e', 'Tấm Dentist Quận 3', '11111111-1111-1111-1111-111111111111', true, false, false, false, false, false, NOW(), NOW()),
      ('b178d5ee-d9ac-477e-088e-08db9a4c4cf4', 'Tấm Dentist Thủ Đức', '11111111-1111-1111-1111-111111111111', true, false, false, false, false, false, NOW(), NOW()),
      ('765f6593-2b19-4d06-cc8c-08dc4d479451', 'Tấm Dentist Gò Vấp', '11111111-1111-1111-1111-111111111111', true, false, false, false, false, false, NOW(), NOW()),
      ('cad65000-6ff3-47c7-cc8d-08dc4d479451', 'Tấm Dentist Đống Đa', '11111111-1111-1111-1111-111111111111', true, false, false, false, false, false, NOW(), NOW()),
      ('6861c928-0e13-4664-c781-08dcdfa45074', 'Tấm Dentist Quận 7', '11111111-1111-1111-1111-111111111111', true, false, false, false, false, false, NOW(), NOW()),
      ('f0f6361e-b99d-4ac7-4108-08dd8159c64a', 'Tấm Dentist Quận 10', '11111111-1111-1111-1111-111111111111', true, false, false, false, false, false, NOW(), NOW()),
      ('dde8b85e-e35a-41fa-4a6b-08de107d59ec', 'Nha khoa Tấm Dentist', '11111111-1111-1111-1111-111111111111', true, false, false, false, false, false, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING
  `);
}

async function main() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  log('Connected to DB');

  try {
    await cleanDatabase(client);
    await seedCompanies(client);

    // --- 1. Read all CSVs ---
    log('Reading CSVs...');
    const allCustomersRaw = readCSV('KhachHang.csv');
    // Deduplicate customers by Mã KH (keep first occurrence)
    const seenRefs = new Set();
    const allCustomers = [];
    for (const r of allCustomersRaw) {
      const ref = r['Mã KH']?.trim();
      if (ref && !seenRefs.has(ref)) { seenRefs.add(ref); allCustomers.push(r); }
    }
    const allAppointments = readCSV('LichHen.csv');
    const allDotKhams = readCSV('DotKham.csv');
    const allDichVu = readCSV('PhieuDieuTri_DichVu.csv');
    const allPayments = readCSV('ThanhToan.csv');

    log(`CSV rows: customers=${allCustomers.length} (dedup from ${allCustomersRaw.length}), appointments=${allAppointments.length}, dotkhams=${allDotKhams.length}, services=${allDichVu.length}, payments=${allPayments.length}`);

    // --- 2. Select top 50 real customers ---
    const counts = {};
    for (const r of allAppointments) { const c = r['Mã KH']?.trim(); if (c) counts[c] = (counts[c] || 0) + 1; }
    for (const r of allDotKhams) { const c = r['Mã KH']?.trim(); if (c) counts[c] = (counts[c] || 0) + 1; }
    for (const r of allPayments) { const c = r['Mã KH']?.trim(); if (c) counts[c] = (counts[c] || 0) + 1; }

    const scored = Object.entries(counts)
      .filter(([ref]) => !SKIP_REFS.has(ref))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50)
      .map(([ref]) => ref);

    const selectedSet = new Set(scored);
    log(`Selected ${scored.length} customers: ${scored.slice(0, 5).join(', ')}...`);

    // --- 3. Import 50 customers ---
    const refToId = {};
    const customerRows = allCustomers.filter(r => selectedSet.has(r['Mã KH']?.trim()));
    log(`Importing ${customerRows.length} customers...`);

    for (const row of customerRows) {
      const id = uuidv4();
      const ref = row['Mã KH']?.trim() || '';
      refToId[ref] = id;

      const name = (row['Tên Khách Hàng'] || '').trim();
      const phone = (row['SĐT'] || '').trim();
      const email = (row['Email'] || '').trim();
      const bd = parseBirthday(row['Sinh nhật']);
      const gender = parseGender(row['Giới tính']);
      const street = (row['Địa chỉ mới'] || row['Địa chỉ cũ'] || '').trim();
      const datecreated = parseDate(row['Ngày tạo']);
      const customerstatus = (row['Trạng thái'] || '').trim();
      const note = (row['Ghi chú'] || '').trim();
      const medicalhistory = (row['Tiểu sử bệnh'] || '').trim();

      await client.query(`
        INSERT INTO dbo.partners (id, name, displayname, ref, phone, email, gender, street, datecreated, customerstatus, note, medicalhistory,
          birthyear, birthmonth, birthday, customer, supplier, employee, isagent, isinsurance, active, isdeleted, isbusinessinvoice, iscompany, ishead, usedaddressv2, isdoctor, isassistant, isreceptionist, companyid)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30)
        ON CONFLICT DO NOTHING
      `, [
        id, name, name, ref, phone, email, gender, street, datecreated, customerstatus, note, medicalhistory,
        bd.year, bd.month, bd.day, true, false, false, false, false, true, false, false, false, false, false, false, false, false, DEFAULT_COMPANY_ID
      ]);
    }
    log(`Inserted ${customerRows.length} customers`);

    // --- 4. Import doctors as partners ---
    const doctorNames = new Set();
    for (const row of allAppointments) {
      const doc = row['Bác sĩ']?.trim();
      if (doc && doc !== 'Không xác định') doctorNames.add(doc);
    }
    for (const row of allDotKhams) {
      const doc = row['Bác sĩ']?.trim();
      if (doc && doc !== 'Không xác định') doctorNames.add(doc);
    }

    const doctorNameToId = {};
    for (const docName of doctorNames) {
      const id = uuidv4();
      doctorNameToId[docName] = id;
      await client.query(`
        INSERT INTO dbo.partners (id, name, displayname, customer, supplier, employee, isagent, isinsurance, active, isdeleted, isbusinessinvoice, iscompany, ishead, usedaddressv2, isdoctor, isassistant, isreceptionist, companyid)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
        ON CONFLICT DO NOTHING
      `, [id, docName, docName, false, false, true, false, false, true, false, false, false, false, false, true, false, false, DEFAULT_COMPANY_ID]);
    }
    log(`Inserted ${doctorNames.size} doctors`);

    // --- 5. Import appointments ---
    const selectedAppointments = allAppointments.filter(r => selectedSet.has(r['Mã KH']?.trim()));
    log(`Importing ${selectedAppointments.length} appointments...`);
    let apptInserted = 0;
    for (const row of selectedAppointments) {
      const ref = row['Mã KH']?.trim();
      const partnerid = refToId[ref];
      if (!partnerid) continue;

      const companyName = row['Chi nhánh']?.trim() || '';
      const companyid = COMPANY_MAP[companyName] || DEFAULT_COMPANY_ID;
      const dateStr = parseDate(row['Ngày hẹn']);
      if (!dateStr) continue;

      const name = (row['Tên Khách Hàng'] || '').trim();
      const reason = (row['Nội dung'] || '').trim();
      const loaiKham = row['Loại khám']?.trim() || '';
      const trangThai = row['Trạng thái']?.trim() || '';
      const state = parseType(loaiKham);
      const aptstate = parseStatus(trangThai);
      const isrepeatcustomer = loaiKham === 'Tái khám';
      const now = new Date().toISOString();
      const docName = row['Bác sĩ']?.trim();
      const doctorid = (docName && docName !== 'Không xác định') ? doctorNameToId[docName] : null;

      await client.query(`
        INSERT INTO dbo.appointments (id, name, date, time, datetimeappointment, timeexpected, note, partnerid, companyid, doctorid, state, reason, isrepeatcustomer, aptstate, isnotreatment, datecreated, lastupdated)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
        ON CONFLICT DO NOTHING
      `, [uuidv4(), name || ref, dateStr, dateStr.split(' ')[1] || '', dateStr, 30, reason, partnerid, companyid, doctorid, state, reason, isrepeatcustomer, aptstate, false, now, now]);
      apptInserted++;
    }
    log(`Inserted ${apptInserted} appointments`);

    // --- 6. Import dotkhams (treatment visits) ---
    const selectedDotKhams = allDotKhams.filter(r => selectedSet.has(r['Mã KH']?.trim()));
    log(`Importing ${selectedDotKhams.length} dotkhams...`);
    const dotkhamCodeToId = {};
    let dkInserted = 0;
    for (const row of selectedDotKhams) {
      const ref = row['Mã KH']?.trim();
      const partnerid = refToId[ref];
      if (!partnerid) continue;

      const code = row['Mã đợt khám']?.trim() || '';
      const soPhieu = row['Số phiếu điều trị']?.trim() || '';
      const id = uuidv4();
      if (code) dotkhamCodeToId[code] = id;
      if (soPhieu) dotkhamCodeToId[soPhieu] = id;

      const dateStr = parseDate(row['Ngày khám'] || row['Ngày lập phiếu']);
      const docName = row['Bác sĩ']?.trim();
      const doctorid = (docName && docName !== 'Không xác định') ? doctorNameToId[docName] : null;
      const name = (row['Tên Khách Hàng'] || '').trim();
      const reason = (row['Mô tả'] || '').trim();
      const note = (row['Ghi chú'] || '').trim();
      const now = new Date().toISOString();

      await client.query(`
        INSERT INTO dbo.dotkhams (id, name, partnerid, date, reason, state, companyid, doctorid, datecreated, lastupdated, note, isdeleted)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        ON CONFLICT DO NOTHING
      `, [id, name, partnerid, dateStr, reason, 'draft', DEFAULT_COMPANY_ID, doctorid, now, now, note, false]);
      dkInserted++;
    }
    log(`Inserted ${dkInserted} dotkhams`);

    // --- 7. Import unique services as products ---
    const serviceNames = new Set();
    for (const row of allDichVu) {
      const svc = row['Tên dịch vụ']?.trim();
      if (svc) serviceNames.add(svc);
    }

    const serviceNameToId = {};
    log(`Importing ${serviceNames.size} unique services...`);
    for (const svcName of serviceNames) {
      const id = uuidv4();
      serviceNameToId[svcName] = id;
      await client.query(`
        INSERT INTO dbo.products (id, name, type, type2, listprice, saleprice, categid, uomname, companyid, active, canorderlab, datecreated, lastupdated)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        ON CONFLICT DO NOTHING
      `, [id, svcName, 'service', 'service', 0, 0, DEFAULT_CATEG_ID, 'Lần', DEFAULT_COMPANY_ID, true, false, new Date().toISOString(), new Date().toISOString()]);
    }
    log(`Inserted ${serviceNames.size} services`);

    // --- 8. Skip dotkhamsteps ---
    // dotkhamsteps requires saleorderid+salelineid (needs saleorders/saleorderlines first)
    log('Skipping dotkhamsteps — requires saleorders/saleorderlines linkage');

    // --- 9. Import payments ---
    const selectedPayments = allPayments.filter(r => selectedSet.has(r['Mã KH']?.trim()));
    log(`Importing ${selectedPayments.length} payments...`);
    let payInserted = 0;
    for (const row of selectedPayments) {
      const ref = row['Mã KH']?.trim();
      const customer_id = refToId[ref];
      if (!customer_id) continue;

      const amount = parseMoney(row['Số tiền']);
      const payDate = parseDate(row['Ngày thanh toán']);
      const methodMap = { 'Tiền mặt': 'cash', 'Chuyển khoản': 'transfer', 'Thẻ': 'card' };
      const method = methodMap[row['Phương thức']?.trim()] || 'cash';
      const notes = (row['Nội dung'] || '').trim();
      const status = (row['Trạng thái']?.trim() === 'Hoàn thành') ? 'posted' : 'posted';
      const svcName = row['Dịch vụ']?.trim();
      const service_id = svcName ? serviceNameToId[svcName] : null;

      await client.query(`
        INSERT INTO dbo.payments (id, customer_id, service_id, amount, method, notes, payment_date, status, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        ON CONFLICT DO NOTHING
      `, [uuidv4(), customer_id, service_id, amount, method, notes, payDate, status, new Date().toISOString()]);
      payInserted++;
    }
    log(`Inserted ${payInserted} payments`);

    // --- Summary ---
    const summary = await client.query(`
      SELECT 'partners' as t, COUNT(*) as c FROM dbo.partners WHERE customer = true
      UNION ALL SELECT 'doctors', COUNT(*) FROM dbo.partners WHERE isdoctor = true
      UNION ALL SELECT 'appointments', COUNT(*) FROM dbo.appointments
      UNION ALL SELECT 'dotkhams', COUNT(*) FROM dbo.dotkhams
      UNION ALL SELECT 'products', COUNT(*) FROM dbo.products
      UNION ALL SELECT 'dotkhamsteps', COUNT(*) FROM dbo.dotkhamsteps
      UNION ALL SELECT 'payments', COUNT(*) FROM dbo.payments
    `);
    log('--- IMPORT SUMMARY ---');
    for (const r of summary.rows) {
      log(`${r.t}: ${r.c}`);
    }
    log('Import complete!');

  } catch (err) {
    log('ERROR: ' + err.message);
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
