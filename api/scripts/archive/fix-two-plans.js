const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');

const TARGET_DB = 'postgresql://postgres:postgres@127.0.0.1:55433/tdental_demo';

async function main() {
  const target = new Client({ connectionString: TARGET_DB, options: '-c search_path=dbo' });
  await target.connect();

  // Delete incorrect plans for both customers
  await target.query(`DELETE FROM planinstallments WHERE plan_id IN (SELECT id FROM monthlyplans WHERE customer_id IN ('90edb637-1d32-4280-8088-b1a400ff0073', 'cd985f43-2f12-4d6d-b1b8-b23000efbac3'))`);
  await target.query(`DELETE FROM monthlyplans WHERE customer_id IN ('90edb637-1d32-4280-8088-b1a400ff0073', 'cd985f43-2f12-4d6d-b1b8-b23000efbac3')`);

  // === LƯƠNG HỒNG NHUNG - Correct Plan ===
  // Braces: 15,835,000 = 5 installments × 3,167,000
  const luongPlanId = uuidv4();
  await target.query(`
    INSERT INTO monthlyplans (id, customer_id, company_id, treatment_description, total_amount, down_payment, installment_amount, number_of_installments, start_date, status, notes, created_at, updated_at)
    VALUES ($1, $2, 'c6b4b453-d260-46d4-4fd9-08db24f7ae8e', 'Niềng Mắc Cài Kim Loại Tiêu Chuẩn', 15835000, 0, 3167000, 5, '2024-12-31', 'completed', 'Corrected plan: 5 monthly installments for braces (SO24081)', NOW(), NOW())
  `, [luongPlanId, 'cd985f43-2f12-4d6d-b1b8-b23000efbac3']);

  const luongPayments = [
    { date: '2024-12-31', amount: 3167000 },
    { date: '2025-01-24', amount: 3167000 },
    { date: '2025-03-01', amount: 3167000 },
    { date: '2025-04-02', amount: 3167000 },
    { date: '2025-04-28', amount: 3167000 },
  ];
  for (let i = 0; i < luongPayments.length; i++) {
    const inst = luongPayments[i];
    await target.query(`
      INSERT INTO planinstallments (id, plan_id, installment_number, due_date, amount, status, paid_date, paid_amount, created_at)
      VALUES ($1, $2, $3, $4, $5, 'paid', $6, $7, NOW())
    `, [uuidv4(), luongPlanId, i + 1, inst.date, 3167000, inst.date, inst.amount]);
  }
  console.log('Luong Hong Nhung: 5 installments, 15,835,000 VND, completed');

  // === KIM THỊ THẢO NHI - Correct Plan ===
  // Down payments: 600k + 2M + 8M + 200k = 10,800,000
  // Braces total from saleorder SO15619: 14,000,000
  // Installments: 6 payments of 2,334,000 = 14,004,000
  // Total = 24,804,000 (matching 10M + 600k + 14M + 200k = 24,800,000 from invoices)
  const kimPlanId = uuidv4();
  const kimTotal = 24804000;
  const kimDown = 10800000;
  const kimInstallment = 2334000;
  const kimCount = 6;

  await target.query(`
    INSERT INTO monthlyplans (id, customer_id, company_id, treatment_description, total_amount, down_payment, installment_amount, number_of_installments, start_date, status, notes, created_at, updated_at)
    VALUES ($1, $2, 'c6b4b453-d260-46d4-4fd9-08db24f7ae8e', 'GẮN MCKLTC 24TR', $3, $4, $5, $6, '2024-08-07', 'completed', 'Corrected plan: 6 monthly installments for braces (SO15619)', NOW(), NOW())
  `, [kimPlanId, '90edb637-1d32-4280-8088-b1a400ff0073', kimTotal, kimDown, kimInstallment, kimCount]);

  const kimPayments = [
    { date: '2024-08-07', amount: 2334000, num: 1 },
    { date: '2024-09-05', amount: 2334000, num: 2 },
    { date: '2024-10-09', amount: 2334000, num: 3 },
    { date: '2024-11-10', amount: 2334000, num: 4 },
    { date: '2024-11-27', amount: 2334000, num: 5 }, // TGL55 was actually TGL5
    { date: '2024-12-27', amount: 2330000, num: 6 }, // TGL6
  ];
  for (const inst of kimPayments) {
    await target.query(`
      INSERT INTO planinstallments (id, plan_id, installment_number, due_date, amount, status, paid_date, paid_amount, created_at)
      VALUES ($1, $2, $3, $4, $5, 'paid', $6, $7, NOW())
    `, [uuidv4(), kimPlanId, inst.num, inst.date, kimInstallment, inst.date, inst.amount]);
  }
  console.log('Kim Thi Thao Nhi: 6 installments, 24,804,000 VND, completed');

  await target.end();
  console.log('\n✅ Both plans corrected');
}

main().catch(err => {
  console.error('Fix failed:', err);
  process.exit(1);
});
