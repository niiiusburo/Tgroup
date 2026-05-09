const express = require("express");
const router = express.Router();
const { query, pool } = require("../db");
const { requirePermission } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const { PaymentCreateSchema, PaymentUpdateSchema } = require("@tgroup/contracts");
const { generateReceiptNumber, mapAllocations, rowsFrom, validateAllocationResidual } = require("./payments/helpers");
const {
  getPaymentById,
  listDepositUsage,
  listDeposits,
  listPayments,
} = require("./payments/readHandlers");

// GET /api/Payments - List payments with allocations
router.get("/", requirePermission('payment.view'), listPayments);
router.get("/deposits", requirePermission('payment.view'), listDeposits);
router.get("/deposit-usage", requirePermission('payment.view'), listDepositUsage);
router.get("/:id", requirePermission('payment.view'), getPaymentById);

// POST /api/Payments - Create a new payment with optional allocations
router.post("/", requirePermission('payment.add'), validate(PaymentCreateSchema), async (req, res) => {
  let client;
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

    // Determine payment_category explicitly
    const hasAllocations = Array.isArray(allocations) && allocations.some(a => parseFloat(a.allocated_amount || 0) > 0);
    const looksLikeDeposit =
      !deposit_type &&
      !hasAllocations &&
      method !== "deposit" &&
      method !== "mixed" &&
      !service_id &&
      !(deposit_used > 0) &&
      parseFloat(amount) > 0;

    const payment_category = looksLikeDeposit ? 'deposit' : 'payment';

    if (looksLikeDeposit) {
      deposit_type = "deposit";
    }

    client = await pool.connect();
    await client.query("BEGIN");

    if (deposit_type === "deposit" && !receipt_number) {
      receipt_number = await generateReceiptNumber("TUKH", client);
    }

    // Invariant: payment.amount.not-exceeding-residual (CRITICAL)
    const residualErr = await validateAllocationResidual(allocations, client);
    if (residualErr) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: residualErr });
    }

    const result = await rowsFrom(
      client,
      `INSERT INTO payments (
        customer_id, service_id, amount, method, notes,
        payment_date, reference_code, status,
        deposit_used, cash_amount, bank_amount,
        deposit_type, receipt_number, payment_category
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        customer_id, service_id || null, amount, method, notes || null,
        payment_date || null, reference_code || null, status || "posted",
        deposit_used || 0, cash_amount || 0, bank_amount || 0,
        deposit_type || null, receipt_number || null, payment_category,
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
        createdAllocations = await rowsFrom(client, allocSql, allocParams);

        for (const a of createdAllocations) {
          if (a.invoice_id) {
            await client.query(
              "UPDATE saleorders SET residual = GREATEST(0, residual - $1) WHERE id = $2",
              [a.allocated_amount, a.invoice_id]
            );
          } else if (a.dotkham_id) {
            await client.query(
              "UPDATE dotkhams SET amountresidual = GREATEST(0, amountresidual - $1) WHERE id = $2",
              [a.allocated_amount, a.dotkham_id]
            );
          }
        }
      }
    }

    await client.query("COMMIT");

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
    if (client) await client.query("ROLLBACK");
    console.error("Error creating payment:", error);
    res.status(500).json({ error: "Failed to create payment" });
  } finally {
    if (client) client.release();
  }
});

// POST /api/Payments/refund - Create a refund (negative deposit payment)
router.post("/refund", requirePermission('payment.refund'), async (req, res) => {
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
        deposit_used, cash_amount, bank_amount, payment_category
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        customer_id, -Math.abs(amount), method, notes || null,
        payment_date || null, "posted", "refund", receipt_number,
        0, 0, 0, "deposit",
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
router.patch("/:id", requirePermission('payment.add'), validate(PaymentUpdateSchema), async (req, res) => {
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
router.delete("/:id", requirePermission('payment.void'), async (req, res) => {
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
router.post("/:id/void", requirePermission('payment.void'), async (req, res) => {
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
router.post("/:id/proof", requirePermission('payment.add'), async (req, res) => {
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

// POST /api/Payments/:id/proof/confirm - Confirm latest payment proof receipt
router.post("/:id/proof/confirm", requirePermission('payment.confirm'), async (req, res) => {
  try {
    const { id } = req.params;
    const employeeId = req.user?.employeeId;

    if (!employeeId) {
      return res.status(401).json({ error: 'No token' });
    }

    const paymentRows = await query(
      `SELECT id, status
       FROM dbo.payments
       WHERE id = $1`,
      [id]
    );

    if (paymentRows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const paymentStatus = paymentRows[0]?.status || 'posted';
    if (paymentStatus !== 'posted') {
      return res.status(409).json({ error: `Cannot confirm receipt for payment status: ${paymentStatus}` });
    }

    const proofRows = await query(
      `SELECT id, confirmed_at, confirmed_by
       FROM dbo.payment_proofs
       WHERE payment_id = $1
       ORDER BY created_at DESC NULLS LAST, id DESC
       LIMIT 1`,
      [id]
    );

    if (proofRows.length === 0) {
      return res.status(404).json({ error: 'No receipt proof found' });
    }

    const proof = proofRows[0];
    if (proof.confirmed_at) {
      return res.json({
        success: true,
        proofId: proof.id,
        confirmedAt: proof.confirmed_at,
        confirmedBy: proof.confirmed_by,
        alreadyConfirmed: true,
      });
    }

    const updated = await query(
      `UPDATE dbo.payment_proofs
       SET confirmed_at = (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'),
           confirmed_by = $2
       WHERE id = $1 AND confirmed_at IS NULL
       RETURNING id, confirmed_at, confirmed_by`,
      [proof.id, employeeId]
    );

    if (updated.length === 0) {
      const latest = await query(
        `SELECT id, confirmed_at, confirmed_by
         FROM dbo.payment_proofs
         WHERE id = $1`,
        [proof.id]
      );
      const row = latest[0] || proof;
      return res.json({
        success: true,
        proofId: row.id,
        confirmedAt: row.confirmed_at,
        confirmedBy: row.confirmed_by,
        alreadyConfirmed: true,
      });
    }

    const row = updated[0];
    return res.json({
      success: true,
      proofId: row.id,
      confirmedAt: row.confirmed_at,
      confirmedBy: row.confirmed_by,
      alreadyConfirmed: false,
    });
  } catch (error) {
    console.error("Error confirming payment proof:", error);
    return res.status(500).json({ error: "Failed to confirm payment proof" });
  }
});

module.exports = router;
