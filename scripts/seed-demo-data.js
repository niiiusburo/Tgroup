const { Pool } = require('pg');
const { randomUUID } = require('crypto');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5433/tdental_demo';

const pool = new Pool({
  connectionString: DATABASE_URL,
  options: '-c search_path=dbo'
});

const companies = [
  { id: 'dde8b85e-e35a-41fa-4a6b-08de107d59ec', name: 'Nha khoa Tấm Dentist' },
  { id: 'cad65000-6ff3-47c7-cc8d-08dc4d479451', name: 'Tấm Dentist Đống Đa' },
  { id: '765f6593-2b19-4d06-cc8c-08dc4d479451', name: 'Tấm Dentist Gò Vấp' },
  { id: 'f0f6361e-b99d-4ac7-4108-08dd8159c64a', name: 'Tấm Dentist Quận 10' },
  { id: 'c6b4b453-d260-46d4-4fd9-08db24f7ae8e', name: 'Tấm Dentist Quận 3' },
  { id: '6861c928-0e13-4664-c781-08dcdfa45074', name: 'Tấm Dentist Quận 7' },
  { id: 'b178d5ee-d9ac-477e-088e-08db9a4c4cf4', name: 'Tấm Dentist Thủ Đức' },
];

const firstNames = [
  'Anh','Bình','Cường','Dung','Duy','Giang','Hà','Hải','Hân','Hiếu',
  'Hoàng','Hùng','Huy','Khánh','Lan','Linh','Long','Minh','Nam','Nga',
  'Ngân','Ngọc','Nhân','Nhi','Phúc','Phương','Quân','Quyên','Sơn','Tâm',
  'Thảo','Thi','Thùy','Trang','Trâm','Trí','Trung','Tú','Uyên','Vân',
  'Việt','Vũ','Xuân','Yến','Ân','Đạt','Đức','Thắng','Kiên','Lâm',
  'Mai','Mỹ','Oanh','Phong','Thy','Tiến','Tín','Toàn','Tuấn','Vinh'
];

const lastNames = [
  'Nguyễn','Trần','Lê','Phạm','Hoàng','Huỳnh','Phan','Vũ','Võ','Đặng',
  'Bùi','Đỗ','Hồ','Ngô','Dương','Lý','An','Mai','Lâm','Tô'
];

const jobTitles = [
  'Bác sĩ Nha khoa','Bác sĩ Chỉnh nha','Bác sĩ Implant','Bác sĩ Răng trẻ em',
  'Y tá Nha khoa','Trợ thủ Nha khoa','Lễ tân','Quản lý Chi nhánh',
  'Chăm sóc khách hàng','Kế toán','Nhân viên Marketing','Nhân viên Bảo vệ',
  'Kỹ thuật viên X-quang','Nha sĩ Tổng quát','Chuyên viên Tẩy trắng',
  'Bác sĩ Phục hình','Bác sĩ Nội nha','Kỹ thuật viên Labo'
];

function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function generateName() { return `${randomItem(lastNames)} ${randomItem(firstNames)}`; }

function generatePhone() {
  return '0' + ['3','5','7','8','9'][Math.floor(Math.random() * 5)] + String(Math.floor(Math.random() * 1e8)).padStart(8,'0');
}

function generateEmail(name, index) {
  const clean = name.toLowerCase().replace(/\s+/g, '.').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return `${clean}.${index}@tamdentist.vn`;
}

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const counts = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM partners WHERE customer = true AND isdeleted = false) AS customers,
        (SELECT COUNT(*) FROM partners WHERE employee = true AND isdeleted = false) AS employees
    `);
    const currentCustomers = parseInt(counts.rows[0].customers, 10);
    const currentEmployees = parseInt(counts.rows[0].employees, 10);
    console.log(`Current: ${currentCustomers} customers, ${currentEmployees} employees`);

    const doctorsRes = await client.query(`SELECT id FROM partners WHERE employee = true AND isdeleted = false AND jobtitle LIKE '%Bác sĩ%'`);
    let doctorIds = doctorsRes.rows.map(r => r.id);

    // 1. Seed employees to ~300
    const targetEmployees = 300;
    const employeesToAdd = targetEmployees - currentEmployees;
    if (employeesToAdd > 0) {
      console.log(`Adding ${employeesToAdd} employees...`);
      for (let i = 0; i < employeesToAdd; i++) {
        const name = generateName();
        const email = generateEmail(name, i);
        const company = randomItem(companies);
        const job = randomItem(jobTitles);
        const isDoctor = job.includes('Bác sĩ');
        const id = randomUUID();

        await client.query(`
          INSERT INTO partners (
            id, name, email, phone, companyid, jobtitle,
            supplier, customer, isagent, isinsurance, active, employee,
            iscompany, ishead, isbusinessinvoice, isdeleted,
            password_hash, datecreated, lastupdated
          ) VALUES ($1, $2, $3, $4, $5, $6, false, false, false, false, true, true, false, false, false, false, $7, NOW(), NOW())
        `, [id, name, email, generatePhone(), company.id, job,
             '$2a$10$N9qo8uLOickgx2ZMRZoMy.MqrqhmM6JGKpS4G3R1G2JH8YpfB0Bzm'
        ]);

        if (isDoctor) doctorIds.push(id);
      }
    }

    // 2. Seed customers to ~40
    const targetCustomers = 40;
    const customersToAdd = targetCustomers - currentCustomers;
    const customerIds = [];
    if (customersToAdd > 0) {
      console.log(`Adding ${customersToAdd} customers...`);
      for (let i = 0; i < customersToAdd; i++) {
        const name = generateName();
        const id = randomUUID();
        const company = randomItem(companies);
        await client.query(`
          INSERT INTO partners (
            id, name, phone, companyid,
            supplier, customer, isagent, isinsurance, active, employee,
            iscompany, ishead, isbusinessinvoice, isdeleted,
            datecreated, lastupdated
          ) VALUES ($1, $2, $3, $4, false, true, false, false, true, false, false, false, false, false, NOW(), NOW())
        `, [id, name, generatePhone(), company.id]);
        customerIds.push(id);
      }
    }

    // Fetch all customer IDs
    const allCustomersRes = await client.query(`SELECT id FROM partners WHERE customer = true AND isdeleted = false`);
    const allCustomerIds = allCustomersRes.rows.map(r => r.id);
    console.log(`Total customers: ${allCustomerIds.length}`);
    console.log(`Total doctors: ${doctorIds.length}`);

    // 3. Seed appointments for today
    const today = '2026-04-15';
    const existingTodayRes = await client.query(`SELECT COUNT(*) FROM appointments WHERE date::date = $1`, [today]);
    const existingToday = parseInt(existingTodayRes.rows[0].count, 10);
    console.log(`Existing appointments today: ${existingToday}`);

    if (existingToday === 0) {
      const times = [
        '08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30',
        '13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00'
      ];
      const states = ['scheduled','arrived','in Examination','done','scheduled','scheduled','cancelled'];
      const numAppointments = 24;
      console.log(`Creating ${numAppointments} appointments for ${today}...`);

      for (let i = 0; i < numAppointments; i++) {
        const time = times[i % times.length];
        const dateTime = `${today} ${time}:00`;
        const customerId = randomItem(allCustomerIds);
        const doctorId = randomItem(doctorIds);
        const companyId = randomItem(companies).id;
        const state = randomItem(states);
        const id = randomUUID();

        await client.query(`
          INSERT INTO appointments (
            id, name, date, time, datetimeappointment, timeexpected,
            partnerid, companyid, doctorid, state, note,
            isrepeatcustomer, isnotreatment, color,
            datecreated, lastupdated
          ) VALUES ($1, $2, $3, $4, $5, 30, $6, $7, $8, $9, $10, false, false, $11, NOW(), NOW())
        `, [id, `Lịch hẹn ${i + 1}`, dateTime, time, dateTime, customerId, companyId, doctorId, state, 'Khám định kỳ', String((i % 8) + 1)]);
      }
    }

    await client.query('COMMIT');

    const finalCounts = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM partners WHERE customer = true AND isdeleted = false) AS customers,
        (SELECT COUNT(*) FROM partners WHERE employee = true AND isdeleted = false) AS employees,
        (SELECT COUNT(*) FROM appointments WHERE date::date = $1) AS appointments_today,
        (SELECT COUNT(*) FROM appointments) AS appointments_total
    `, [today]);

    console.log('\n=== SEED COMPLETE ===');
    console.log(`Customers: ${finalCounts.rows[0].customers}`);
    console.log(`Employees: ${finalCounts.rows[0].employees}`);
    console.log(`Appointments today (${today}): ${finalCounts.rows[0].appointments_today}`);
    console.log(`Total appointments: ${finalCounts.rows[0].appointments_total}`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
