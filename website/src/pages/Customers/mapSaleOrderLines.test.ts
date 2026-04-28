import { describe, expect, it } from 'vitest';
import { mapSaleOrderLineToCustomerService } from './mapSaleOrderLines';

describe('mapSaleOrderLineToCustomerService', () => {
  it('renders UTC midnight service timestamps as the Vietnam calendar date', () => {
    const service = mapSaleOrderLineToCustomerService({
      id: 'line-1',
      date: '2025-11-13T17:00:00.000Z',
      productName: 'Phẫu thuật ghép xương bột',
      priceTotal: '5600000.00',
      amountPaid: '5600000.00',
      amountResidual: '0.00',
      productUOMQty: '1.00',
      sostate: 'sale',
      tooth_numbers: null,
      toothType: null,
      diagnostic: null,
    });

    expect(service.date).toBe('2025-11-14');
    expect(service.cost).toBe(5600000);
    expect(service.paidAmount).toBe(5600000);
  });

  it('normalizes space-separated UTC timestamps from database JSON as Vietnam dates', () => {
    const service = mapSaleOrderLineToCustomerService({
      id: 'line-utc-space',
      date: '2025-06-21 17:00:00',
      productName: 'Nhổ răng khôn hàm dưới',
      priceTotal: '0.00',
      amountPaid: '0.00',
      amountResidual: '0.00',
      productUOMQty: '1.00',
    });

    expect(service.date).toBe('2025-06-22');
  });

  it('keeps plain date strings unchanged', () => {
    const service = mapSaleOrderLineToCustomerService({
      id: 'line-2',
      date: '2026-04-18',
      productName: 'Trám răng',
      priceTotal: '700000.00',
      amountPaid: '700000.00',
      productUOMQty: '2.00',
      iscancelled: false,
    });

    expect(service.date).toBe('2026-04-18');
    expect(service.quantity).toBe(2);
  });

  it('uses backend paid_amount fallback when imported line amountpaid is zero', () => {
    const service = mapSaleOrderLineToCustomerService({
      id: 'line-direct-payment',
      orderId: 'order-direct-payment',
      date: '2026-02-11',
      productName: 'Niềng Mắc Cài Kim Loại Tiêu Chuẩn',
      priceTotal: '19200000.00',
      amountPaid: '0.00',
      amountResidual: '19200000.00',
      paid_amount: '3200000.00',
      order_line_count: '1',
      productUOMQty: '1.00',
    });

    expect(service.paidAmount).toBe(3200000);
    expect(service.residual).toBe(16000000);
  });

  it('uses backend paid_amount when a new allocation exceeds stale imported line amountpaid', () => {
    const service = mapSaleOrderLineToCustomerService({
      id: 'line-s057144',
      orderId: 'order-so57144',
      date: '2026-02-11',
      productName: 'Niềng Mắc Cài Kim Loại Tiêu Chuẩn',
      priceTotal: '19200000.00',
      amountPaid: '6546000.00',
      amountResidual: '0.00',
      so_residual: '11987334.00',
      paid_amount: '7212666.00',
      order_line_count: '1',
      productUOMQty: '1.00',
    });

    expect(service.paidAmount).toBe(7212666);
    expect(service.residual).toBe(11987334);
  });

  it('keeps line-level paid amounts for multi-line orders to avoid duplicating order allocations', () => {
    const service = mapSaleOrderLineToCustomerService({
      id: 'line-multi',
      orderId: 'order-multi',
      date: '2026-02-11',
      productName: 'Service line',
      priceTotal: '5000000.00',
      amountPaid: '1000000.00',
      amountResidual: '4000000.00',
      paid_amount: '7000000.00',
      order_line_count: '2',
      productUOMQty: '1.00',
    });

    expect(service.paidAmount).toBe(1000000);
    expect(service.residual).toBe(4000000);
  });

  it('maps lowercase SaleOrders/lines payloads for customer service records', () => {
    const service = mapSaleOrderLineToCustomerService({
      id: 'bf05139b-10b4-4009-b0b7-b30a0056e684',
      productid: 'c1835411-4b21-4bbf-9985-b23400b65620',
      productname: 'Trám thẩm mỹ',
      productuomqty: '1.00',
      pricetotal: '750000',
      amountpaid: '0',
      amountresidual: '750000',
      date: '2025-06-27T17:00:00.000Z',
      tooth_numbers: 'manual',
      toothtype: 'manual',
      diagnostic: 'TRÁM 1R TM - 750K (CĐDV)',
      employeeid: '58a26a1d-d02c-4358-b326-b30100a8268a',
      assistantid: 'fe8753b2-3814-43ee-81d0-b2c7006579bd',
      dentalaideid: 'dental-aide-id',
      orderid: 'e3536a97-481e-4270-8c61-b30a0056e684',
      ordername: 'SO39042',
      ordercode: 'SO39042',
      so_residual: '750000',
      paid_amount: '750000.00',
      order_line_count: '1',
      sostate: 'sale',
      doctorname: 'Lê Thị Trang',
      assistantname: 'DungBTT Sale online',
      dentalaidename: 'BÙI NGỌC TÚ QUYÊN',
      companyname: 'Tấm Dentist Quận 10',
    });

    expect(service.service).toBe('Trám thẩm mỹ');
    expect(service.catalogItemId).toBe('c1835411-4b21-4bbf-9985-b23400b65620');
    expect(service.cost).toBe(750000);
    expect(service.paidAmount).toBe(750000);
    expect(service.residual).toBe(0);
    expect(service.doctorId).toBe('58a26a1d-d02c-4358-b326-b30100a8268a');
    expect(service.dentalAideId).toBe('dental-aide-id');
    expect(service.assistantName).toBe('DungBTT Sale online');
    expect(service.dentalAideName).toBe('BÙI NGỌC TÚ QUYÊN');
    expect(service.orderName).toBe('SO39042');
  });

  it('maps sale order fallback fields needed by the service edit form', () => {
    const service = mapSaleOrderLineToCustomerService({
      id: '0b9cc668-3b87-42d3-a2ec-f5b9d934f53d',
      orderid: '27791c00-a277-4319-b9d2-e1a1669d49b0',
      ordercode: 'SO-2026-0036',
      productid: '5eafc39e-a61b-443c-961d-e55a61dab0ec',
      productname: 'Cắt cầu răng',
      productuomqty: '1',
      pricetotal: '1',
      amountpaid: '0',
      amountresidual: '1',
      date: '2026-04-26',
      employeeid: 'e401ca93-5bd3-4a20-8571-b15200c1ae94',
      companyid: 'f0f6361e-b99d-4ac7-4108-08dd8159c64a',
      unit: 'răng',
      sourceid: 'source-id',
      note: 'order note',
      order_line_count: '1',
      sostate: 'sale',
    });

    expect(service.date).toBe('2026-04-26');
    expect(service.service).toBe('Cắt cầu răng');
    expect(service.catalogItemId).toBe('5eafc39e-a61b-443c-961d-e55a61dab0ec');
    expect(service.doctorId).toBe('e401ca93-5bd3-4a20-8571-b15200c1ae94');
    expect(service.locationId).toBe('f0f6361e-b99d-4ac7-4108-08dd8159c64a');
    expect(service.unit).toBe('răng');
    expect(service.sourceId).toBe('source-id');
    expect(service.notes).toBe('order note');
  });
});
