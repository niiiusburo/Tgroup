'use strict';

const {
  buildUnexpectedSourceChangeText,
  notifyUnexpectedSourceChange,
} = require('../sourceChangeAlert');

describe('sourceChangeAlert observability', () => {
  const event = {
    id: 'audit-1',
    entity_type: 'saleorder',
    entity_id: 'order-1',
    old_sourceid: 'src-a',
    new_sourceid: 'src-b',
    change_channel: 'api_patch',
    unexpected_reasons: ['paid', 'closed_period'],
    actor_employee_id: 'emp-1',
    request_id: 'req-1',
    transaction_id: 'tx-1',
    correction_manifest_ref: null,
    created_at: '2026-07-15T10:00:00Z',
  };

  it('formats a clear operator alert body', () => {
    const text = buildUnexpectedSourceChangeText(event);
    expect(text).toContain('[TGroup Source Audit] Unexpected paid/closed source change');
    expect(text).toContain('paid,closed_period');
    expect(text).toContain('order-1');
    expect(text).toContain('api_patch');
  });

  it('skips when webhook is not configured', async () => {
    const prev = process.env.LARK_FEEDBACK_WEBHOOK_URL;
    const prev2 = process.env.LARK_SOURCE_AUDIT_WEBHOOK_URL;
    delete process.env.LARK_FEEDBACK_WEBHOOK_URL;
    delete process.env.LARK_SOURCE_AUDIT_WEBHOOK_URL;

    const result = await notifyUnexpectedSourceChange(event);
    expect(result).toEqual({ ok: true, skipped: true, reason: 'not_configured' });

    if (prev !== undefined) process.env.LARK_FEEDBACK_WEBHOOK_URL = prev;
    if (prev2 !== undefined) process.env.LARK_SOURCE_AUDIT_WEBHOOK_URL = prev2;
  });

  it('posts to webhook when configured', async () => {
    const fetchImpl = jest.fn(async () => ({ ok: true, text: async () => '' }));
    const result = await notifyUnexpectedSourceChange(event, {
      webhookUrl: 'https://open.larksuite.com/open-apis/bot/v2/hook/test-token',
      fetchImpl,
    });
    expect(result).toEqual({ ok: true, skipped: false });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(body.msg_type).toBe('text');
    expect(body.content.text).toContain('Unexpected paid/closed source change');
  });
});
