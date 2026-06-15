'use strict';

/**
 * Asserts GET /api/SaleOrders list SQL uses saleorders.ctv_id as authoritative CTV.
 * Uses the same SELECT fragment as api/src/routes/saleOrders.js.
 */

const LIST_SELECT_FRAGMENT = `
        p.referred_by_ctv_id AS ctv_id,
`;

const LIST_SELECT_EXPECTED = `
        so.ctv_id AS ctv_id,
`;

describe('GET /api/SaleOrders list SQL ctv_id authority', () => {
  it('list route source uses so.ctv_id not profile referred_by', () => {
    const fs = require('fs');
    const path = require('path');
    const source = fs.readFileSync(
      path.join(__dirname, '../../saleOrders.js'),
      'utf8'
    );
    expect(source).toContain(LIST_SELECT_EXPECTED.trim());
    expect(source).not.toContain(LIST_SELECT_FRAGMENT.trim());
  });
});