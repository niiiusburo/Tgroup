const {
  buildCustomerDeltaPlan,
  normalizeRef,
} = require('../scripts/tdental-import/apply-live-customer-delta');

function liveResult(ref, id, name = 'Live Name') {
  return {
    source: {
      ref,
      name,
      phone: '0900000000',
      branch: 'Tấm Dentist Quận 3',
      rowCount: 1,
      rowNumbers: [12],
    },
    live: {
      exactRefMatches: [{
        id,
        ref,
        name,
        displayName: `[${ref}] ${name}`,
        phone: '0900000000',
        active: true,
        comment: 'Live note',
      }],
    },
  };
}

describe('TDental live customer delta plan', () => {
  it('updates by TDental UUID instead of creating a duplicate when the local ref is stale', () => {
    const plan = buildCustomerDeltaPlan({
      liveMatch: {
        results: [liveResult('T055281', 'f4fb222d-cb40-4bff-96c9-b37c0042851f', 'LÊ THỊ HOÀNG NGUYÊN')],
      },
      presence: {
        rows: [{ source_ref: 'T055281', bucket: 'present_in_partners_csv' }],
      },
      localRows: [{
        id: 'f4fb222d-cb40-4bff-96c9-b37c0042851f',
        ref: 'T164050',
        name: 'LÊ THỊ HOÀNG NGUYÊN - QL',
        companyid: 'company-q3',
      }],
      companies: [{ id: 'company-q3', name: 'Tấm Dentist Quận 3' }],
    });

    expect(plan.summary).toMatchObject({ update: 1, create: 0, duplicateRiskIfMatchedByRef: 1 });
    expect(plan.actions[0]).toMatchObject({
      type: 'update',
      id: 'f4fb222d-cb40-4bff-96c9-b37c0042851f',
      ref: 'T055281',
      localRef: 'T164050',
    });
    expect(plan.actions[0].changedFields).toContain('ref');
  });

  it('holds live-only refs when applying the RAR-backed bucket', () => {
    const plan = buildCustomerDeltaPlan({
      liveMatch: {
        results: [liveResult('T923080', '11111111-1111-4111-8111-111111111111', 'Trang Trần')],
      },
      presence: {
        rows: [{ source_ref: 'T923080', bucket: 'not_in_archive_csvs' }],
      },
      localRows: [],
      companies: [{ id: 'company-q3', name: 'Tấm Dentist Quận 3' }],
      bucket: 'present_in_partners_csv',
    });

    expect(plan.summary).toMatchObject({ create: 0, update: 0, held: 1 });
    expect(plan.held[0]).toMatchObject({
      ref: 'T923080',
      reason: 'live_only_not_in_downloads_csv',
    });
  });

  it('normalizes customer refs without merging people by phone or name', () => {
    expect(normalizeRef(' T160333 + 36 ')).toBe('T160333+36');
  });
});
