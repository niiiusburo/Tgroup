const express = require('express');
const { query } = require('../db');

const router = express.Router();

/**
 * GET /api/CrmTasks/GetPagedV2
 * Query params: offset, limit, search, sortField, sortOrder, assignedUserId, stage, dateFrom, dateTo
 * Returns: {offset, limit, totalItems, items[], aggregates}
 *
 * WORK-01: Công việc (Work/Tasks) - Task management
 */
router.get('/GetPagedV2', async (req, res) => {
  try {
    const {
      offset = '0',
      limit = '20',
      search = '',
      sortField = 'datecreated',
      sortOrder = 'desc',
      assignedUserId = '',
      stage = '',
      dateFrom = '',
      dateTo = '',
    } = req.query;

    const offsetNum = parseInt(offset, 10);
    const limitNum = Math.min(parseInt(limit, 10), 500);

    const allowedSortFields = {
      datecreated: 'ct.datecreated',
      dateassign: 'ct.dateassign',
      datestart: 'ct.datestart',
      datedone: 'ct.datedone',
      dateexpire: 'ct.dateexpire',
      title: 'ct.title',
      stage: 'ct.stage',
      priority: 'ct.priority',
    };

    const orderByCol = allowedSortFields[sortField] || 'ct.datecreated';
    const orderDir = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const conditions = ['ct.active = true'];
    const params = [];
    let paramIdx = 1;

    if (assignedUserId) {
      conditions.push(`ct.assigneduserid = $${paramIdx}`);
      params.push(assignedUserId);
      paramIdx++;
    }

    if (stage !== '') {
      conditions.push(`ct.stage = $${paramIdx}`);
      params.push(parseInt(stage, 10));
      paramIdx++;
    }

    if (dateFrom) {
      conditions.push(`ct.dateassign >= $${paramIdx}`);
      params.push(dateFrom);
      paramIdx++;
    }
    if (dateTo) {
      conditions.push(`ct.dateassign <= $${paramIdx}`);
      params.push(dateTo);
      paramIdx++;
    }

    if (search) {
      conditions.push(
        `(ct.title ILIKE $${paramIdx} OR ct.description ILIKE $${paramIdx} OR p.displayname ILIKE $${paramIdx})`
      );
      params.push(`%${search}%`);
      paramIdx++;
    }

    const whereClause = conditions.join(' AND ');

    const items = await query(
      `SELECT
        ct.id,
        ct.title,
        ct.description,
        ct.stage,
        ct.dateassign,
        ct.datestart,
        ct.datedone,
        ct.dateexpire,
        ct.priority,
        ct.assigneduserid,
        au.name AS assignedusername,
        ct.partnerid,
        p.displayname AS partnername,
        p.ref AS partnercode,
        ct.resid,
        ct.resmodel,
        ct.resname,
        ct.leadid,
        ct.dotkhamid,
        ct.crmtasktypeid,
        ctt.name AS tasktypename,
        ct.crmtaskcategoryid,
        ctc.name AS categoryname,
        
        
        ct.result,
        ct.cancelreason,
        ct.refcode,
        ct.notifycount,
        ct.warningtime,
        ct.datenotify,
        ct.datecancel,
        ct.laststatuschange,
        ct.createdbyid,
        cb.name AS createdbyname,
        ct.writebyid,
        wb.name AS updatedbyname,
        ct.datecreated,
        ct.lastupdated
      FROM crmtasks ct
      LEFT JOIN partners p ON p.id = ct.partnerid
      LEFT JOIN crmtasktypes ctt ON ctt.id = ct.crmtasktypeid
      LEFT JOIN crmtaskcategories ctc ON ctc.id = ct.crmtaskcategoryid
      LEFT JOIN aspnetusers au ON au.id = ct.assigneduserid
      LEFT JOIN aspnetusers cb ON cb.id = ct.createdbyid
      LEFT JOIN aspnetusers wb ON wb.id = ct.writebyid
      WHERE ${whereClause}
      ORDER BY ${orderByCol} ${orderDir} NULLS LAST
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limitNum, offsetNum]
    );

    const countResult = await query(
      `SELECT COUNT(*) AS count FROM crmtasks ct WHERE ${whereClause}`,
      params
    );
    const totalItems = parseInt(countResult[0]?.count || '0', 10);

    const aggregatesResult = await query(
      `SELECT
        COUNT(CASE WHEN ct.stage = 0 THEN 1 END) AS newcount,
        COUNT(CASE WHEN ct.stage = 1 THEN 1 END) AS inprogresscount,
        COUNT(CASE WHEN ct.stage = 2 THEN 1 END) AS donecount,
        COUNT(CASE WHEN ct.stage = 3 THEN 1 END) AS cancelledcount,
        COUNT(CASE WHEN ct.priority = true THEN 1 END) AS prioritycount
      FROM crmtasks ct
      WHERE ${whereClause}`,
      params
    );

    const agg = aggregatesResult[0] || {};

    return res.json({
      offset: offsetNum,
      limit: limitNum,
      totalItems,
      items,
      aggregates: {
        byStage: {
          new: parseInt(agg.newcount || 0, 10),
          inProgress: parseInt(agg.inprogresscount || 0, 10),
          done: parseInt(agg.donecount || 0, 10),
          cancelled: parseInt(agg.cancelledcount || 0, 10),
        },
        priorityCount: parseInt(agg.prioritycount || 0, 10),
      },
    });
  } catch (err) {
    console.error('Error fetching CRM tasks:', err);
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
 * GET /api/CrmTaskCategories
 * Returns: Task categories for dropdown
 */
router.get('/Categories', async (req, res) => {
  try {
    const items = await query(
      `SELECT id, name, code, active, datecreated
       FROM crmtaskcategories
       WHERE active = true
       ORDER BY name`
    );

    return res.json({
      totalItems: items.length,
      items,
    });
  } catch (err) {
    console.error('Error fetching task categories:', err);
    return res.status(500).json({
      totalItems: 0,
      items: [],
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/CrmTaskTypes
 * Returns: Task types for dropdown
 */
router.get('/Types', async (req, res) => {
  try {
    const items = await query(
      `SELECT id, name, active, datecreated
       FROM crmtasktypes
       WHERE active = true
       ORDER BY name`
    );

    return res.json({
      totalItems: items.length,
      items,
    });
  } catch (err) {
    console.error('Error fetching task types:', err);
    return res.status(500).json({
      totalItems: 0,
      items: [],
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});


/**
 * GET /api/CrmTasks/:id
 * Returns: Single task with full details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const rows = await query(
      `SELECT
        ct.id,
        ct.title,
        ct.description,
        ct.stage,
        ct.dateassign,
        ct.datestart,
        ct.datedone,
        ct.dateexpire,
        ct.priority,
        ct.assigneduserid,
        au.name AS assignedusername,
        ct.partnerid,
        p.displayname AS partnername,
        p.ref AS partnercode,
        p.phone AS partnerphone,
        ct.resid,
        ct.resmodel,
        ct.resname,
        ct.leadid,
        ct.dotkhamid,
        ct.crmtasktypeid,
        ctt.name AS tasktypename,
        ct.crmtaskcategoryid,
        ctc.name AS categoryname,
        
        
        ct.result,
        ct.cancelreason,
        ct.refcode,
        ct.notifycount,
        ct.warningtime,
        ct.datenotify,
        ct.datecancel,
        ct.laststatuschange,
        ct.createdbyid,
        cb.name AS createdbyname,
        ct.writebyid,
        wb.name AS updatedbyname,
        ct.datecreated,
        ct.lastupdated
      FROM crmtasks ct
      LEFT JOIN partners p ON p.id = ct.partnerid
      LEFT JOIN crmtasktypes ctt ON ctt.id = ct.crmtasktypeid
      LEFT JOIN crmtaskcategories ctc ON ctc.id = ct.crmtaskcategoryid
      LEFT JOIN aspnetusers au ON au.id = ct.assigneduserid
      LEFT JOIN aspnetusers cb ON cb.id = ct.createdbyid
      LEFT JOIN aspnetusers wb ON wb.id = ct.writebyid
      WHERE ct.id = $1 AND ct.active = true`,
      [id]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    return res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching task:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

module.exports = router;
