'use strict';

const {
  LEGACY_SOURCE_FALLBACK_VERSION,
  LEGACY_V1_EFFECTIVE_SOURCE_ID_SQL,
  resolveCreateOrderSourceId,
  orderAndCustomerSourceSelectSql,
} = require('../orderSourceSemantics');

describe('orderSourceSemantics', () => {
  it('keeps legacy coalesce versioned and explicit', () => {
    expect(LEGACY_SOURCE_FALLBACK_VERSION).toBe('legacy_coalesce_v1');
    expect(LEGACY_V1_EFFECTIVE_SOURCE_ID_SQL.so_p).toBe('COALESCE(so.sourceid, p.sourceid)');
  });

  it('select SQL exposes order and customer sources without COALESCE', () => {
    const sql = orderAndCustomerSourceSelectSql();
    expect(sql.select).toContain('so.sourceid AS sourceid');
    expect(sql.select).toContain('p.sourceid AS customersourceid');
    expect(sql.select).not.toMatch(/COALESCE\s*\(\s*so\.sourceid/i);
    expect(sql.joins).toContain('order_cs.id = so.sourceid');
    expect(sql.joins).toContain('cust_cs.id = p.sourceid');
  });

  it('create uses explicit order source when provided', async () => {
    const query = jest.fn();
    const id = await resolveCreateOrderSourceId(query, {
      partnerId: 'partner-1',
      sourceid: 'order-source',
    });
    expect(id).toBe('order-source');
    expect(query).not.toHaveBeenCalled();
  });

  it('create snapshots customer source when order source omitted/null/empty', async () => {
    const query = jest.fn().mockResolvedValue([{ sourceid: 'cust-source' }]);
    await expect(resolveCreateOrderSourceId(query, {
      partnerId: 'partner-1',
      sourceid: undefined,
    })).resolves.toBe('cust-source');
    await expect(resolveCreateOrderSourceId(query, {
      partnerId: 'partner-1',
      sourceid: null,
    })).resolves.toBe('cust-source');
    await expect(resolveCreateOrderSourceId(query, {
      partnerId: 'partner-1',
      sourceid: '',
    })).resolves.toBe('cust-source');
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('SELECT sourceid FROM partners'),
      ['partner-1'],
    );
  });

  it('create leaves null when customer has no source', async () => {
    const query = jest.fn().mockResolvedValue([{ sourceid: null }]);
    await expect(resolveCreateOrderSourceId(query, {
      partnerId: 'partner-1',
    })).resolves.toBeNull();
  });
});
