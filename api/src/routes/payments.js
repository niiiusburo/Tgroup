const express = require("express");
const router = express.Router();
const { query, pool } = require("../db");
const { requirePermission } = require("../middleware/auth");

function mapAllocations(allocResult) {
  return allocResult.map(a => {
    if (a.invoice_id) {
      return {
        id: a.id,
        paymentId: a.payment_id,
        invoiceId: a.invoice_id,
        invoiceName: a.invoice_name,
        invoiceTotal: parseFloat(a.invoice_total || 0),
        invoiceResidual: parseFloat(a.invoice_residual || 0),
        allocatedAmount: parseFloat(a.allocated_amount),
      };
    }
    return {
      id: a.id,
      paymentId: a.payment_id,
      dotkhamId: a.dotkham_id,
      dotkhamName: a.dotkham_name,
      dotkhamTotal: parseFloat(a.dotkham_total || 0),
      dotkhamResidual: parseFloat(a.dotkham_residual || 0),
      allocatedAmount: parseFloat(a.allocated_amount),
    };
  });
}

async function generateReceiptNumber(prefix = "TUKH") {
  const year = new Date().getFullYear();
  const result = await query(
    `INSERT INTO receipt_sequences (prefix, year, last_number)
     VALUES ($1, $2, 1)
     ON CONFLICT (prefix, year)
     DO UPDATE SET last_number = receipt_sequences.last_number + 1
     RETURNING last_number`,
    [prefix, year]
  );
  const num = result[0].last_number;
  return `${prefix}/${year}/${String(num).padStart(5, "0")}`;
}

async function checkInvoiceResidual(id, amt) {
  const r = await query("SELECT residual FROM saleorders WHERE id = $1", [id]);
  if (r.length === 0) return `Invoice ${id} not found`;
  const residual = parseFloat(r[0].residual || 0);
  if (amt > residual + 0.01) return 'Payment amount exceeds outstanding balance';
  return null;
}

async function checkDotkhamResidual(id, amt) {
  const r = await query("SELECT amountresidual FROM dotkhams WHERE id = $1", [id]);
  if (r.length === 0) return `Dotkham ${id} not found`;
  const residual = parseFloat(r[0].amountresidual || 0);
  if (amt > residual + 0.01) return 'Payment amount exceeds outstanding balance';
  return null;
}

async function checkOneAllocationResidual(a) {
  if ((!a.invoice_id && !a.dotkham_id) || a.allocated_amount == null) return null;
  const amt = parseFloat(a.allocated_amount);
  if (a.invoice_id) return checkInvoiceResidual(a.invoice_id, amt);
  return checkDotkhamResidual(a.dotkham_id, amt);
}

async function validateAllocationResidual(allocations) {
  if (!Array.isArray(allocations)) return null;
  for (const a of allocations) {
    const e = await checkOneAllocationResidual(a);
    if (e) return e;
  }
  return null;
}

// GET /api/Payments - List payments with allocations
// Falls back to accountpayments for historical records not yet migrated to payments table
router.get("/", async (req, res) => {
  try {
    const { customerId, limit = 100, offset = 0, type } = req.query;

    let sql = `
      SELECT
        p.id, p.customer_id, p.service_id,
        p.amount, p.method, p.notes, p.created_at,
        p.payment_date, p.reference_code, p.status,
        p.deposit_used, p.cash_amount, p.bank_amount,
        p.receipt_number, p.deposit_type
      FROM payments p
      WHERE 1=1
    `;
    const params = [];

    if (customerId) {
      params.push(customerId);
      sql += ` AND p.customer_id = $` + params.length;
    }

    if (type === 'payments') {
      // Payments that are allocated to invoices/dotkhams are always "payments"
      // even if they look like deposits on the surface
      sql += ` AND (
        EXISTS (SELECT 1 FROM payment_allocations pa WHERE pa.payment_id = p.id)
        OR NOT (
          p.deposit_type IN ('deposit', 'refund', 'usage')
          OR p.amount < 0
          OR p.method = 'deposit'
          OR p.deposit_used > 0
          OR (
            p.deposit_type IS NULL
            AND p.method IN ('cash', 'bank_transfer')
            AND p.service_id IS NULL
            AND (p.deposit_used IS NULL OR p.deposit_used = 0)
            AND p.amount > 0
          )
        )
      )`;
    } else if (type === 'deposits') {
      sql += ` AND (
        p.deposit_type IN ('deposit', 'refund')
        OR (
          p.deposit_type IS NULL
          AND p.method IN ('cash', 'bank_transfer')
          AND p.service_id IS NULL
          AND (p.deposit_used IS NULL OR p.deposit_used = 0)
          AND p.amount > 0
        )
      )`;
    }

    sql += ` ORDER BY p.created_at DESC LIMIT $` + (params.length + 1) + ` OFFSET $` + (params.length + 2);
    params.push(parseInt(limit), parseInt(offset));

    let result = await query(sql, params);
    let usedLegacyFallback = false;

    // Fallback: if no payments found for a customer, query historical accountpayments
    // Skip legacy fallback when type filter is applied since we cannot reliably classify legacy records
    if (customerId && result.length === 0 && !type) {
      try {
        const legacyRows = await query(
          `SELECT
             ap.id,
             ap.partnerid AS customer_id,
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
             NULL AS deposit_type
           FROM accountpayments ap
           WHERE ap.partnerid = $1 AND ap.state = 'posted'
           ORDER BY ap.paymentdate DESC
           LIMIT $2 OFFSET $3`,
          [customerId, parseInt(limit), parseInt(offset)]
        );
        if (legacyRows.length > 0) {
          result = legacyRows;
          usedLegacyFallback = true;
        }
      } catch (legacyErr) {
        console.warn("Legacy accountpayments fallback failed:", legacyErr.message);
      }
    }

    // Build count query with the SAME filters as the data query (including type)
    const countConditions = ['1=1'];
    const countParams = [];
    if (customerId) {
      countParams.push(customerId);
      countConditions.push(`p.customer_id = $${countParams.length}`);
    }
    if (type === 'payments') {
      countConditions.push(`(
        EXISTS (SELECT 1 FROM payment_allocations pa WHERE pa.payment_id = p.id)
        OR NOT (
          p.deposit_type IN ('deposit', 'refund', 'usage')
          OR p.amount < 0
          OR p.method = 'deposit'
          OR p.deposit_used > 0
          OR (
            p.deposit_type IS NULL
            AND p.method IN ('cash', 'bank_transfer')
            AND p.service_id IS NULL
            AND (p.deposit_used IS NULL OR p.deposit_used = 0)
            AND p.amount > 0
          )
        )
      )`);
    } else if (type === 'deposits') {
      countConditions.push(`(
        p.deposit_type IN ('deposit', 'refund')
        OR (
          p.deposit_type IS NULL
          AND p.method IN ('cash', 'bank_transfer')
          AND p.service_id IS NULL
          AND (p.deposit_used IS NULL OR p.deposit_used = 0)
          AND p.amount > 0
        )
      )`);
    }
    const countWhere = countConditions.join(' AND ');
    let countResult = await query(`SELECT COUNT(*) FROM payments p WHERE ${countWhere}`, countParams);
    let totalItems = parseInt(countResult[0]?.count || 0);

    // Legacy fallback only when no type filter and no payments found
    if (customerId && totalItems === 0 && !type) {
      try {
        const legacyCount = await query(
          `SELECT COUNT(*) FROM accountpayments ap WHERE ap.partnerid = $1 AND ap.state = 'posted'`,
          [customerId]
        );
        totalItems = parseInt(legacyCount[0]?.count || 0);
      } catch {
        // ignore
      }
    }

    const paymentIds = result.map(r => r.id);
    let allocations = [];
    if (paymentIds.length > 0 && !usedLegacyFallback) {
      try {
        const allocResult = await query(
          `SELECT pa.id, pa.payment_id, pa.invoice_id, pa.dotkham_id, pa.allocated_amount,
                  so.name as invoice_name, so.amounttotal as invoice_total, so.residual as invoice_residual,
                  NULL as dotkham_name, NULL as dotkham_total, NULL as dotkham_residual
           FROM payment_allocations pa
           LEFT JOIN saleorders so ON so.id = pa.invoice_id
           WHERE pa.payment_id = ANY($1) AND pa.invoice_id IS NOT NULL
           UNION ALL
           SELECT pa.id, pa.payment_id, pa.invoice_id, pa.dotkham_id, pa.allocated_amount,
                  NULL, NULL, NULL,
                  dk.name as dotkham_name, dk.totalamount as dotkham_total, dk.amountresidual as dotkham_residual
           FROM payment_allocations pa
           LEFT JOIN dotkhams dk ON dk.id = pa.dotkham_id
           WHERE pa.payment_id = ANY($1) AND pa.dotkham_id IS NOT NULL`,
          [paymentIds]
        );
        allocations = mapAllocations(allocResult);
      } catch (allocErr) {
        console.warn("Payment allocations query failed, returning empty allocations:", allocErr.message);
        allocations = [];
      }
    }

    res.json({
      items: result.map(row => ({
        id: row.id,
        customerId: row.customer_id,
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
        createdAt: row.created_at,
        allocations: allocations
          .filter(a => a.paymentId === row.id)
          .map(a => ({ ...a })),
      })),
      totalItems,
    });
  } catch (error) {
    console.error("Error fetching payments:", error);
    res.status(500).json({ error: "Failed to fetch payments" });
  }
});

// GET /api/Payments/deposits - List deposit top-ups and refunds
router.get("/deposits", async (req, res) => {
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

    let sql = `
      SELECT
        p.id, p.customer_id, p.service_id,
        p.amount, p.method, p.notes, p.created_at,
        p.payment_date, p.reference_code, p.status,
        p.deposit_used, p.cash_amount, p.bank_amount,
        p.receipt_number, p.deposit_type
      FROM payments p
      WHERE (
        p.deposit_type IN ('deposit', 'refund')
        OR (
          p.deposit_type IS NULL
          AND p.method IN ('cash', 'bank_transfer')
          AND p.service_id IS NULL
          AND (p.deposit_used IS NULL OR p.deposit_used = 0)
        )
      )
    `;
    const params = [];

    if (customerId) {
      params.push(customerId);
      sql += ` AND p.customer_id = $` + params.length;
    }

    if (type === "deposit") {
      sql += ` AND (
        p.deposit_type = 'deposit'
        OR (
          p.deposit_type IS NULL
          AND p.method IN ('cash', 'bank_transfer')
          AND p.service_id IS NULL
          AND (p.deposit_used IS NULL OR p.deposit_used = 0)
          AND p.amount > 0
        )
      )`;
    } else if (type === "refund") {
      sql += ` AND (p.deposit_type = 'refund' OR p.amount < 0)`;
    }

    if (dateFrom) {
      params.push(dateFrom);
      sql += ` AND p.payment_date >= $` + params.length;
    }
    if (dateTo) {
      params.push(dateTo);
      sql += ` AND p.payment_date <= $` + params.length;
    }
    if (receiptNumber) {
      params.push(`%${receiptNumber}%`);
      sql += ` AND p.receipt_number ILIKE $` + params.length;
    }

    const countSql = `SELECT COUNT(*) FROM payments p ${sql.slice(sql.indexOf("FROM payments p") + "FROM payments p".length)}`;
    const countResult = await query(countSql, [...params]);
    const totalItems = parseInt(countResult[0]?.count || 0);

    sql += ` ORDER BY p.created_at DESC LIMIT $` + (params.length + 1) + ` OFFSET $` + (params.length + 2);
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(sql, params);

    res.json({
      items: result.map(row => ({
        id: row.id,
        customerId: row.customer_id,
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
        createdAt: row.created_at,
        allocations: [],
      })),
      totalItems,
    });
  } catch (error) {
    console.error("Error fetching deposits:", error);
    res.status(500).json({ error: "Failed to fetch deposits" });
  }
});

// GET /api/Payments/deposit-usage - List deposit usage (withdrawals)
router.get("/deposit-usage", async (req, res) => {
  try {
    const { customerId, dateFrom, dateTo, limit = 100, offset = 0 } = req.query;

    let sql = `
      SELECT
        p.id, p.customer_id, p.service_id,
        p.amount, p.method, p.notes, p.created_at,
        p.payment_date, p.reference_code, p.status,
        p.deposit_used, p.cash_amount, p.bank_amount,
        p.receipt_number, p.deposit_type
      FROM payments p
      WHERE (
        p.deposit_type = 'usage'
        OR p.method = 'deposit'
        OR (p.deposit_used IS NOT NULL AND p.deposit_used > 0)
      )
    `;
    const params = [];

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

    res.json({
      items: result.map(row => ({
        id: row.id,
        customerId: row.customer_id,
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
        createdAt: row.created_at,
        allocations: [],
      })),
      totalItems,
    });
  } catch (error) {
    console.error("Error fetching deposit usage:", error);
    res.status(500).json({ error: "Failed to fetch deposit usage" });
  }
});

// GET /api/Payments/:id - Single payment with allocations
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const rows = await query(
      `SELECT id, customer_id, service_id, amount, method, notes, created_at,
              payment_date, reference_code, status, deposit_used, cash_amount, bank_amount,
              receipt_number, deposit_type
       FROM payments WHERE id = $1`,
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Payment not found" });

    const row = rows[0];
    let allocations = [];
    try {
      const allocResult = await query(
        `SELECT pa.id, pa.payment_id, pa.invoice_id, pa.dotkham_id, pa.allocated_amount,
                so.name as invoice_name, so.amounttotal as invoice_total, so.residual as invoice_residual,
                NULL as dotkham_name, NULL as dotkham_total, NULL as dotkham_residual
         FROM payment_allocations pa
         LEFT JOIN saleorders so ON so.id = pa.invoice_id
         WHERE pa.payment_id = $1 AND pa.invoice_id IS NOT NULL
         UNION ALL
         SELECT pa.id, pa.payment_id, pa.invoice_id, pa.dotkham_id, pa.allocated_amount,
                NULL, NULL, NULL,
                dk.name as dotkham_name, dk.totalamount as dotkham_total, dk.amountresidual as dotkham_residual
         FROM payment_allocations pa
         LEFT JOIN dotkhams dk ON dk.id = pa.dotkham_id
         WHERE pa.payment_id = $1 AND pa.dotkham_id IS NOT NULL`,
        [id]
      );
      allocations = mapAllocations(allocResult);
    } catch (allocErr) {
      console.warn("Payment allocations query failed, returning empty allocations:", allocErr.message);
      allocations = [];
    }

    res.json({
      id: row.id,
      customerId: row.customer_id,
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
      createdAt: row.created_at,
      allocations,
    });
  } catch (error) {
    console.error("Error fetching payment:", error);
    res.status(500).json({ error: "Failed to fetch payment" });
  }
});

// POST /api/Payments - Create a new payment with optional allocations
router.post("/", requirePermission('payment.edit'), async (req, res) => {
  try {
    let {
      customer_id, service_id, amount, method, notes,
      payment_date, reference_code, status,
      deposit_used, cash_amount, bank_amount,
      deposit_type, receipt_number,
      allocations
    } = req.body;

    if (!customer_id || amount === undefined || amount === null || !method || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: "customer_id, positive amount, and method are required" });
    }

    // Auto-detect deposit top-up if not explicitly typed
    const hasAllocations = Array.isArray(allocations) && allocations.some(a => parseFloat(a.allocated_amount || 0) > 0);
    const looksLikeDeposit =
      !deposit_type &&
      !hasAllocations &&
      method !== "deposit" &&
      method !== "mixed" &&
      !service_id &&
      !(deposit_used > 0) &&
      parseFloat(amount) > 0;

    if (looksLikeDeposit) {
      deposit_type = "deposit";
    }

    if (deposit_type === "deposit" && !receipt_number) {
      receipt_number = await generateReceiptNumber();
    }

    // Invariant: payment.amount.not-exceeding-residual (CRITICAL)
    const residualErr = await validateAllocationResidual(allocations);
    if (residualErr) {
      return res.status(400).json({ error: residualErr });
    }

    const result = await query(
      `INSERT INTO payments (
        customer_id, service_id, amount, method, notes,
        payment_date, reference_code, status,
        deposit_used, cash_amount, bank_amount,
        deposit_type, receipt_number
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        customer_id, service_id || null, amount, method, notes || null,
        payment_date || null, reference_code || null, status || "posted",
        deposit_used || 0, cash_amount || 0, bank_amount || 0,
        deposit_type || null, receipt_number || null,
      ]
    );

    const row = result[0];

    let createdAllocations = [];
    if (Array.isArray(allocations) && allocations.length > 0) {
      const allocValues = [];
      const allocParams = [];
      let idx = 1;
      for (const a of allocations) {
        if ((!a.invoice_id && !a.dotkham_id) || a.allocated_amount == null) continue;
        if (a.invoice_id) {
          allocValues.push(`($${idx}, $${idx + 1}, NULL, $${idx + 2})`);
          allocParams.push(row.id, a.invoice_id, a.allocated_amount);
        } else {
          allocValues.push(`($${idx}, NULL, $${idx + 1}, $${idx + 2})`);
          allocParams.push(row.id, a.dotkham_id, a.allocated_amount);
        }
        idx += 3;
      }
      if (allocValues.length > 0) {
        const allocSql = `
          INSERT INTO payment_allocations (payment_id, invoice_id, dotkham_id, allocated_amount)
          VALUES ${allocValues.join(", ")}
          RETURNING *
        `;
        createdAllocations = await query(allocSql, allocParams);

        for (const a of createdAllocations) {
          if (a.invoice_id) {
            await query(
              "UPDATE saleorders SET residual = GREATEST(0, residual - $1) WHERE id = $2",
              [a.allocated_amount, a.invoice_id]
            );
          } else if (a.dotkham_id) {
            await query(
              "UPDATE dotkhams SET amountresidual = GREATEST(0, amountresidual - $1) WHERE id = $2",
              [a.allocated_amount, a.dotkham_id]
            );
          }
        }
      }
    }

    res.status(201).json({
      id: row.id,
      customerId: row.customer_id,
      serviceId: row.service_id,
      amount: parseFloat(row.amount),
      method: row.method,
      notes: row.notes,
      paymentDate: row.payment_date,
      referenceCode: row.reference_code,
      status: row.status,
      depositUsed: parseFloat(row.deposit_used || 0),
      cashAmount: parseFloat(row.cash_amount || 0),
      bankAmount: parseFloat(row.bank_amount || 0),
      receiptNumber: row.receipt_number,
      depositType: row.deposit_type,
      createdAt: row.created_at,
      allocations: mapAllocations(createdAllocations.map(a => ({
        id: a.id,
        invoice_id: a.invoice_id,
        dotkham_id: a.dotkham_id,
        allocated_amount: a.allocated_amount,
        invoice_name: null,
        invoice_total: null,
        invoice_residual: null,
        dotkham_name: null,
        dotkham_total: null,
        dotkham_residual: null,
      }))),
    });
  } catch (error) {
    console.error("Error creating payment:", error);
    res.status(500).json({ error: "Failed to create payment" });
  }
});

// POST /api/Payments/refund - Create a refund (negative deposit payment)
router.post("/refund", requirePermission('payment.edit'), async (req, res) => {
  try {
    const { customer_id, amount, method, notes, payment_date } = req.body;

    if (!customer_id || !amount || amount <= 0 || !method) {
      return res.status(400).json({ error: "customer_id, positive amount, and method are required" });
    }

    const receipt_number = await generateReceiptNumber();

    const result = await query(
      `INSERT INTO payments (
        customer_id, amount, method, notes,
        payment_date, status, deposit_type, receipt_number,
        deposit_used, cash_amount, bank_amount
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        customer_id, -Math.abs(amount), method, notes || null,
        payment_date || null, "posted", "refund", receipt_number,
        0, 0, 0,
      ]
    );

    const row = result[0];
    res.status(201).json({
      id: row.id,
      customerId: row.customer_id,
      amount: parseFloat(row.amount),
      method: row.method,
      notes: row.notes,
      paymentDate: row.payment_date,
      status: row.status,
      receiptNumber: row.receipt_number,
      depositType: row.deposit_type,
      createdAt: row.created_at,
    });
  } catch (error) {
    console.error("Error creating refund:", error);
    res.status(500).json({ error: "Failed to create refund" });
  }
});

// PATCH /api/Payments/:id - Update payment
router.patch("/:id", requirePermission('payment.edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const allowedFields = [
      "amount",
      "method",
      "notes",
      "payment_date",
      "reference_code",
      "status",
      "deposit_type",
      "receipt_number",
    ];

    const fields = [];
    const values = [];
    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        fields.push(`${key} = $${fields.length + 1}`);
        values.push(updates[key]);
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    values.push(id);
    const sql = `UPDATE payments SET ${fields.join(", ")} WHERE id = $${values.length} RETURNING *`;
    const result = await query(sql, values);

    if (result.length === 0) {
      return res.status(404).json({ error: "Payment not found" });
    }

    const row = result[0];
    res.json({
      id: row.id,
      customerId: row.customer_id,
      serviceId: row.service_id,
      amount: parseFloat(row.amount),
      method: row.method,
      notes: row.notes,
      paymentDate: row.payment_date,
      referenceCode: row.reference_code,
      status: row.status,
      receiptNumber: row.receipt_number,
      depositType: row.deposit_type,
      createdAt: row.created_at,
    });
  } catch (error) {
    console.error("Error updating payment:", error);
    res.status(500).json({ error: "Failed to update payment" });
  }
});

// DELETE /api/Payments/:id - Delete payment and reverse allocations
router.delete("/:id", requirePermission('payment.edit'), async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const allocationsToReverse = await client.query(
      "SELECT invoice_id, dotkham_id, allocated_amount FROM payment_allocations WHERE payment_id = $1",
      [id]
    );

    await client.query("DELETE FROM payment_allocations WHERE payment_id = $1", [id]);

    for (const a of allocationsToReverse.rows) {
      if (a.invoice_id) {
        await client.query(
          "UPDATE saleorders SET residual = residual + $1 WHERE id = $2",
          [a.allocated_amount, a.invoice_id]
        );
      } else if (a.dotkham_id) {
        await client.query(
          "UPDATE dotkhams SET amountresidual = amountresidual + $1 WHERE id = $2",
          [a.allocated_amount, a.dotkham_id]
        );
      }
    }

    const result = await client.query("DELETE FROM payments WHERE id = $1 RETURNING id", [id]);
    if (result.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Payment not found" });
    }

    await client.query("COMMIT");
    res.json({ success: true, id: result.rows[0].id });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Delete error:", err);
    res.status(500).json({ error: "Failed to delete payment" });
  } finally {
    client.release();
  }
});

// POST /api/Payments/:id/void - Void payment and reverse allocations
router.post("/:id/void", requirePermission('payment.edit'), async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body || {};
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const allocationsToReverse = await client.query(
      "SELECT invoice_id, dotkham_id, allocated_amount FROM payment_allocations WHERE payment_id = $1",
      [id]
    );

    await client.query("DELETE FROM payment_allocations WHERE payment_id = $1", [id]);

    for (const a of allocationsToReverse.rows) {
      if (a.invoice_id) {
        await client.query(
          "UPDATE saleorders SET residual = residual + $1 WHERE id = $2",
          [a.allocated_amount, a.invoice_id]
        );
      } else if (a.dotkham_id) {
        await client.query(
          "UPDATE dotkhams SET amountresidual = amountresidual + $1 WHERE id = $2",
          [a.allocated_amount, a.dotkham_id]
        );
      }
    }

    const result = await client.query(
      `UPDATE payments SET status = 'voided', notes = COALESCE(notes, '') || ' | VOIDED: ' || $2 WHERE id = $1 AND status = 'posted' RETURNING *`,
      [id, reason || ""]
    );
    if (result.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Payment not found" });
    }
    await client.query("COMMIT");
    res.json({ success: true, payment: result.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Void error:", err);
    res.status(500).json({ error: "Failed to void payment" });
  } finally {
    client.release();
  }
});

// POST /api/Payments/:id/proof - Upload payment proof image
router.post("/:id/proof", requirePermission('payment.edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const { proofImageBase64, qrDescription } = req.body;

    if (!proofImageBase64 || typeof proofImageBase64 !== "string" || !proofImageBase64.startsWith("data:image/")) {
      return res.status(400).json({ error: "proofImageBase64 must be a non-empty string starting with data:image/" });
    }

    const result = await query(
      "INSERT INTO payment_proofs (payment_id, proof_image, qr_description) VALUES ($1, $2, $3) RETURNING *",
      [id, proofImageBase64, qrDescription || null]
    );

    const row = result[0];
    res.json({ success: true, proofId: row.id });
  } catch (error) {
    console.error("Error saving payment proof:", error);
    res.status(500).json({ error: "Failed to save payment proof" });
  }
});

module.exports = router;
