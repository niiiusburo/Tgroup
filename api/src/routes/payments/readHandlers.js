const { query } = require("../../db");
const { mapAllocations } = require("./helpers");
const { addAccentInsensitiveSearchCondition, normalizedSql } = require("../../utils/search");

function mapPaymentRow(row, allocations = []) {
  return {
    id: row.id,
    customerId: row.customer_id,
    customerName: row.customer_name || '',
    customerPhone: row.customer_phone || '',
    serviceId: row.service_id,
    amount: parseFloat(row.amount),
    method: row.method,
    depositUsed: parseFloat(row.deposit_used || 0),
    cashAmount: parseFloat(row.cash_amount || 0),
    bankAmount: parseFloat(row.bank_amount || 0),
    notes: row.notes,
    paymentDate: row.payment_date,
    referenceCode: row.reference_code,
    status: row.status,
    receiptNumber: row.receipt_number,
    depositType: row.deposit_type,
    locationName: row.company_name || '',
    createdAt: row.created_at,
    allocations,
  };
}

async function loadPaymentAllocations(paymentIds) {
  if (paymentIds.length === 0) return [];
  const allocResult = await query(
    `SELECT pa.id, pa.payment_id, pa.invoice_id, pa.dotkham_id, pa.allocated_amount,
            so.name as invoice_name, so.code as invoice_code, so.amounttotal as invoice_total, so.residual as invoice_residual,
            NULL as dotkham_name, NULL as dotkham_total, NULL as dotkham_residual
     FROM payment_allocations pa
     LEFT JOIN saleorders so ON so.id = pa.invoice_id
     WHERE pa.payment_id = ANY($1) AND pa.invoice_id IS NOT NULL
     UNION ALL
     SELECT pa.id, pa.payment_id, pa.invoice_id, pa.dotkham_id, pa.allocated_amount,
            NULL, NULL, NULL, NULL,
            dk.name as dotkham_name, dk.totalamount as dotkham_total, dk.amountresidual as dotkham_residual
     FROM payment_allocations pa
     LEFT JOIN dotkhams dk ON dk.id = pa.dotkham_id
     WHERE pa.payment_id = ANY($1) AND pa.dotkham_id IS NOT NULL`,
    [paymentIds]
  );
  return mapAllocations(allocResult);
}

function appendPaymentFilters({ sql, params, customerId, serviceId, type, search }) {
  let nextSql = sql;
  const conditions = [];
  let paramIdx = params.length + 1;
  if (customerId) {
    conditions.push(`p.customer_id = $${paramIdx}`);
    params.push(customerId);
    paramIdx++;
  }
  if (serviceId) {
    conditions.push(`p.service_id = $${paramIdx}`);
    params.push(serviceId);
    paramIdx++;
  }
  if (type === 'payments') {
    conditions.push(`p.payment_category = 'payment'`);
  } else if (type === 'deposits') {
    conditions.push(`p.payment_category = 'deposit'`);
  }
  paramIdx = addPaymentSearchCondition({ conditions, params, search, paramIdx });
  if (conditions.length > 0) nextSql += ` AND ${conditions.join(' AND ')}`;
  return nextSql;
}

function addPaymentSearchCondition({ conditions, params, search, paramIdx }) {
  const trimmedSearch = typeof search === 'string' ? search.trim() : '';
  if (!trimmedSearch) return paramIdx;

  const before = conditions.length;
  const nextParamIdx = addAccentInsensitiveSearchCondition({
    conditions,
    params,
    columns: [
      'partner.name',
      'partner.ref',
      'partner.phone',
      'p.reference_code',
      'p.receipt_number',
      'p.notes',
    ],
    search: trimmedSearch,
    paramIdx,
  });

  const searchCondition = conditions.pop();
  if (conditions.length !== before || !searchCondition) return nextParamIdx;

  const rawParamIdx = nextParamIdx - 2;
  const normalizedParamIdx = nextParamIdx - 1;
  conditions.push(`(${searchCondition} OR EXISTS (
    SELECT 1
    FROM payment_allocations search_pa
    LEFT JOIN saleorders search_so ON search_so.id = search_pa.invoice_id
    WHERE search_pa.payment_id = p.id
      AND (
        search_so.code ILIKE $${rawParamIdx}
        OR search_so.name ILIKE $${rawParamIdx}
        OR ${normalizedSql('search_so.code')} LIKE $${normalizedParamIdx}
        OR ${normalizedSql('search_so.name')} LIKE $${normalizedParamIdx}
      )
  ))`);

  return nextParamIdx;
}

function paymentCountWhere({ customerId, serviceId, type, search }) {
  const conditions = ['1=1'];
  const params = [];
  let paramIdx = 1;
  if (customerId) {
    conditions.push(`p.customer_id = $${paramIdx}`);
    params.push(customerId);
    paramIdx++;
  }
  if (serviceId) {
    conditions.push(`p.service_id = $${paramIdx}`);
    params.push(serviceId);
    paramIdx++;
  }
  if (type === 'payments') {
    conditions.push(`p.payment_category = 'payment'`);
  } else if (type === 'deposits') {
    conditions.push(`p.payment_category = 'deposit'`);
  }
  addPaymentSearchCondition({ conditions, params, search, paramIdx });
  return { where: conditions.join(' AND '), params };
}

async function loadLegacyRows({ customerId, limit, offset }) {
  return query(
    `SELECT
       ap.id,
       ap.partnerid AS customer_id,
       partner.name AS customer_name,
       partner.phone AS customer_phone,
       NULL::uuid AS service_id,
       ap.amount,
       'cash' AS method,
       COALESCE(ap.communication, ap.name) AS notes,
       COALESCE(ap.paymentdate, ap.datecreated) AS created_at,
       ap.paymentdate AS payment_date,
       ap.name AS reference_code,
       CASE WHEN ap.state = 'posted' THEN 'posted' ELSE 'voided' END AS status,
       0 AS deposit_used,
       0 AS cash_amount,
       0 AS bank_amount,
       NULL AS receipt_number,
       NULL AS deposit_type,
       company.name AS company_name
     FROM accountpayments ap
     LEFT JOIN partners partner ON partner.id = ap.partnerid
     LEFT JOIN companies company ON company.id = partner.companyid
     WHERE ap.partnerid = $1
     ORDER BY ap.paymentdate DESC
     LIMIT $2 OFFSET $3`,
    [customerId, parseInt(limit), parseInt(offset)]
  );
}

async function listPayments(req, res) {
  try {
    const { customerId, serviceId, limit = 100, offset = 0, type, search } = req.query;
    const params = [];
    let sql = `
      SELECT
        p.id, p.customer_id, p.service_id,
        partner.name AS customer_name,
        partner.phone AS customer_phone,
        p.amount, p.method, p.notes, p.created_at,
        p.payment_date, p.reference_code, p.status,
        p.deposit_used, p.cash_amount, p.bank_amount,
        p.receipt_number, p.deposit_type,
        company.name AS company_name
      FROM payments p
      LEFT JOIN partners partner ON partner.id = p.customer_id
      LEFT JOIN companies company ON company.id = partner.companyid
      WHERE 1=1
    `;

    sql = appendPaymentFilters({ sql, params, customerId, serviceId, type, search });
    sql += ` ORDER BY p.created_at DESC LIMIT $` + (params.length + 1) + ` OFFSET $` + (params.length + 2);
    params.push(parseInt(limit), parseInt(offset));

    let result = await query(sql, params);
    let usedLegacyFallback = false;

    if (customerId && result.length === 0 && (!type || type === 'payments')) {
      try {
        const legacyRows = await loadLegacyRows({ customerId, limit, offset });
        if (legacyRows.length > 0) {
          result = legacyRows;
          usedLegacyFallback = true;
        }
      } catch (legacyErr) {
        console.warn("Legacy accountpayments fallback failed:", legacyErr.message);
      }
    }

    const count = paymentCountWhere({ customerId, serviceId, type, search });
    let countResult = await query(
      `SELECT COUNT(*)
       FROM payments p
       LEFT JOIN partners partner ON partner.id = p.customer_id
       WHERE ${count.where}`,
      count.params
    );
    let totalItems = parseInt(countResult[0]?.count || 0);

    if (customerId && totalItems === 0 && (!type || type === 'payments')) {
      try {
        const legacyCount = await query(
          `SELECT COUNT(*) FROM accountpayments ap WHERE ap.partnerid = $1`,
          [customerId]
        );
        totalItems = parseInt(legacyCount[0]?.count || 0);
      } catch {
        // ignore
      }
    }

    let allocations = [];
    if (!usedLegacyFallback) {
      try {
        allocations = await loadPaymentAllocations(result.map(r => r.id));
      } catch (allocErr) {
        console.warn("Payment allocations query failed, returning empty allocations:", allocErr.message);
      }
    }

    res.json({
      items: result.map(row => mapPaymentRow(
        row,
        allocations.filter(a => a.paymentId === row.id).map(a => ({ ...a }))
      )),
      totalItems,
    });
  } catch (error) {
    console.error("Error fetching payments:", error);
    res.status(500).json({ error: "Failed to fetch payments" });
  }
}

function appendDepositFilters({ sql, params, customerId, dateFrom, dateTo, receiptNumber, type }) {
  let nextSql = sql;
  if (customerId) {
    params.push(customerId);
    nextSql += ` AND p.customer_id = $` + params.length;
  }
  if (type === "deposit") {
    nextSql += ` AND p.deposit_type = 'deposit'`;
  } else if (type === "refund") {
    nextSql += ` AND (p.deposit_type = 'refund' OR p.amount < 0)`;
  }
  if (dateFrom) {
    params.push(dateFrom);
    nextSql += ` AND p.payment_date >= $` + params.length;
  }
  if (dateTo) {
    params.push(dateTo);
    nextSql += ` AND p.payment_date <= $` + params.length;
  }
  if (receiptNumber) {
    params.push(`%${receiptNumber}%`);
    nextSql += ` AND p.receipt_number ILIKE $` + params.length;
  }
  return nextSql;
}

async function listDeposits(req, res) {
  try {
    const {
      customerId,
      dateFrom,
      dateTo,
      receiptNumber,
      type = "all",
      limit = 100,
      offset = 0,
    } = req.query;
    const params = [];
    let sql = `
      SELECT
        p.id, p.customer_id, p.service_id,
        partner.name AS customer_name,
        partner.phone AS customer_phone,
        p.amount, p.method, p.notes, p.created_at,
        p.payment_date, p.reference_code, p.status,
        p.deposit_used, p.cash_amount, p.bank_amount,
        p.receipt_number, p.deposit_type,
        company.name AS company_name
      FROM payments p
      LEFT JOIN partners partner ON partner.id = p.customer_id
      LEFT JOIN companies company ON company.id = partner.companyid
      WHERE p.payment_category = 'deposit'
    `;

    sql = appendDepositFilters({ sql, params, customerId, dateFrom, dateTo, receiptNumber, type });
    const countSql = `SELECT COUNT(*) FROM payments p ${sql.slice(sql.indexOf("FROM payments p") + "FROM payments p".length)}`;
    const countResult = await query(countSql, [...params]);
    const totalItems = parseInt(countResult[0]?.count || 0);

    sql += ` ORDER BY p.created_at DESC LIMIT $` + (params.length + 1) + ` OFFSET $` + (params.length + 2);
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(sql, params);
    res.json({ items: result.map(row => mapPaymentRow(row)), totalItems });
  } catch (error) {
    console.error("Error fetching deposits:", error);
    res.status(500).json({ error: "Failed to fetch deposits" });
  }
}

async function listDepositUsage(req, res) {
  try {
    const { customerId, dateFrom, dateTo, limit = 100, offset = 0 } = req.query;
    const params = [];
    let sql = `
      SELECT
        p.id, p.customer_id, p.service_id,
        partner.name AS customer_name,
        partner.phone AS customer_phone,
        p.amount, p.method, p.notes, p.created_at,
        p.payment_date, p.reference_code, p.status,
        p.deposit_used, p.cash_amount, p.bank_amount,
        p.receipt_number, p.deposit_type,
        company.name AS company_name
      FROM payments p
      LEFT JOIN partners partner ON partner.id = p.customer_id
      LEFT JOIN companies company ON company.id = partner.companyid
      WHERE p.deposit_type = 'usage'
    `;

    if (customerId) {
      params.push(customerId);
      sql += ` AND p.customer_id = $` + params.length;
    }
    if (dateFrom) {
      params.push(dateFrom);
      sql += ` AND p.payment_date >= $` + params.length;
    }
    if (dateTo) {
      params.push(dateTo);
      sql += ` AND p.payment_date <= $` + params.length;
    }

    const countSql = `SELECT COUNT(*) FROM payments p ${sql.slice(sql.indexOf("FROM payments p") + "FROM payments p".length)}`;
    const countResult = await query(countSql, [...params]);
    const totalItems = parseInt(countResult[0]?.count || 0);

    sql += ` ORDER BY p.created_at DESC LIMIT $` + (params.length + 1) + ` OFFSET $` + (params.length + 2);
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(sql, params);
    res.json({ items: result.map(row => mapPaymentRow(row)), totalItems });
  } catch (error) {
    console.error("Error fetching deposit usage:", error);
    res.status(500).json({ error: "Failed to fetch deposit usage" });
  }
}

async function getPaymentById(req, res) {
  try {
    const { id } = req.params;
    const rows = await query(
      `SELECT p.id, p.customer_id, p.service_id,
              partner.name AS customer_name,
              partner.phone AS customer_phone,
              p.amount, p.method, p.notes, p.created_at,
              payment_date, reference_code, status, deposit_used, cash_amount, bank_amount,
              receipt_number, deposit_type,
              company.name AS company_name
       FROM payments p
       LEFT JOIN partners partner ON partner.id = p.customer_id
       LEFT JOIN companies company ON company.id = partner.companyid
       WHERE p.id = $1`,
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Payment not found" });

    let allocations = [];
    try {
      allocations = await loadPaymentAllocations([id]);
    } catch (allocErr) {
      console.warn("Payment allocations query failed, returning empty allocations:", allocErr.message);
    }

    res.json(mapPaymentRow(rows[0], allocations));
  } catch (error) {
    console.error("Error fetching payment:", error);
    res.status(500).json({ error: "Failed to fetch payment" });
  }
}

module.exports = {
  getPaymentById,
  listDepositUsage,
  listDeposits,
  listPayments,
};
