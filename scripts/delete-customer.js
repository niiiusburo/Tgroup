const { Client } = require('pg');
(async () => {
  const demo = new Client({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:55433/tdental_demo' });
  await demo.connect();
  await demo.query('BEGIN');
  const customerId = 'f74a7480-e23c-410a-bb2c-b413005a27a4';
  
  const { rows: paymentIds } = await demo.query('SELECT id FROM dbo.payments WHERE customer_id = $1', [customerId]);
  console.log('Payments to delete:', paymentIds.length);
  if (paymentIds.length > 0) {
    const ids = paymentIds.map(r => r.id);
    const placeholders = ids.map((_, i) => '$' + (i + 1)).join(',');
    console.log('Placeholders:', placeholders);
    await demo.query(`DELETE FROM dbo.payment_allocations WHERE payment_id IN (${placeholders})`, ids);
    await demo.query(`DELETE FROM dbo.payments WHERE id IN (${placeholders})`, ids);
  }
  
  const { rows: orderIds } = await demo.query('SELECT id FROM dbo.saleorders WHERE partnerid = $1', [customerId]);
  console.log('Orders to delete:', orderIds.length);
  if (orderIds.length > 0) {
    const ids = orderIds.map(r => r.id);
    const placeholders = ids.map((_, i) => '$' + (i + 1)).join(',');
    await demo.query(`DELETE FROM dbo.saleorderlines WHERE orderid IN (${placeholders})`, ids);
    await demo.query(`DELETE FROM dbo.saleorders WHERE id IN (${placeholders})`, ids);
  }
  
  await demo.query('DELETE FROM dbo.appointments WHERE partnerid = $1', [customerId]);
  await demo.query('DELETE FROM dbo.partners WHERE id = $1', [customerId]);
  
  await demo.query('COMMIT');
  console.log('Deleted customer and all related data');
  await demo.end();
})();
