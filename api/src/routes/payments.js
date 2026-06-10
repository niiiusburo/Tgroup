/**
 * @crossref:domain[payments-deposits]
 * @crossref:used-in[Express router for /api/Payments: mounted in api/src/server.js; called by website/src/lib/api/payments.ts]
 * @crossref:uses[api/src/db.js (getQuery, pool), api/src/middleware/auth.js, api/src/middleware/validate.js, api/src/routes/payments/helpers.js, product-map/domains/payments-deposits.yaml]
 * @crossref:endpoint[POST /api/Payments, POST /api/Payments/refund, DELETE /api/Payments/:id, POST /api/Payments/:id/void]
 * @crossref:uses[api/src/services/commissionEngine.js, api/src/routes/payments/readHandlers.js, product-map/business-logic/payment-allocation.md]
 */
const express = require("express");
const router = express.Router();
const { pool, getQuery } = require("../db");
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
const { createEarningsForPayment, reverseOnRefund, _linesForPayment } = require("../services/commissionEngine"); // v3 per-service CTV commission — additive only, never touches legacy commission* tables

// GET /api/Payments - List payments with allocations
router.get("/", requirePermission('payment.view'), listPayments);
router.get("/deposits", requirePermission('payment.view'), listDeposits);
router.get("/deposit-usage", requirePermission('payment.view'), listDepositUsage);
router.get("/:id", requirePermission('payment.view'), getPaymentById);

// POST /api/Payments - Create a new payment with optional allocations
router.post("/", requirePermission('payment.add'), validate(PaymentCreateSchema), async (req, res) => {
  let client;
  try {
    const q = getQuery(req); // for any direct queries + generate
    const txPool = req.db || pool;
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
    const isExplicitDeposit = deposit_type === 'deposit' || deposit_type === 'refund';
    const looksLikeDeposit =
      isExplicitDeposit ||
      (!deposit_type &&
      !hasAllocations &&
      method !== "deposit" &&
      method !== "mixed" &&
      !service_id &&
      !(deposit_used > 0) &&
      parseFloat(amount) > 0);

    const payment_category = looksLikeDeposit ? 'deposit' : 'payment';

    if (looksLikeDeposit && !deposit_type) {
      deposit_type = "deposit";
    }

    client = await txPool.connect();
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

    // === Per-service CTV commission engine (v3) ===
    // Each allocation (payment -> saleorder) earns commission for the saleorder's attached
    // CTV (saleorders.ctv_id) + their upline chain, applied to the ALLOCATED (paid) amount.
    // No CTV on the service => no commission. Non-fatal: payment tx continues on error.
    //
    // INV-003C (Wave 2): when the service-card model is enabled, earnings are already born at
    // FULL price when the service card is created — paying must NOT create more (double-count).
    const serviceCardModel =
      process.env.CTV_SERVICE_CARD_COMMISSION === 'true' || process.env.CTV_SERVICE_CARD_COMMISSION === '1';
    try {
      const engineLines = serviceCardModel
        ? []
        : await _linesForPayment(row.id, { queryRows: (sql, p) => rowsFrom(client, sql, p) });
      if (engineLines.length > 0) {
        await createEarningsForPayment({
          payment: row,
          lines: engineLines,
          lob: req.lob || 'dental',
          clientRow: { id: customer_id },
          txClient: client,
        });
      }
    } catch (earningsErr) {
      console.error('[earnings hook] non-fatal error during payment create (tx continues):', earningsErr && earningsErr.message);
    }

    // === QR discount code auto-complete ===
    // When a customer with a checked-in discount code makes a payment,
    // mark the code as used and link it to this payment.
    try {
      await client.query(
        `UPDATE dbo.ctv_discount_codes
            SET status = 'used',
                used_at = now(),
                payment_id = $2
          WHERE customer_partner_id = $1
            AND status = 'checked_in'
          RETURNING code`,
        [customer_id, row.id]
      );
    } catch (qrErr) {
      console.error('[qr-discount hook] non-fatal error during payment create:', qrErr && qrErr.message);
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
    const q = getQuery(req);
    const { customer_id, amount, method, notes, payment_date, original_payment_id } = req.body;

    if (!customer_id || !amount || amount <= 0 || !method) {
      return res.status(400).json({ error: "customer_id, positive amount, and method are required" });
    }

    const receipt_number = await generateReceiptNumber(undefined, q);

    const result = await q(
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

    // v2 earnings: write negative reversal rows for this refund payment
    try {
      if (original_payment_id) {
        await reverseOnRefund({
          originalPaymentId: original_payment_id,
          refundPayment: row,
          lob: req.lob || 'dental',
        });
      }
    } catch (e) {
      console.error('[earnings hook] refund non-fatal:', e && e.message);
    }

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
  // Spec §9 (gap #11): direct payment edit is a legacy/internal gap, NOT a supported correction
  // workflow. The correction path is delete/void + create a new payment. Gated to NK3 via
  // PAYMENT_EDIT_DISABLED so NK/NK2 keep the legacy edit until migration.
  if (process.env.PAYMENT_EDIT_DISABLED === 'true' || process.env.PAYMENT_EDIT_DISABLED === '1') {
    return res.status(405).json({
      error: {
        code: 'B_PAYMENT_EDIT_DISABLED',
        message: 'Payments cannot be edited. Delete/void the payment and create a new, correct payment.',
      },
    });
  }
  try {
    const q = getQuery(req);
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
    const result = await q(sql, values);

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
  const q = getQuery(req);
  const txPool = req.db || pool;
  const client = await txPool.connect();
  try {
    // ?hard=true permanently removes the payment + its (pending) earnings; default is a
    // soft delete (status='deleted' + reversed earnings, row kept for audit).
    const hard = req.query.hard === 'true' || req.query.hard === '1';
    await client.query("BEGIN");

    // Commission guard: once a payment's commission has been PAID OUT it can no longer be
    // deleted (the money already left). Refund instead. Pending/un-attributed commission is fine.
    const paidOut = await client.query(
      "SELECT 1 FROM dbo.earnings WHERE payment_id = $1 AND (status = 'paid' OR payout_id IS NOT NULL) LIMIT 1",
      [id]
    );
    if (paidOut.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        error: {
          code: 'B_COMMISSION_PAID_OUT',
          message: 'Commission for this payment has already been paid out — it can no longer be deleted. Use a refund instead.',
        },
      });
    }

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

    let result;
    if (hard) {
      // HARD: commission is still pending (guard above), so its earnings rows are safe to
      // drop. Remove earnings FIRST to satisfy the earnings->payments FK, then the row.
      await client.query("DELETE FROM dbo.earnings WHERE payment_id = $1", [id]);
      result = await client.query("DELETE FROM payments WHERE id = $1 RETURNING id", [id]);
    } else {
      // SOFT (default, audit-safe): reverse the pending commission (negative rows) and keep
      // the payment row marked 'deleted' so the earnings FK + ledger history stay intact.
      try {
        await reverseOnRefund({ originalPaymentId: id, refundPayment: { id }, lob: req.lob || 'dental', txClient: client });
      } catch (e) {
        console.error('[earnings hook] delete reversal non-fatal:', e && e.message);
      }
      result = await client.query("UPDATE payments SET status = 'deleted' WHERE id = $1 RETURNING id", [id]);
    }

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Payment not found" });
    }

    await client.query("COMMIT");
    res.json({ success: true, id: result.rows[0].id, mode: hard ? 'hard' : 'soft' });
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
  const q = getQuery(req);
  const txPool = req.db || pool;
  const client = await txPool.connect();
  try {
    await client.query("BEGIN");

    // Same commission guard as delete: a paid-out payment can't be voided (would reverse
    // money that already left). Refund instead.
    const paidOut = await client.query(
      "SELECT 1 FROM dbo.earnings WHERE payment_id = $1 AND (status = 'paid' OR payout_id IS NOT NULL) LIMIT 1",
      [id]
    );
    if (paidOut.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        error: { code: 'B_COMMISSION_PAID_OUT', message: 'Commission for this payment has already been paid out — it can no longer be voided. Use a refund instead.' },
      });
    }

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

    // NK3 money integrity fix: reverse earnings on void (same as refund + delete).
    // The payment row stays (status=voided), so negatives are cleanly linked to it.
    // Only for nk3-deploy / local 5433 NK3 demo DBs.
    try {
      await reverseOnRefund({
        originalPaymentId: id,
        refundPayment: result.rows[0],
        lob: req.lob || 'dental',
        txClient: client,
      });
    } catch (e) {
      console.error('[earnings hook] void non-fatal:', e && e.message);
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
    const q = getQuery(req);
    const { id } = req.params;
    const { proofImageBase64, qrDescription } = req.body;

    if (!proofImageBase64 || typeof proofImageBase64 !== "string" || !proofImageBase64.startsWith("data:image/")) {
      return res.status(400).json({ error: "proofImageBase64 must be a non-empty string starting with data:image/" });
    }

    const result = await q(
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
