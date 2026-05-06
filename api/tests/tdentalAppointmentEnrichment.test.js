const {
  buildEnrichmentPlan,
  parseArgs,
} = require('../scripts/tdental-import/apply-appointment-spreadsheet-enrichment');

describe('TDental appointment spreadsheet enrichment', () => {
  it('plans updates for already-existing appointments by spreadsheet row number', () => {
    const plan = buildEnrichmentPlan({
      compareRows: [{
        rowNumber: '4564',
        localAppointmentId: '11111111-1111-4111-8111-111111111111',
      }],
      appointmentActions: [{
        rowNumber: 4564,
        source: { ref: 'KH0001' },
        datetime: '2026-05-22 08:00:00',
        time: '08:00',
        reason: 'LƯU Ý',
        doctorid: '22222222-2222-4222-8222-222222222222',
        assistantid: null,
        dentalaideid: null,
        isrepeatcustomer: true,
        state: 'scheduled',
      }],
    });

    expect(plan.summary).toMatchObject({
      requestedRows: 1,
      updateRows: 1,
      skippedRows: 0,
      withDoctor: 1,
    });
    expect(plan.updates[0]).toMatchObject({
      appointmentId: '11111111-1111-4111-8111-111111111111',
      rowNumber: 4564,
      ref: 'KH0001',
      datetime: '2026-05-22 08:00:00',
      time: '08:00',
      reason: 'LƯU Ý',
      doctorid: '22222222-2222-4222-8222-222222222222',
      isrepeatcustomer: true,
    });
    expect(plan.updates[0]).not.toHaveProperty('state');
  });

  it('skips rows that cannot be tied back to a local appointment id', () => {
    const plan = buildEnrichmentPlan({
      compareRows: [{ rowNumber: '12', localAppointmentId: '' }],
      appointmentActions: [{ rowNumber: 12, datetime: '2026-05-22 08:00:00' }],
    });

    expect(plan.summary).toMatchObject({ requestedRows: 1, updateRows: 0, skippedRows: 1 });
    expect(plan.skipped[0]).toMatchObject({ rowNumber: '12', reason: 'missing_compare_or_action' });
  });

  it('requires exactly one execution mode', () => {
    expect(() => parseArgs(['--appointments', 'a.xlsx', '--compare', 'compare.csv'])).toThrow(
      'Choose exactly one',
    );
    expect(parseArgs(['--appointments', 'a.xlsx', '--compare', 'compare.csv', '--dry-run'])).toMatchObject({
      appointments: 'a.xlsx',
      compare: 'compare.csv',
      dryRun: true,
      apply: false,
    });
  });
});
