jest.mock('../src/middleware/auth', () => ({
  requireAuth: (_req, _res, next) => next(),
  requirePermission: () => (_req, _res, next) => next(),
}));

jest.mock('../src/db', () => {
  const query = jest.fn();
  return {
    query,
    withTransaction: jest.fn(async (work) => work(query)),
  };
});

const { query, withTransaction } = require('../src/db');
const customerSourcesRouter = require('../src/routes/customerSources');
const { createSaleOrder } = require('../src/routes/saleOrders/createSaleOrder');
const { updateSaleOrder } = require('../src/routes/saleOrders/updateSaleOrder');
const {
  CUSTOMER_SOURCE_NOT_SELECTABLE,
  getCustomerSourceSelectionError,
} = require('../src/routes/saleOrders/customerSourceSelection');

function responseDouble() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

function routeHandler(method, path) {
  const layer = customerSourcesRouter.stack.find(
    (entry) => entry.route?.path === path && entry.route.methods[method],
  );
  return layer.route.stack.at(-1).handle;
}

describe('customer source selection integrity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows null source values without querying lookup state', async () => {
    await expect(getCustomerSourceSelectionError(null)).resolves.toBeNull();
    expect(query).not.toHaveBeenCalled();
  });

  it('allows an active source for new data', async () => {
    query.mockResolvedValueOnce([{ is_active: true, already_selected: false }]);
    await expect(getCustomerSourceSelectionError('active-source')).resolves.toBeNull();
    expect(query.mock.calls[0][0]).toContain('FOR SHARE OF cs');
  });

  it('allows an existing inactive source to remain on the same order', async () => {
    query.mockResolvedValueOnce([{ is_active: false, already_selected: true }]);
    await expect(
      getCustomerSourceSelectionError('historical-source', 'existing-order'),
    ).resolves.toBeNull();
  });

  it.each([
    ['inactive source', [{ is_active: false, already_selected: false }]],
    ['missing source', []],
  ])('rejects a non-selectable %s', async (_label, rows) => {
    query.mockResolvedValueOnce(rows);
    await expect(getCustomerSourceSelectionError('blocked-source')).resolves.toEqual({
      error: 'Customer source is inactive or does not exist',
      code: CUSTOMER_SOURCE_NOT_SELECTABLE,
    });
  });

  it.each([
    ['inactive', [{ is_active: false, already_selected: false }]],
    ['missing', []],
  ])('blocks %s source IDs in sale-order create', async (_label, rows) => {
    query.mockResolvedValueOnce(rows);
    const res = responseDouble();

    await createSaleOrder({ body: { partnerid: 'partner', sourceid: 'inactive' } }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: CUSTOMER_SOURCE_NOT_SELECTABLE,
    }));
    expect(query).toHaveBeenCalledTimes(1);
    expect(withTransaction).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['inactive', [{ is_active: false, already_selected: false }]],
    ['missing', []],
  ])('blocks changing an existing order to an %s source', async (_label, rows) => {
    // INV-026 lock probe (FOR UPDATE + allocated paid) runs before selectability check.
    query
      .mockResolvedValueOnce([{
        id: 'order-id',
        order_sourceid: 'current-source',
        totalpaid: 0,
        datestart: '2026-07-10',
        datecreated: '2026-07-10',
        isdeleted: false,
      }])
      .mockResolvedValueOnce([{ totalpaid: 0 }])
      .mockResolvedValueOnce(rows);
    const res = responseDouble();

    await updateSaleOrder(
      { params: { id: 'order-id' }, body: { sourceid: 'inactive' } },
      res,
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: CUSTOMER_SOURCE_NOT_SELECTABLE,
    }));
    expect(query).toHaveBeenCalledTimes(3);
  });
});

describe('customer source reference guards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('includes sale-order references in source list counts', async () => {
    query.mockResolvedValueOnce([{
      id: 'source-id',
      name: 'Historical',
      is_active: false,
      customer_count: '0',
      order_count: '21',
    }]);
    const res = responseDouble();

    await routeHandler('get', '/')({ query: {} }, res);

    expect(query.mock.calls[0][0]).toContain('FROM dbo.saleorders');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      items: [expect.objectContaining({ customer_count: 0, order_count: 21 })],
    }));
  });

  it('refuses deletion when sale orders still reference the source', async () => {
    query
      .mockResolvedValueOnce([{ id: 'source-id' }])
      .mockResolvedValueOnce([{ customer_count: '0', order_count: '21' }]);
    const res = responseDouble();

    await routeHandler('delete', '/:id')({ params: { id: 'source-id' } }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Cannot delete source with existing customer or sale-order references',
      code: 'CUSTOMER_SOURCE_IN_USE',
      customerCount: 0,
      orderCount: 21,
    });
    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[0][0]).toContain('FOR UPDATE');
  });

  it('deletes an unreferenced source while holding its row lock', async () => {
    query
      .mockResolvedValueOnce([{ id: 'source-id' }])
      .mockResolvedValueOnce([{ customer_count: '0', order_count: '0' }])
      .mockResolvedValueOnce([]);
    const res = responseDouble();

    await routeHandler('delete', '/:id')({ params: { id: 'source-id' } }, res);

    expect(res.json).toHaveBeenCalledWith({ success: true });
    expect(query.mock.calls[2][0]).toContain('DELETE FROM dbo.customersources');
  });

  it('blocks renaming a referenced source so historical report labels stay stable', async () => {
    query
      .mockResolvedValueOnce([{ id: 'source-id', name: 'Historical', type: 'referral' }])
      .mockResolvedValueOnce([{ customer_count: '3', order_count: '7' }]);
    const res = responseDouble();

    await routeHandler('put', '/:id')({
      params: { id: 'source-id' },
      body: { name: 'Renamed source' },
    }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Cannot change name or type of a source referenced by customers or sale orders',
      code: 'CUSTOMER_SOURCE_LABEL_LOCKED',
      customerCount: 3,
      orderCount: 7,
      lockedFields: ['name'],
    });
    expect(query.mock.calls.some((call) => String(call[0]).includes('UPDATE dbo.customersources'))).toBe(false);
  });

  it('blocks type mutation when sale orders still reference the source', async () => {
    query
      .mockResolvedValueOnce([{ id: 'source-id', name: 'Historical', type: 'referral' }])
      .mockResolvedValueOnce([{ customer_count: '0', order_count: '21' }]);
    const res = responseDouble();

    await routeHandler('put', '/:id')({
      params: { id: 'source-id' },
      body: { type: 'online' },
    }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'CUSTOMER_SOURCE_LABEL_LOCKED',
      lockedFields: ['type'],
      orderCount: 21,
    }));
  });

  it('allows deactivation and description edits on referenced sources', async () => {
    query
      .mockResolvedValueOnce([{ id: 'source-id', name: 'Historical', type: 'referral' }])
      .mockResolvedValueOnce([{
        id: 'source-id',
        name: 'Historical',
        type: 'referral',
        description: 'kept for history',
        is_active: false,
      }])
      .mockResolvedValueOnce([{ customer_count: '3', order_count: '7' }]);
    const res = responseDouble();

    await routeHandler('put', '/:id')({
      params: { id: 'source-id' },
      body: { description: 'kept for history', is_active: false },
    }, res);

    expect(query.mock.calls[0][0]).toContain('FOR UPDATE');
    expect(query.mock.calls[1][0]).toContain('UPDATE dbo.customersources');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      id: 'source-id',
      name: 'Historical',
      is_active: false,
      customer_count: 3,
      order_count: 7,
    }));
  });

  it('allows name/type edits when the source is unreferenced', async () => {
    query
      .mockResolvedValueOnce([{ id: 'source-id', name: 'Scratch', type: 'offline' }])
      .mockResolvedValueOnce([{ customer_count: '0', order_count: '0' }])
      .mockResolvedValueOnce([{
        id: 'source-id',
        name: 'New Label',
        type: 'online',
        is_active: true,
      }]);
    const res = responseDouble();

    await routeHandler('put', '/:id')({
      params: { id: 'source-id' },
      body: { name: 'New Label', type: 'online' },
    }, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      name: 'New Label',
      type: 'online',
      customer_count: 0,
      order_count: 0,
    }));
  });

  it('treats repeated current name/type as a no-op on referenced sources', async () => {
    query
      .mockResolvedValueOnce([{ id: 'source-id', name: 'Historical', type: 'referral' }])
      .mockResolvedValueOnce([{
        id: 'source-id',
        name: 'Historical',
        type: 'referral',
        is_active: true,
      }])
      .mockResolvedValueOnce([{ customer_count: '2', order_count: '4' }]);
    const res = responseDouble();

    await routeHandler('put', '/:id')({
      params: { id: 'source-id' },
      body: { name: 'Historical', type: 'referral' },
    }, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Historical',
      type: 'referral',
      customer_count: 2,
      order_count: 4,
    }));
    expect(query.mock.calls.some((call) => (
      String(call[0]).includes('SELECT COUNT(*)') && String(call[0]).includes('partners')
    ))).toBe(true);
  });
});
