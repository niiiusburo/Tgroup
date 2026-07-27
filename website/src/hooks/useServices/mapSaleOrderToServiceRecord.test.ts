import { describe, expect, it } from 'vitest';
import { mapSaleOrderToServiceRecord } from './mapSaleOrderToServiceRecord';
import type { ApiSaleOrder } from '@/lib/api';

function baseOrder(overrides: Partial<ApiSaleOrder> = {}): ApiSaleOrder {
  return {
    id: 'order-1',
    name: 'SO-1',
    datecreated: '2026-07-01T00:00:00',
    state: 'sale',
    partnerid: 'p1',
    partnername: 'A',
    partnerdisplayname: 'A',
    companyid: null,
    companyname: null,
    doctorid: null,
    doctorname: null,
    assistantid: null,
    assistantname: null,
    dentalaideid: null,
    dentalaidename: null,
    productid: null,
    productname: null,
    quantity: '1',
    unit: 'răng',
    amounttotal: '1000',
    residual: '1000',
    totalpaid: '0',
    datestart: '2026-07-01',
    dateend: null,
    notes: null,
    tooth_numbers: null,
    tooth_comment: null,
    sourceid: null,
    sourcename: null,
    lastupdated: null,
    ...overrides,
  };
}

describe('mapSaleOrderToServiceRecord source semantics', () => {
  it('maps direct order source only and keeps customer source separate', () => {
    const record = mapSaleOrderToServiceRecord(baseOrder({
      sourceid: 'order-src',
      sourcename: 'Sale Online',
      customersourceid: 'cust-src',
      customersourcename: 'Facebook',
    }));
    expect(record.sourceId).toBe('order-src');
    expect(record.sourceName).toBe('Sale Online');
    expect(record.customerSourceId).toBe('cust-src');
    expect(record.customerSourceName).toBe('Facebook');
  });

  it('does not inherit customer source into sourceId when order source is null', () => {
    const record = mapSaleOrderToServiceRecord(baseOrder({
      sourceid: null,
      sourcename: null,
      customersourceid: 'cust-src',
      customersourcename: 'Facebook',
    }));
    expect(record.sourceId).toBeNull();
    expect(record.customerSourceId).toBe('cust-src');
  });
});
