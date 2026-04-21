const { Client } = require('pg');
const { parse } = require('csv-parse/sync');
const fs2 = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const EXPORT_DIR = '/Users/thuanle/Downloads/TamDentistExport2';
const DB_URL = 'postgresql://postgres:postgres@127.0.0.1:55433/tdental_demo';

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

function log(msg) {
  console.log('[' + new Date().toISOString() + '] ' + msg);
}

function parseDate(val) {
  if (!val || val === '') return null;
  const m = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s*(.*)$/);
  if (m) {
    const d = m[1], mo = m[2], y = m[3], rest = m[4];
    const iso = y + '-' + mo.padStart(2,'0') + '-' + d.padStart(2,'0') + (rest ? ' ' + rest : '');
    return iso;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(val)) return val;
  return null;
}

function parseBirthday(val) {
  if (!val || val === '') return { year: null, month: null, day: null };
  const m = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    return { year: parseInt(m[3]), month: parseInt(m[2]), day: parseInt(m[1]) };
  }
  return { year: null, month: null, day: null };
}

function parseGender(val) {
  if (val === 'Nam') return 'male';
  if (val === 'Nữ') return 'female';
  return null;
}

function parseStatus(val) {
  const map = {
    'Đã đến': 'arrived',
    'Đã xác nhận': 'confirmed',
    'Hủy hẹn': 'cancelled',
    'Chưa xác nhận': 'pending',
    'Chờ khám': 'waiting',
    'Đã khám': 'done',
  };
  return map[val] || val;
}

function parseType(val) {
  const map = {
    'Khám mới': 'new',
    'Tái khám': 'followup',
  };
  return map[val] || val;
}

async function importPartners(client) {
  log('Reading KhachHang.csv...');
  const raw = fs2.readFileSync(path.join(EXPORT_DIR, 'KhachHang.csv'), 'utf-8');
  const content = raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw;
  const rows = parse(content, { columns: true, skip_empty_lines: true, relaxQuotes: true });
  log('Found ' + rows.length + ' customers');

  const batchSize = 1000;
  let inserted = 0;
  const refToId = {};

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const values = [];
    const params = [];
    let pi = 1;

    for (const row of batch) {
      const id = uuidv4();
      const ref = row['Mã KH']?.trim() || '';
      if (ref) refToId[ref] = id;

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

      values.push('($' + pi++ + ',$' + pi++ + ',$' + pi++ + ',$' + pi++ + ',$' + pi++ + ',$' + pi++ + ',$' + pi++ + ',$' + pi++ + ',$' + pi++ + ',$' + pi++ + ',$' + pi++ + ',$' + pi++ + ',$' + pi++ + ',$' + pi++ + ',$' + pi++ + ',$' + pi++ + ',$' + pi++ + ',$' + pi++ + ',$' + pi++ + ',$' + pi++ + ',$' + pi++ + ',$' + pi++ + ',$' + pi++ + ',$' + pi++ + ',$' + pi++ + ')');
      params.push(
        id, name, name, phone, email,
        gender, street, datecreated, customerstatus, note,
        medicalhistory, bd.year, bd.month, bd.day,
        true, false, false, false, false, true, false,
        false, false, false, false, DEFAULT_COMPANY_ID
      );
    }

    const sql = 'INSERT INTO dbo.partners (id, name, displayname, phone, email, gender, street, datecreated, customerstatus, note, medicalhistory, birthyear, birthmonth, birthday, customer, supplier, employee, isagent, isinsurance, active, isdeleted, isbusinessinvoice, iscompany, ishead, usedaddressv2, companyid) VALUES ' + values.join(',') + ' ON CONFLICT DO NOTHING';
    await client.query(sql, params);
    inserted += batch.length;
    if (i % 5000 === 0) log('  Partners: ' + inserted + '/' + rows.length);
  }

  log('Inserted ' + inserted + ' partners');
  return refToId;
}

async function importAppointments(client, refToId) {
  log('Reading LichHen.csv...');
  const raw = fs2.readFileSync(path.join(EXPORT_DIR, 'LichHen.csv'), 'utf-8');
  const content = raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw;
  const rows = parse(content, { columns: true, skip_empty_lines: true, relaxQuotes: true });
  log('Found ' + rows.length + ' appointments');

  const batchSize = 1000;
  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const values = [];
    const params = [];
    let pi = 1;

    for (const row of batch) {
      const ref = row['Mã KH']?.trim() || '';
      const partnerid = refToId[ref];
      if (!partnerid) {
        skipped++;
        continue;
      }

      const companyName = row['Chi nhánh']?.trim() || '';
      const companyid = COMPANY_MAP[companyName] || DEFAULT_COMPANY_ID;

      const dateStr = parseDate(row['Ngày hẹn']);
      if (!dateStr) {
        skipped++;
        continue;
      }

      const name = (row['Tên Khách Hàng'] || '').trim();
      const reason = (row['Nội dung'] || '').trim();
      const loaiKham = row['Loại khám']?.trim() || '';
      const trangThai = row['Trạng thái']?.trim() || '';
      const state = parseType(loaiKham);
      const aptstate = parseStatus(trangThai);
      const isrepeatcustomer = loaiKham === 'Tái khám';
      const now = new Date().toISOString();

      values.push('($' + pi++ + ',$' + pi++ + ',$' + pi++ + ',$' + pi++ + ',$' + pi++ + ',$' + pi++ + ',$' + pi++ + ',$' + pi++ + ',$' + pi++ + ',$' + pi++ + ',$' + pi++ + ',$' + pi++ + ',$' + pi++ + ',$' + pi++ + ',$' + pi++ + ',$' + pi++ + ')');
      params.push(
        uuidv4(), name || ref, dateStr, dateStr, dateStr,
        30, reason, partnerid, companyid, state,
        reason, isrepeatcustomer, aptstate, false, now, now
      );
    }

    if (values.length === 0) continue;

    const sql = 'INSERT INTO dbo.appointments (id, name, date, 	ime, datetimeappointment, timeexpected, note, partnerid, companyid, state, reason, isrepeatcustomer, aptstate, isnotreatment, datecreated, lastupdated) VALUES ' + values.join(',') + ' ON CONFLICT DO NOTHING';
    await client.query(sql, params);
    inserted += values.length;
    if (i % 10000 === 0) log('  Appointments: ' + inserted + '/' + rows.length + ' (skipped ' + skipped + ')');
  }

  log('Inserted ' + inserted + ' appointments, skipped ' + skipped);
}

async function main() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  log('Connected to DB');

  try {
    log('Truncating existing data...');
    await client.query('TRUNCATE TABLE dbo.appointments CASCADE');
    await client.query('TRUNCATE TABLE dbo.partners CASCADE');
    log('Tables truncated');

    const refToId = await importPartners(client);
    await importAppointments(client, refToId);

    log('Import complete!');
  } catch (err) {
    log('ERROR: ' + err.message);
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
