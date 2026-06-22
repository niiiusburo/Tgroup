'use strict';

/**
 * @crossref:domain[services-catalog]
 * @crossref:used-in[NK3 backend service function: api/src/services/serviceReversal, api/src/routes/saleOrderLines.js (DELETE service line)]
 * @crossref:uses[product-map/domains/services-catalog.yaml, docs/TEST-MATRIX.md, testbright.md]
 * @crossref:function[reverseServiceLine -> service reversal, paid-earning guard, payment allocation guard]
 * @crossref:uses[api/src/services/commissionEngine.js, api/src/routes/saleOrderLines.js, product-map/domains/payments-deposits.yaml]
 */
const { reverseOnRefund, reverseServiceCardEarnings } = require('./commissionEngine');

// NK3-only (INV-003C): when off, NK/NK2 keep pay-as-paid reversal — no service-card path.
function serviceCardCommissionEnabled() {
  return process.env.CTV_SERVICE_CARD_COMMISSION === 'true' || process.env.CTV_SERVICE_CARD_COMMISSION === '1';
}

class ServiceReversalError extends Error {
  constructor(status, code, message, details = {}) {
    super(message);
    this.name = 'ServiceReversalError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function rowsFrom(client, sql, params = []) {
  const result = await client.query(sql, params);
  return result.rows || [];
}

function moneySum(rows) {
  return rows.reduce((sum, row) => sum + (parseFloat(row.allocated_amount || 0) || 0), 0);
}

/**
 * Reverse a service line inside an existing transaction.
 *
 * Payment allocations are invoice/order scoped, not line scoped, so this only
 * auto-voids linked payments when the deleted line is the last active service
 * on the order and each affected payment belongs only to that invoice. Mixed
 * payment allocations must be voided through the payment flow first.
 */
async function reverseServiceLine({ lineId, lob = 'dental', txClient }) {
  if (!lineId) {
    throw new ServiceReversalError(400, 'VALIDATION', 'Sale order line id is required');
  }
  if (!txClient || typeof txClient.query !== 'function') {
    throw new Error('reverseServiceLine requires a transaction client');
  }

  const lineRows = await rowsFrom(
    txClient,
    `SELECT sol.id, sol.orderid
       FROM dbo.saleorderlines sol
      WHERE sol.id = $1 AND COALESCE(sol.isdeleted, false) = false
      FOR UPDATE`,
    [lineId]
  );

  const line = lineRows[0];
  if (!line) {
    throw new ServiceReversalError(404, 'B_SERVICE_LINE_NOT_FOUND', 'Sale order line not found');
  }
  if (serviceCardCommissionEnabled()) {
    const paidOutServiceCardRows = await rowsFrom(
      txClient,
      `SELECT id
         FROM dbo.earnings
        WHERE service_line_id = $1
          AND payment_id IS NULL
          AND amount > 0
          AND (status = 'paid' OR payout_id IS NOT NULL)
        LIMIT 1`,
      [lineId]
    );
    if (paidOutServiceCardRows.length > 0) {
      throw new ServiceReversalError(
        409,
        'B_COMMISSION_PAID_OUT',
        'Commission for this service has already been paid out — the service can no longer be reversed.',
        { serviceLineId: lineId, earningId: paidOutServiceCardRows[0].id }
      );
    }
  }

  const orderId = line.orderid || null;
  let activeLineCount = 1;
  let allocations = [];
  let voidedPayments = [];
  let reversedEarnings = [];
  let reversedAllocationTotal = 0;

  if (orderId) {
    const activeRows = await rowsFrom(
      txClient,
      `SELECT id
         FROM dbo.saleorderlines
        WHERE orderid = $1 AND COALESCE(isdeleted, false) = false
        FOR UPDATE`,
      [orderId]
    );
    activeLineCount = activeRows.length || 1;

    allocations = await rowsFrom(
      txClient,
      `SELECT pa.payment_id, pa.invoice_id, pa.dotkham_id, pa.allocated_amount
         FROM dbo.payment_allocations pa
         JOIN dbo.payments p ON p.id = pa.payment_id
        WHERE pa.invoice_id = $1
        FOR UPDATE`,
      [orderId]
    );

    const paymentIds = [...new Set(allocations.map((a) => a.payment_id).filter(Boolean))];
    if (paymentIds.length > 0) {
      const paidOutRows = await rowsFrom(
        txClient,
        `SELECT DISTINCT payment_id
           FROM dbo.earnings
          WHERE payment_id = ANY($1)
            AND (status = 'paid' OR payout_id IS NOT NULL)
          LIMIT 1`,
        [paymentIds]
      );
      if (paidOutRows.length > 0) {
        throw new ServiceReversalError(
          409,
          'B_COMMISSION_PAID_OUT',
          'Commission for this service has already been paid out — the service can no longer be reversed.',
          { paymentId: paidOutRows[0].payment_id }
        );
      }

      if (activeLineCount > 1) {
        throw new ServiceReversalError(
          409,
          'B_SERVICE_PAYMENT_REQUIRES_ORDER_VOID',
          'This service has paid allocations on an order with other active services. Void the payment first, then adjust the services.',
          { orderId, activeLineCount }
        );
      }

      const mixedRows = await rowsFrom(
        txClient,
        `SELECT payment_id, invoice_id, dotkham_id
           FROM dbo.payment_allocations
          WHERE payment_id = ANY($1)
            AND (dotkham_id IS NOT NULL OR invoice_id IS DISTINCT FROM $2)
          LIMIT 1`,
        [paymentIds, orderId]
      );
      if (mixedRows.length > 0) {
        throw new ServiceReversalError(
          409,
          'B_PAYMENT_MIXED_ALLOCATIONS',
          'A linked payment is allocated to other invoices or records. Void that payment first before reversing this service.',
          { paymentId: mixedRows[0].payment_id }
        );
      }

      for (const paymentId of paymentIds) {
        const reversals = await reverseOnRefund({
          originalPaymentId: paymentId,
          refundPayment: { id: paymentId },
          lob,
          txClient,
        });
        reversedEarnings = reversedEarnings.concat(reversals || []);
      }

      reversedAllocationTotal = moneySum(allocations);
      await txClient.query(
        'DELETE FROM dbo.payment_allocations WHERE invoice_id = $1 AND payment_id = ANY($2)',
        [orderId, paymentIds]
      );
      await txClient.query(
        'UPDATE dbo.saleorders SET residual = residual + $1 WHERE id = $2',
        [reversedAllocationTotal, orderId]
      );
      const paymentRows = await rowsFrom(
        txClient,
        `UPDATE dbo.payments
            SET status = 'voided',
                notes = CONCAT_WS(' | ', NULLIF(notes, ''), $2)
          WHERE id = ANY($1)
            AND COALESCE(status, 'posted') NOT IN ('voided', 'deleted')
          RETURNING id`,
        [paymentIds, `SERVICE_REVERSED:${lineId}`]
      );
      voidedPayments = paymentRows.map((row) => row.id);
    }
  }

  let reversedServiceCardEarnings = [];
  if (serviceCardCommissionEnabled()) {
    reversedServiceCardEarnings = await reverseServiceCardEarnings({
      serviceLineId: lineId,
      lob,
      txClient,
    });
  }

  const deletedRows = await rowsFrom(
    txClient,
    `UPDATE dbo.saleorderlines
        SET isdeleted = true,
            lastupdated = (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')
      WHERE id = $1 AND COALESCE(isdeleted, false) = false
      RETURNING id, orderid`,
    [lineId]
  );
  if (deletedRows.length === 0) {
    throw new ServiceReversalError(404, 'B_SERVICE_LINE_NOT_FOUND', 'Sale order line not found');
  }

  let deletedOrder = false;
  if (orderId && activeLineCount <= 1) {
    await txClient.query(
      `UPDATE dbo.saleorders
          SET isdeleted = true,
              lastupdated = (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')
        WHERE id = $1 AND COALESCE(isdeleted, false) = false`,
      [orderId]
    );
    deletedOrder = true;
  }

  return {
    success: true,
    id: deletedRows[0].id,
    orderId,
    deletedOrder,
    voidedPayments,
    reversedAllocationTotal,
    reversedEarningsCount: reversedEarnings.length,
    reversedServiceCardEarningsCount: reversedServiceCardEarnings.length,
  };
}

module.exports = {
  ServiceReversalError,
  reverseServiceLine,
};
