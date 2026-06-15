const {
  classifyAttributionRow,
  enrichCommissionAttribution,
  mapCommissionApiRow,
  lineKey,
} = require('../ctvCommissionAttribution');

describe('ctvCommissionAttribution', () => {
  const viewer = 'ctv-viewer';

  test('lineKey joins service line and payment', () => {
    expect(lineKey('line-1', 'pay-1')).toBe('line-1::pay-1');
    expect(lineKey('line-1', null)).toBe('line-1::');
  });

  test('classifyAttributionRow: level 0 is service_attached even when profile referred_by matches', () => {
    const result = classifyAttributionRow(
      {
        level: 0,
        recipient_partner_id: viewer,
        client_referred_by_ctv_id: viewer,
        attributed_ctv_id: viewer,
      },
      viewer
    );
    expect(result).toEqual({
      attribution_kind: 'service_attached',
      override_level: 0,
      attributed_ctv_id: viewer,
    });
  });

  test('classifyAttributionRow: service attached when client not referred by viewer', () => {
    const result = classifyAttributionRow(
      {
        level: 0,
        recipient_partner_id: viewer,
        client_referred_by_ctv_id: 'other-ctv',
        attributed_ctv_id: viewer,
      },
      viewer
    );
    expect(result.attribution_kind).toBe('service_attached');
  });

  test('classifyAttributionRow: downline override when level > 0', () => {
    const result = classifyAttributionRow(
      {
        level: 1,
        recipient_partner_id: viewer,
        attributed_ctv_id: 'downline-ctv',
      },
      viewer
    );
    expect(result).toEqual({
      attribution_kind: 'downline_override',
      override_level: 1,
      attributed_ctv_id: 'downline-ctv',
    });
  });

  test('enrichCommissionAttribution resolves level-0 CTV for override rows', async () => {
    const dentalDb = {};
    const cosmeticDb = {};
    const safeQueryRows = jest.fn(async (db, sql, params) => {
      if (sql.includes('level = 0')) {
        return [{ service_line_id: 'line-a', payment_id: 'pay-1', recipient_partner_id: 'downline-1' }];
      }
      if (sql.includes('SELECT id, name')) {
        return [{ id: 'downline-1', name: 'Downline CTV' }];
      }
      return [];
    });

    const rows = [
      {
        id: 'e-1',
        lob: 'cosmetic',
        level: 1,
        recipient_partner_id: viewer,
        service_line_id: 'line-a',
        payment_id: 'pay-1',
        client_id: 'client-1',
        client_name: 'Test Client',
        client_referred_by_ctv_id: null,
        amount: '50000',
        status: 'pending',
        earned_at: '2026-06-14',
      },
    ];

    const enriched = await enrichCommissionAttribution(rows, viewer, {
      dentalDb,
      cosmeticDb,
      safeQueryRows,
    });

    expect(enriched[0].attributed_ctv_id).toBe('downline-1');
    expect(enriched[0].attributed_ctv_name).toBe('Downline CTV');
    expect(enriched[0].attribution_kind).toBe('downline_override');
    expect(enriched[0].override_level).toBe(1);
  });

  test('mapCommissionApiRow exposes attribution fields', () => {
    const api = mapCommissionApiRow({
      id: 'e-1',
      client_id: 'c-1',
      client_name: 'Client',
      service_line_id: 'l-1',
      service_name: 'Service',
      payment_id: null,
      amount: '1000',
      source: 'ctv',
      lob: 'dental',
      earned_at: '2026-06-14',
      status: 'pending',
      payout_id: null,
      level: 1,
      attribution_kind: 'downline_override',
      override_level: 1,
      attributed_ctv_id: 'd-1',
      attributed_ctv_name: 'Downline',
      client_referred_by_me: false,
    });
    expect(api.attribution_kind).toBe('downline_override');
    expect(api.attributed_ctv_name).toBe('Downline');
    expect(api.client_referred_by_me).toBe(false);
  });
});