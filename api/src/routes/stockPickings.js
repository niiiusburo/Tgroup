const express = require('express');
const { query } = require('../db');
const { requirePermission } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/StockPickings
 * Query params: offset, limit, search, pickingType, state, location_id
 * Returns: {offset, limit, totalItems, items[], aggregates}
 *
 * Picking Types:
 * - incoming: Nhập kho (receipts)
 * - outgoing: Xuất kho (deliveries)
 * - internal: Chuyển kho nội bộ
 */
router.get('/', async (req, res) => {
  try {
    const {
      offset = '0',
      limit = '20',
      search = '',
      pickingType = '',
      state = '',
      location_id = '',
      partner_id = '',
      sortField = 'datecreated',
      sortOrder = 'desc',
    } = req.query;

    const offsetNum = parseInt(offset, 10);
    const limitNum = Math.min(parseInt(limit, 10), 500);

    const allowedSortFields = {
      name: 'sp.name',
      date: 'sp.date',
      datedone: 'sp.datedone',
      state: 'sp.state',
      datecreated: 'sp.datecreated',
      totalamount: 'sp.totalamount',
    };

    const orderByCol = allowedSortFields[sortField] || 'sp.datecreated';
    const orderDir = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const conditions = [];
    const params = [];
    let paramIdx = 1;

    // Filter by picking type (incoming/outgoing/internal)
    if (pickingType) {
      conditions.push(`spt.code = $${paramIdx}`);
      params.push(pickingType);
      paramIdx++;
    }

    // Filter by state (draft, assigned, done, cancelled)
    if (state) {
      conditions.push(`sp.state = $${paramIdx}`);
      params.push(state);
      paramIdx++;
    }

    // Filter by location
    if (location_id) {
      conditions.push(`(sp.locationid = $${paramIdx} OR sp.locationdestid = $${paramIdx})`);
      params.push(location_id);
      paramIdx++;
    }

    // Filter by partner
    if (partner_id) {
      conditions.push(`sp.partnerid = $${paramIdx}`);
      params.push(partner_id);
      paramIdx++;
    }

    // Search by name, origin, or note
    if (search) {
      conditions.push(
        `(sp.name ILIKE $${paramIdx} OR sp.origin ILIKE $${paramIdx} OR sp.note ILIKE $${paramIdx})`
      );
      params.push(`%${search}%`);
      paramIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const items = await query(
      `SELECT
        sp.id,
        sp.name,
        sp.note,
        sp.state,
        sp.date,
        sp.datedone,
        sp.origin,
        sp.backdate,
        sp.totalamount,
        sp.active,
        sp.pickingtypeid,
        spt.name AS pickingtypename,
        spt.code AS pickingtypecode,
        sp.partnerid,
        p.name AS partnername,
        p.displayname AS partnerdisplayname,
        sp.companyid,
        c.name AS companyname,
        sp.locationid,
        loc.name AS locationname,
        sp.locationdestid,
        locdest.name AS locationdestname,
        sp.householdbusinessid,
        hb.name AS householdbusinessname,
        sp.createdbyid,
        au1.name AS createdbyname,
        sp.writebyid,
        au2.name AS updatedbyname,
        sp.datecreated,
        sp.lastupdated
      FROM stockpickings sp
      LEFT JOIN stockpickingtypes spt ON spt.id = sp.pickingtypeid
      LEFT JOIN partners p ON p.id = sp.partnerid
      LEFT JOIN companies c ON c.id = sp.companyid
      LEFT JOIN stocklocations loc ON loc.id = sp.locationid
      LEFT JOIN stocklocations locdest ON locdest.id = sp.locationdestid
      LEFT JOIN householdbusinesses hb ON hb.id = sp.householdbusinessid
      LEFT JOIN aspnetusers au1 ON au1.id = sp.createdbyid
      LEFT JOIN aspnetusers au2 ON au2.id = sp.writebyid
      ${whereClause}
      ORDER BY ${orderByCol} ${orderDir} NULLS LAST
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limitNum, offsetNum]
    );

    const countResult = await query(
      `SELECT COUNT(*) AS count FROM stockpickings sp
       LEFT JOIN stockpickingtypes spt ON spt.id = sp.pickingtypeid
       ${whereClause}`,
      params
    );
    const totalItems = parseInt(countResult[0]?.count || '0', 10);

    // Aggregates by state
    const aggregates = {
      total: totalItems,
      draft: 0,
      assigned: 0,
      done: 0,
      cancelled: 0,
    };

    try {
      const aggResult = await query(
        `SELECT
          COUNT(*) FILTER (WHERE sp.state = 'draft') AS draft,
          COUNT(*) FILTER (WHERE sp.state = 'assigned') AS assigned,
          COUNT(*) FILTER (WHERE sp.state = 'done') AS done,
          COUNT(*) FILTER (WHERE sp.state = 'cancelled') AS cancelled
        FROM stockpickings sp
        LEFT JOIN stockpickingtypes spt ON spt.id = sp.pickingtypeid
        ${whereClause}`,
        params
      );
      if (aggResult[0]) {
        aggregates.draft = parseInt(aggResult[0].draft || '0', 10);
        aggregates.assigned = parseInt(aggResult[0].assigned || '0', 10);
        aggregates.done = parseInt(aggResult[0].done || '0', 10);
        aggregates.cancelled = parseInt(aggResult[0].cancelled || '0', 10);
      }
    } catch (aggErr) {
      // Aggregates are optional
    }

    return res.json({
      offset: offsetNum,
      limit: limitNum,
      totalItems,
      items,
      aggregates,
    });
  } catch (err) {
    console.error('Error fetching stock pickings:', err);
    return res.status(500).json({
      offset: 0,
      limit: 20,
      totalItems: 0,
      items: [],
      aggregates: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/StockPickings/:id
 * Returns: full stock picking details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const rows = await query(
      `SELECT
        sp.id,
        sp.name,
        sp.note,
        sp.state,
        sp.date,
        sp.datedone,
        sp.origin,
        sp.backdate,
        sp.totalamount,
        sp.active,
        sp.pickingtypeid,
        spt.name AS pickingtypename,
        spt.code AS pickingtypecode,
        sp.partnerid,
        p.name AS partnername,
        p.displayname AS partnerdisplayname,
        p.phone AS partnerphone,
        sp.companyid,
        c.name AS companyname,
        sp.locationid,
        loc.name AS locationname,
        sp.locationdestid,
        locdest.name AS locationdestname,
        sp.householdbusinessid,
        hb.name AS householdbusinessname,
        sp.createdbyid,
        au1.name AS createdbyname,
        sp.writebyid,
        au2.name AS updatedbyname,
        sp.datecreated,
        sp.lastupdated
      FROM stockpickings sp
      LEFT JOIN stockpickingtypes spt ON spt.id = sp.pickingtypeid
      LEFT JOIN partners p ON p.id = sp.partnerid
      LEFT JOIN companies c ON c.id = sp.companyid
      LEFT JOIN stocklocations loc ON loc.id = sp.locationid
      LEFT JOIN stocklocations locdest ON locdest.id = sp.locationdestid
      LEFT JOIN householdbusinesses hb ON hb.id = sp.householdbusinessid
      LEFT JOIN aspnetusers au1 ON au1.id = sp.createdbyid
      LEFT JOIN aspnetusers au2 ON au2.id = sp.writebyid
      WHERE sp.id = $1`,
      [id]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Stock picking not found' });
    }

    return res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching stock picking:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/StockPickings
 * Creates a new stock picking (Import/Export/Internal transfer)
 */
router.post('/', requirePermission('settings.edit'), async (req, res) => {
  try {
    const {
      pickingtypeid,
      name,
      note,
      state = 'draft',
      date,
      origin,
      companyid,
      locationid,
      locationdestid,
      partnerid,
      householdbusinessid,
    } = req.body;

    if (!pickingtypeid) {
      return res.status(400).json({ error: 'pickingtypeid is required' });
    }
    if (!companyid) {
      return res.status(400).json({ error: 'companyid is required' });
    }
    if (!locationid) {
      return res.status(400).json({ error: 'locationid is required' });
    }
    if (!locationdestid) {
      return res.status(400).json({ error: 'locationdestid is required' });
    }

    const result = await query(
      `INSERT INTO stockpickings (
        id, pickingtypeid, name, note, state, date, datedone, origin,
        companyid, locationid, locationdestid, partnerid, householdbusinessid,
        totalamount, active, createdbyid, writebyid, datecreated, lastupdated
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12,
        0, true, null, null, (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'), (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')
      ) RETURNING *`,
      [
        pickingtypeid, name || null, note || null, state,
        date || null, null, origin || null,
        companyid, locationid, locationdestid,
        partnerid || null, householdbusinessid || null
      ]
    );

    return res.status(201).json(result[0]);
  } catch (err) {
    console.error('Error creating stock picking:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/StockPickings/:id
 * Updates a stock picking
 */
router.put('/:id', requirePermission('settings.edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const allowedFields = [
      'name', 'note', 'state', 'date', 'datedone', 'origin',
      'partnerid', 'locationid', 'locationdestid', 'householdbusinessid'
    ];

    const sets = [];
    const values = [];
    let idx = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        sets.push(`${key} = $${idx}`);
        values.push(value);
        idx++;
      }
    }

    if (sets.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    sets.push(`lastupdated = (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')`);
    values.push(id);

    const result = await query(
      `UPDATE stockpickings SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (!result || result.length === 0) {
      return res.status(404).json({ error: 'Stock picking not found' });
    }

    return res.json(result[0]);
  } catch (err) {
    console.error('Error updating stock picking:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /api/StockPickings/:id
 * Soft delete (cancel) a stock picking
 */
router.delete('/:id', requirePermission('settings.edit'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `UPDATE stockpickings SET state = 'cancelled', lastupdated = (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh') WHERE id = $1 RETURNING *`,
      [id]
    );

    if (!result || result.length === 0) {
      return res.status(404).json({ error: 'Stock picking not found' });
    }

    return res.json({ success: true, id });
  } catch (err) {
    console.error('Error cancelling stock picking:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

module.exports = router;
