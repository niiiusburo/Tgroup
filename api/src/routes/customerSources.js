/**
 * Customer Sources API Routes
 * CRUD for customer acquisition sources
 */
const express = require('express');
const { query, withTransaction } = require('../db');
const { requirePermission } = require('../middleware/auth');

const router = express.Router();

const CUSTOMER_SOURCE_IN_USE = 'CUSTOMER_SOURCE_IN_USE';
const CUSTOMER_SOURCE_LABEL_LOCKED = 'CUSTOMER_SOURCE_LABEL_LOCKED';

async function getSourceReferenceCounts(transactionQuery, sourceId) {
  const usages = await transactionQuery(
    `SELECT
       (SELECT COUNT(*) FROM dbo.partners WHERE sourceid = $1) AS customer_count,
       (SELECT COUNT(*) FROM dbo.saleorders WHERE sourceid = $1) AS order_count`,
    [sourceId],
  );
  return {
    customerCount: parseInt(usages[0].customer_count, 10) || 0,
    orderCount: parseInt(usages[0].order_count, 10) || 0,
  };
}

function withCounts(row, customerCount = 0, orderCount = 0) {
  return {
    ...row,
    customer_count: customerCount,
    order_count: orderCount,
  };
}

// GET /api/CustomerSources - List all sources with customer counts
router.get('/', async (req, res) => {
  try {
    const { type, is_active } = req.query;

    let sql = `
      SELECT 
        cs.id, cs.name, cs.type, cs.description, cs.is_active,
        cs.created_at, cs.updated_at,
        COALESCE(pc.customer_count, 0) as customer_count,
        COALESCE(oc.order_count, 0) as order_count
      FROM dbo.customersources cs
      LEFT JOIN (
        SELECT sourceid, COUNT(*) as customer_count 
        FROM dbo.partners 
        WHERE sourceid IS NOT NULL 
        GROUP BY sourceid
      ) pc ON pc.sourceid = cs.id
      LEFT JOIN (
        SELECT sourceid, COUNT(*) as order_count
        FROM dbo.saleorders
        WHERE sourceid IS NOT NULL
        GROUP BY sourceid
      ) oc ON oc.sourceid = cs.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (type && type !== 'all') {
      paramCount++;
      sql += ` AND cs.type = $${paramCount}`;
      params.push(type);
    }
    if (is_active !== undefined && is_active !== '') {
      paramCount++;
      sql += ` AND cs.is_active = $${paramCount}`;
      params.push(is_active === 'true');
    }

    sql += ' ORDER BY cs.name';

    const sources = await query(sql, params);
    const items = sources.map((source) => ({
      ...source,
      customer_count: parseInt(source.customer_count || 0, 10),
      order_count: parseInt(source.order_count || 0, 10),
    }));

    res.json({
      offset: 0,
      limit: 100,
      totalItems: items.length,
      items,
      aggregates: {
        total: items.length,
        active: items.filter(s => s.is_active).length,
        totalCustomers: items.reduce((sum, s) => sum + s.customer_count, 0),
        topSource: [...items].sort((a, b) => b.customer_count - a.customer_count)[0]?.name || '-'
      }
    });
  } catch (err) {
    console.error('CustomerSources GET error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/CustomerSources/:id
router.get('/:id', async (req, res) => {
  try {
    const sources = await query(
      'SELECT * FROM dbo.customersources WHERE id = $1',
      [req.params.id]
    );

    if (sources.length === 0) {
      return res.status(404).json({ error: 'Source not found' });
    }

    const { customerCount, orderCount } = await getSourceReferenceCounts(query, req.params.id);

    res.json(withCounts(sources[0], customerCount, orderCount));
  } catch (err) {
    console.error('CustomerSources GET/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/CustomerSources - Create new source
router.post('/', requirePermission('settings.edit'), async (req, res) => {
  try {
    const { name, type, description, is_active } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const result = await query(
      `INSERT INTO dbo.customersources (name, type, description, is_active)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, type || 'offline', description, is_active !== false]
    );

    res.status(201).json(withCounts(result[0], 0, 0));
  } catch (err) {
    console.error('CustomerSources POST error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/CustomerSources/:id
// Referenced sources: name/type are immutable (historical report labels).
// description and is_active remain mutable. Semantic renames use POST (new row).
router.put('/:id', requirePermission('settings.edit'), async (req, res) => {
  try {
    const { name, type, description, is_active } = req.body;

    if (name === undefined && type === undefined && description === undefined && is_active === undefined) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const outcome = await withTransaction(async (transactionQuery) => {
      const locked = await transactionQuery(
        'SELECT id, name, type FROM dbo.customersources WHERE id = $1 FOR UPDATE',
        [req.params.id],
      );
      if (locked.length === 0) {
        return { status: 404, body: { error: 'Source not found' } };
      }

      const current = locked[0];
      const nameChanging = name !== undefined && name !== current.name;
      const typeChanging = type !== undefined && type !== current.type;

      let customerCount = 0;
      let orderCount = 0;
      if (nameChanging || typeChanging) {
        const refs = await getSourceReferenceCounts(transactionQuery, req.params.id);
        customerCount = refs.customerCount;
        orderCount = refs.orderCount;
        if (customerCount > 0 || orderCount > 0) {
          const lockedFields = [];
          if (nameChanging) lockedFields.push('name');
          if (typeChanging) lockedFields.push('type');
          return {
            status: 400,
            body: {
              error: 'Cannot change name or type of a source referenced by customers or sale orders',
              code: CUSTOMER_SOURCE_LABEL_LOCKED,
              customerCount,
              orderCount,
              lockedFields,
            },
          };
        }
      }

      const updates = [];
      const values = [];
      let paramIdx = 1;
      const fields = { name, type, description, is_active };
      for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined) {
          updates.push(`${key} = $${paramIdx}`);
          values.push(value);
          paramIdx++;
        }
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(req.params.id);

      const result = await transactionQuery(
        `UPDATE dbo.customersources SET ${updates.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
        values,
      );

      if (!(nameChanging || typeChanging)) {
        const refs = await getSourceReferenceCounts(transactionQuery, req.params.id);
        customerCount = refs.customerCount;
        orderCount = refs.orderCount;
      }

      return {
        status: 200,
        body: withCounts(result[0], customerCount, orderCount),
      };
    });
    return res.status(outcome.status).json(outcome.body);
  } catch (err) {
    console.error('CustomerSources PUT error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/CustomerSources/:id
router.delete('/:id', requirePermission('settings.edit'), async (req, res) => {
  try {
    const outcome = await withTransaction(async (transactionQuery) => {
      const locked = await transactionQuery(
        'SELECT id FROM dbo.customersources WHERE id = $1 FOR UPDATE',
        [req.params.id],
      );
      if (locked.length === 0) {
        return { status: 404, body: { error: 'Source not found' } };
      }

      const { customerCount, orderCount } = await getSourceReferenceCounts(
        transactionQuery,
        req.params.id,
      );

      if (customerCount > 0 || orderCount > 0) {
        return {
          status: 400,
          body: {
            error: 'Cannot delete source with existing customer or sale-order references',
            code: CUSTOMER_SOURCE_IN_USE,
            customerCount,
            orderCount,
          },
        };
      }

      await transactionQuery(
        'DELETE FROM dbo.customersources WHERE id = $1',
        [req.params.id],
      );
      return { status: 200, body: { success: true } };
    });
    return res.status(outcome.status).json(outcome.body);
  } catch (err) {
    console.error('CustomerSources DELETE error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
module.exports.CUSTOMER_SOURCE_IN_USE = CUSTOMER_SOURCE_IN_USE;
module.exports.CUSTOMER_SOURCE_LABEL_LOCKED = CUSTOMER_SOURCE_LABEL_LOCKED;
