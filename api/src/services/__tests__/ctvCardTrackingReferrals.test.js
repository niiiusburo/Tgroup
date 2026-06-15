const {
  buildCardTrackingReferralsForLob,
  mergeReferralsAcrossLobs,
} = require('../ctvCardTrackingReferrals');

describe('ctvCardTrackingReferrals', () => {
  const ctvId = 'ctv-a';
  const clientId = 'client-1';

  function mockSafeQueryRows(responses) {
    const queue = [...responses];
    return async (_db, sql) => {
      const next = queue.shift();
      if (typeof next === 'function') return next(sql);
      return next ?? [];
    };
  }

  it('keeps clients when latest operational card (service) belongs to logged-in CTV', async () => {
    const rows = [{ id: clientId, name: 'Khách A', phone: '0901', referred_at: '2026-01-01' }];
    const safeQueryRows = mockSafeQueryRows([
      [{ id: clientId, total: 1000, cnt: 1 }],
      [],
      [{ id: clientId, line_id: 'line-1', name: 'DV A', amount: 1000, dt: '2026-02-01', residual: 0 }],
      [],
      [{ id: clientId, ctvId, ctvName: 'CTV A', dt: '2026-02-01' }],
      [{ id: clientId, ctvId, ctvName: 'CTV A', dt: '2026-02-01' }],
      [{
        id: clientId,
        earning_id: 'earn-1',
        line_id: 'line-1',
        name: 'DV A',
        amount: 1000,
        status: 'pending',
        earned_at: '2026-02-01',
        payment_id: null,
      }],
    ]);

    const items = await buildCardTrackingReferralsForLob({}, rows, ctvId, 'dental', safeQueryRows);
    expect(items).toHaveLength(1);
    expect(items[0].tracking_source).toBe('card');
    expect(items[0].linked_ctv_id).toBe(ctvId);
    expect(items[0].services).toHaveLength(1);
    expect(items[0].services[0].source).toBe('ctv');
  });

  it('services list is viewer earnings only — not other CTV cards or extra saleorder lines', async () => {
    const rows = [{ id: clientId, name: 'Khách Multi', phone: '0905', referred_at: '2026-01-01' }];
    const safeQueryRows = mockSafeQueryRows([
      [{ id: clientId, total: 500, cnt: 1 }],
      [],
      [
        { id: clientId, line_id: 'line-mine-1', name: 'My DV 1', amount: 500, dt: '2026-02-01', residual: 100 },
        { id: clientId, line_id: 'line-mine-2', name: 'My DV 2', amount: 800, dt: '2026-02-02', residual: 0 },
      ],
      [],
      [{ id: clientId, ctvId, ctvName: 'CTV A', dt: '2026-06-01' }],
      [{ id: clientId, ctvId, ctvName: 'CTV A', dt: '2026-06-01' }],
      [{
        id: clientId,
        earning_id: 'earn-only',
        line_id: 'line-mine-1',
        name: 'My DV 1',
        amount: 500,
        status: 'pending',
        earned_at: '2026-02-01',
        payment_id: 'pay-1',
      }],
    ]);

    const items = await buildCardTrackingReferralsForLob({}, rows, ctvId, 'dental', safeQueryRows);
    expect(items).toHaveLength(1);
    expect(items[0].services).toHaveLength(1);
    expect(items[0].services[0].serviceLineId).toBe('line-mine-1');
    expect(items[0].services[0].source).toBe('ctv');
    expect(items[0].stage).toBe('serviced');
  });

  it('shows appointment-only clients on Theo dõi when appointment ctv_id wins link', async () => {
    const rows = [{ id: clientId, name: 'Khách Appt', phone: '0902', referred_at: '2026-03-01' }];
    const safeQueryRows = mockSafeQueryRows([
      [], [], [], [],
      [{ id: clientId, ctvId, ctvName: 'CTV A', dt: '2026-03-15' }],
      [],
      [],
    ]);

    const items = await buildCardTrackingReferralsForLob({}, rows, ctvId, 'dental', safeQueryRows);
    expect(items).toHaveLength(1);
    expect(items[0].services).toHaveLength(0);
    expect(items[0].link_active).toBe(true);
  });

  it('drops clients when a newer operational card belongs to another CTV', async () => {
    const rows = [{ id: clientId, name: 'Khách B', phone: '0903', referred_at: '2026-01-01' }];
    const safeQueryRows = mockSafeQueryRows([
      [], [], [], [],
      [{ id: clientId, ctvId: 'ctv-other', ctvName: 'CTV B', dt: '2026-06-01' }],
      [{ id: clientId, ctvId: 'ctv-other', ctvName: 'CTV B', dt: '2026-06-01' }],
      [],
    ]);

    const items = await buildCardTrackingReferralsForLob({}, rows, ctvId, 'dental', safeQueryRows);
    expect(items).toHaveLength(0);
  });

  it('keeps independent per-LOB link windows when merging the same client', () => {
    const merged = mergeReferralsAcrossLobs(
      [{
        id: clientId,
        lobs: ['dental'],
        total_earned: 100,
        earned_count: 1,
        services: [],
        service_count: 0,
        stage: 'visited',
        stage_progress: 2,
        status: 'no visit yet',
        link_expires_at: '2026-12-01T00:00:00.000Z',
        link_anchor_at: '2026-06-01T00:00:00.000Z',
        linked_ctv_id: ctvId,
        linked_ctv_name: 'CTV A',
        link_active: true,
        eligible: false,
      }],
      [{
        id: clientId,
        lobs: ['cosmetic'],
        total_earned: 0,
        earned_count: 0,
        services: [],
        service_count: 0,
        stage: 'referred',
        stage_progress: 1,
        status: 'no visit yet',
        link_expires_at: null,
        link_anchor_at: null,
        linked_ctv_id: null,
        linked_ctv_name: null,
        link_active: false,
        eligible: true,
      }]
    );

    expect(merged).toHaveLength(1);
    expect(merged[0].lob_links.dental.link_active).toBe(true);
    expect(merged[0].lob_links.dental.eligible).toBe(false);
    expect(merged[0].lob_links.cosmetic.link_active).toBe(false);
    expect(merged[0].lob_links.cosmetic.eligible).toBe(true);
    expect(merged[0].link_expires_at).toBeNull();
    expect(merged[0].link_active).toBeUndefined();
  });

  /**
   * Spec §6 item 7 — reclaim: CTV-A had card (link expired), CTV-B new card wins.
   * A's build drops client; B keeps it on Theo dõi.
   */
  it('spec §6.7: CTV-A drops client after CTV-B wins latest card; B keeps it', async () => {
    const ctvA = 'ctv-a';
    const ctvB = 'ctv-b';
    const rows = [{ id: clientId, name: 'Reclaimed Client', phone: '0904', referred_at: '2025-06-01' }];

    const reclaimCardMocks = [
      [], [], [], [],
      [{ id: clientId, ctvId: ctvA, ctvName: 'CTV A', dt: '2024-07-01' }],
      [{ id: clientId, ctvId: ctvB, ctvName: 'CTV B', dt: '2026-06-10' }],
      [],
    ];

    const itemsA = await buildCardTrackingReferralsForLob(
      {},
      rows,
      ctvA,
      'dental',
      mockSafeQueryRows(reclaimCardMocks)
    );
    expect(itemsA).toHaveLength(0);

    const itemsB = await buildCardTrackingReferralsForLob(
      {},
      rows,
      ctvB,
      'dental',
      mockSafeQueryRows(reclaimCardMocks)
    );
    expect(itemsB).toHaveLength(1);
    expect(itemsB[0].linked_ctv_id).toBe(ctvB);
    expect(itemsB[0].link_active).toBe(true);
    expect(itemsB[0].eligible).toBe(false);
  });

  it('scopes visitAgg and payAgg to viewer ctv_id so other CTV cards do not advance stage', async () => {
    const rows = [{ id: clientId, name: 'Khách C', phone: '0904', referred_at: '2026-01-01' }];
    const captured = [];
    const safeQueryRows = async (_db, sql, params) => {
      captured.push({ sql: String(sql), params });
      if (sql.includes('FROM dbo.earnings')) return [];
      if (sql.includes('FROM payments')) return [];
      if (sql.includes('saleorderlines')) return [];
      if (sql.includes('FROM appointments WHERE partnerid')) return [];
      if (sql.includes('FROM dbo.appointments a')) {
        return [{ id: clientId, ctvId, ctvName: 'CTV A', dt: '2026-02-01' }];
      }
      if (sql.includes('FROM dbo.saleorders so') && sql.includes('DISTINCT ON')) return [];
      return [];
    };

    const items = await buildCardTrackingReferralsForLob({}, rows, ctvId, 'dental', safeQueryRows);
    expect(items).toHaveLength(1);
    expect(items[0].stage).toBe('referred');

    const visitSql = captured.find((c) => c.sql.includes('FROM appointments WHERE partnerid'));
    expect(visitSql.sql).toMatch(/ctv_id\s*=\s*\$2/i);
    expect(visitSql.params).toEqual([[clientId], ctvId]);

    const paySql = captured.find((c) => c.sql.includes('FROM payments'));
    expect(paySql.sql).toMatch(/so\.ctv_id\s*=\s*\$2/i);
    expect(paySql.params).toEqual([[clientId], ctvId]);

    const earnDetailSql = captured.find(
      (c) => c.sql.includes('FROM dbo.earnings e') && c.sql.includes('service_line_id')
    );
    expect(earnDetailSql.sql).toMatch(/recipient_partner_id\s*=\s*\$2/i);
    expect(earnDetailSql.params).toEqual([[clientId], ctvId]);
  });

  it('merges dental and cosmetic rows for the same client', () => {
    const merged = mergeReferralsAcrossLobs(
      [{
        id: clientId,
        lobs: ['dental'],
        total_earned: 100,
        earned_count: 1,
        services: [{ id: 'd1' }],
        service_count: 1,
        stage: 'serviced',
        stage_progress: 3,
        status: 'earning',
        link_expires_at: '2026-08-01T00:00:00.000Z',
        link_anchor_at: '2026-02-01T00:00:00.000Z',
        linked_ctv_id: ctvId,
        linked_ctv_name: 'CTV A',
        link_active: true,
        eligible: false,
      }],
      [{
        id: clientId,
        lobs: ['cosmetic'],
        total_earned: 50,
        earned_count: 1,
        services: [{ id: 'c1' }],
        service_count: 1,
        stage: 'paid',
        stage_progress: 4,
        status: 'paid',
        last_payment_at: '2026-03-01',
        link_expires_at: '2026-09-01T00:00:00.000Z',
        link_anchor_at: '2026-03-01T00:00:00.000Z',
        linked_ctv_id: ctvId,
        linked_ctv_name: 'CTV A',
        link_active: true,
        eligible: false,
      }]
    );

    expect(merged).toHaveLength(1);
    expect(merged[0].lobs).toEqual(['dental', 'cosmetic']);
    expect(merged[0].total_earned).toBe(150);
    expect(merged[0].stage_progress).toBe(4);
  });
});