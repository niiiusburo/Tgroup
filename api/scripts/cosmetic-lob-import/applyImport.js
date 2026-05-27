const {
  applyCustomers,
  applyDeposits,
  buildMapsFromSnapshot,
  ensureCompanies,
  ensureProducts,
  ensureStaff,
} = require('./apply');
const { applyTreatmentsAndPayments } = require('./applyTreatments');
const { refreshSnapshot } = require('./dbSnapshot');

async function applyCosmeticImport(client, source, plan, args) {
  if (plan.summary.anomalies > 0 && !args.allowManualReview) {
    throw new Error(`Dry-run found ${plan.summary.anomalies} anomaly row(s). Re-run with --allow-manual-review to skip them explicitly.`);
  }
  const maps = buildMapsFromSnapshot(await refreshSnapshot(client));
  const result = {};
  await client.query('BEGIN');
  try {
    result.companiesCreated = await ensureCompanies(client, plan, maps);
    result.staffCreated = await ensureStaff(client, plan, source, maps);
    result.productsCreated = await ensureProducts(client, plan, source, maps);
    result.customers = await applyCustomers(client, plan, source, maps);
    result.deposits = await applyDeposits(client, source, maps);
    const treatmentPaymentResult = await applyTreatmentsAndPayments(client, source, maps);
    result.treatments = treatmentPaymentResult.treatments;
    result.payments = treatmentPaymentResult.payments;
    result.anomaliesPreserved = plan.summary.anomalies;
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

module.exports = {
  applyCosmeticImport,
};
