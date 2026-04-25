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
});
