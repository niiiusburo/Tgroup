import { describe, expect, it } from 'vitest';
import { mapSaleOrderLineToCustomerService } from './mapSaleOrderLines';

describe('mapSaleOrderLineToCustomerService', () => {
  it('renders UTC midnight service timestamps as the Vietnam calendar date', () => {
    const service = mapSaleOrderLineToCustomerService({
      id: 'line-1',
      date: '2025-11-13T17:00:00.000Z',
      productname: 'Phẫu thuật ghép xương bột',
      pricetotal: '5600000.00',
      amountpaid: '5600000.00',
      amountresidual: '0.00',
      productuomqty: '1.00',
      sostate: 'sale',
      tooth_numbers: null,
      toothtype: null,
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
      productname: 'Nhổ răng khôn hàm dưới',
      pricetotal: '0.00',
      amountpaid: '0.00',
      amountresidual: '0.00',
      productuomqty: '1.00',
    });

    expect(service.date).toBe('2025-06-22');
  });

  it('keeps plain date strings unchanged', () => {
    const service = mapSaleOrderLineToCustomerService({
      id: 'line-2',
      date: '2026-04-18',
      productname: 'Trám răng',
      pricetotal: '700000.00',
      amountpaid: '700000.00',
      productuomqty: '2.00',
      iscancelled: false,
    });

    expect(service.date).toBe('2026-04-18');
    expect(service.quantity).toBe(2);
  });

  it('uses backend paid_amount fallback when imported line amountpaid is zero', () => {
    const service = mapSaleOrderLineToCustomerService({
      id: 'line-direct-payment',
      orderid: 'order-direct-payment',
      date: '2026-02-11',
      productname: 'Niềng Mắc Cài Kim Loại Tiêu Chuẩn',
      pricetotal: '19200000.00',
      amountpaid: '0.00',
      amountresidual: '19200000.00',
      paid_amount: '3200000.00',
      order_line_count: '1',
      productuomqty: '1.00',
    });

    expect(service.paidAmount).toBe(3200000);
    expect(service.residual).toBe(16000000);
  });
});
