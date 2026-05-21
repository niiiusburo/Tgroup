'use strict';

const crypto = require('crypto');
const {
  buildFeedbackText,
  buildPayload,
  buildSignature,
  getWebhookUrl,
  notifyFeedbackThreadCreated,
} = require('../larkNotifier');

const WEBHOOK_URL = 'https://open.larksuite.com/open-apis/bot/v2/hook/test-token';

describe('larkNotifier', () => {
  let consoleError;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.LARK_FEEDBACK_WEBHOOK_URL;
    delete process.env.LARK_FEEDBACK_WEBHOOK_SECRET;
    delete process.env.TGROUP_PUBLIC_URL;
    delete process.env.APP_PUBLIC_URL;
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
    jest.restoreAllMocks();
  });

  it('skips notification when the webhook is not configured', async () => {
    const fetchImpl = jest.fn();

    const result = await notifyFeedbackThreadCreated({ source: 'manual' }, { fetchImpl });

    expect(result).toEqual({ ok: true, skipped: true, reason: 'not_configured' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('rejects non-Lark webhook URLs before sending', async () => {
    const fetchImpl = jest.fn();

    const result = await notifyFeedbackThreadCreated(
      { source: 'manual' },
      { webhookUrl: 'https://example.com/hook/test', fetchImpl }
    );

    expect(result).toEqual({ ok: false, skipped: true, reason: 'invalid_config' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('posts manual feedback alerts to the Lark custom bot webhook', async () => {
    const fetchImpl = jest.fn(async () => ({ ok: true }));

    const result = await notifyFeedbackThreadCreated(
      {
        source: 'manual',
        threadId: 'thread-1',
        employeeId: 'employee-1',
        pagePath: '/customers/T8250',
        screenSize: '1440x900',
        content: 'The customer profile save failed',
        attachmentCount: 2,
        createdAt: '2026-05-21T13:00:00.000Z',
        appBaseUrl: 'https://nk.2checkin.com/customers/T8250',
      },
      { webhookUrl: WEBHOOK_URL, fetchImpl }
    );

    expect(result).toEqual({ ok: true, skipped: false });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, options] = fetchImpl.mock.calls[0];
    expect(url).toBe(WEBHOOK_URL);
    expect(options.method).toBe('POST');
    const body = JSON.parse(options.body);
    expect(body.msg_type).toBe('text');
    expect(body.content.text).toContain('[TGroup Feedback] New employee feedback');
    expect(body.content.text).toContain('Page: /customers/T8250');
    expect(body.content.text).toContain('Files: 2');
    expect(body.content.text).toContain('Open feedback inbox: https://nk.2checkin.com/feedback');
  });

  it('builds signed payloads when a Lark signing secret is configured', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1700000000000);

    const payload = buildPayload('hello', 'secret-value');
    const expected = crypto
      .createHmac('sha256', '1700000000\nsecret-value')
      .update('')
      .digest('base64');

    expect(payload).toEqual({
      timestamp: '1700000000',
      sign: expected,
      msg_type: 'text',
      content: { text: 'hello' },
    });
    expect(buildSignature('secret-value', '1700000000')).toBe(expected);
  });

  it('formats auto-detected feedback alerts with route and API context', () => {
    process.env.TGROUP_PUBLIC_URL = 'https://nk.2checkin.com';

    const text = buildFeedbackText({
      source: 'auto',
      threadId: 'thread-2',
      errorEventId: 'error-1',
      errorType: 'React',
      pagePath: '/calendar',
      apiMethod: 'GET',
      apiEndpoint: '/api/Appointments',
      errorMessage: 'render failed',
      createdAt: '2026-05-21T13:00:00.000Z',
    });

    expect(text).toContain('[TGroup Feedback] Auto-detected website error');
    expect(text).toContain('Route: /calendar');
    expect(text).toContain('API: GET /api/Appointments');
    expect(text).toContain('Open feedback inbox: https://nk.2checkin.com/feedback');
  });

  it('pins the inbox link to TGROUP_PUBLIC_URL for auto alerts even when a hostile origin is spoofed', () => {
    process.env.TGROUP_PUBLIC_URL = 'https://nk.2checkin.com';

    const text = buildFeedbackText({
      source: 'auto',
      threadId: 'thread-spoof',
      errorEventId: 'error-spoof',
      errorType: 'Global',
      pagePath: '/',
      errorMessage: 'render failed',
      createdAt: '2026-05-21T13:00:00.000Z',
      // Attacker controls Origin/Referer on the public /api/telemetry/errors
      // endpoint. The notifier must NOT use these values for the inbox link.
      appBaseUrl: 'https://attacker.example/phish',
      pageUrl: 'https://attacker.example/x',
    });

    expect(text).toContain('Open feedback inbox: https://nk.2checkin.com/feedback');
    expect(text).not.toContain('attacker.example');
  });

  it('falls back to a relative inbox link for auto alerts when no env is configured', () => {
    const text = buildFeedbackText({
      source: 'auto',
      threadId: 'thread-fallback',
      errorEventId: 'error-fallback',
      errorType: 'Global',
      pagePath: '/',
      errorMessage: 'render failed',
      createdAt: '2026-05-21T13:00:00.000Z',
      appBaseUrl: 'https://attacker.example/phish',
    });

    expect(text).toContain('Open feedback inbox: /feedback');
    expect(text).not.toContain('attacker.example');
  });

  it('accepts only Lark or Feishu custom bot webhook hosts', () => {
    expect(getWebhookUrl(WEBHOOK_URL)).toBe(WEBHOOK_URL);
    expect(getWebhookUrl('https://open.feishu.cn/open-apis/bot/v2/hook/test-token')).toBe(
      'https://open.feishu.cn/open-apis/bot/v2/hook/test-token'
    );
    expect(() => getWebhookUrl('http://open.larksuite.com/open-apis/bot/v2/hook/test-token')).toThrow(
      'must use https'
    );
  });
});
