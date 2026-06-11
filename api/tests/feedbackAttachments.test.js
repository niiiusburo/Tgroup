process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

jest.mock('../src/middleware/auth', () => ({
  requireAuth: (req, _res, next) => {
    req.user = { employeeId: 'employee-1' };
    next();
  },
  requirePermission: jest.fn(() => (_req, _res, next) => next()),
  requireLobScope: () => (_req, _res, next) => next(),
}));

jest.mock('../src/db', () => ({
  query: jest.fn(),
  pool: {
    connect: jest.fn(),
  },
}));

jest.mock('../src/routes/feedback/admin', () => ({
  isAdmin: jest.fn(async () => true),
  requireAdmin: (_req, _res, next) => next(),
  requireFeedbackPermission: () => (_req, _res, next) => next(),
}));

jest.mock('../src/routes/feedback/attachments', () => ({
  UPLOAD_DIR: '/tmp/tgroup-feedback-tests',
  upload: {
    array: jest.fn(() => (req, _res, next) => {
      req.files = req.get('x-mock-files')
        ? [{
          path: '/tmp/tgroup-feedback-tests/mock-proof.jpg',
          filename: 'mock-proof.jpg',
          originalname: 'proof.png',
          mimetype: 'image/jpeg',
          size: 12345,
        }]
        : [];
      next();
    }),
  },
  insertAttachments: jest.fn(async () => {}),
  enrichMessageWithAttachments: jest.fn(async (_client, message) => ({
    ...message,
    attachments: [{ url: '/uploads/feedback/mock-proof.jpg' }],
  })),
  enrichMessagesWithAttachments: jest.fn(async (messages) => messages),
  getAttachmentFilePath: jest.fn((storedName) => {
    const path = require('path');
    const allowed = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:gif|jpe?g|png|webp)$/i;
    if (!allowed.test(storedName || '')) {
      throw new Error('Invalid attachment filename');
    }
    return `/tmp/tgroup-feedback-tests${path.sep}${storedName}`;
  }),
  removeUploadedFiles: jest.fn(),
}));

jest.mock('uuid', () => ({ v4: jest.fn(() => 'mock-uuid') }));

const request = require('supertest');
const fs = require('fs');
const app = require('../src/server');
const { query, pool } = require('../src/db');
const attachments = require('../src/routes/feedback/attachments');

const THREAD_ID = 'thread-1';
const MESSAGE_ID = 'message-1';

function mockIpAccess() {
  query.mockImplementation(async (sql) => {
    if (sql.includes('ip_access_settings')) return [{ mode: 'disabled' }];
    if (sql.includes('ip_access_entries')) return [];
    return [];
  });
}

function makeClient() {
  const client = {
    query: jest.fn(async (sql, params = []) => {
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [] };
      if (sql.includes('SELECT id FROM feedback_threads')) return { rows: [{ id: THREAD_ID }] };
      if (sql.includes('UPDATE feedback_threads SET updated_at')) return { rows: [] };
      if (sql.includes('INSERT INTO feedback_threads')) {
        return {
          rows: [{
            id: THREAD_ID,
            employee_id: 'employee-1',
            page_path: params[2],
            status: 'pending',
          }],
        };
      }
      if (sql.includes('INSERT INTO feedback_messages')) {
        return {
          rows: [{
            id: MESSAGE_ID,
            threadId: params[0],
            authorId: params[1],
            content: params[2],
            createdAt: params[3],
          }],
        };
      }
      throw new Error(`Unexpected client query: ${sql}`);
    }),
    release: jest.fn(),
  };
  pool.connect.mockResolvedValue(client);
  return client;
}

function makeMissingThreadClient() {
  const client = {
    query: jest.fn(async (sql) => {
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [] };
      if (sql.includes('SELECT id FROM feedback_threads')) return { rows: [] };
      throw new Error(`Unexpected client query: ${sql}`);
    }),
    release: jest.fn(),
  };
  pool.connect.mockResolvedValue(client);
  return client;
}

function makeDeleteClient({ failOnAttachmentDelete = false, attachmentName = '11111111-1111-4111-8111-111111111111.jpg' } = {}) {
  const client = {
    query: jest.fn(async (sql) => {
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [] };
      if (sql.includes('SELECT id FROM feedback_threads')) return { rows: [{ id: THREAD_ID }] };
      if (sql.includes('SELECT id FROM feedback_messages')) return { rows: [{ id: MESSAGE_ID }] };
      if (sql.includes('SELECT stored_name FROM feedback_attachments')) {
        return { rows: [{ stored_name: attachmentName }] };
      }
      if (sql.includes('DELETE FROM feedback_attachments')) {
        if (failOnAttachmentDelete) throw new Error('attachment delete failed');
        return { rows: [] };
      }
      if (sql.includes('DELETE FROM feedback_messages')) return { rows: [] };
      if (sql.includes('DELETE FROM feedback_threads')) return { rows: [] };
      throw new Error(`Unexpected client query: ${sql}`);
    }),
    release: jest.fn(),
  };
  pool.connect.mockResolvedValue(client);
  return client;
}

describe('feedback attachment transaction integrity', () => {
  let consoleError;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockIpAccess();
    attachments.insertAttachments.mockResolvedValue(undefined);
    attachments.enrichMessageWithAttachments.mockImplementation(async (_client, message) => ({
      ...message,
      attachments: [{ url: '/uploads/feedback/mock-proof.jpg' }],
    }));
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('creates file-only feedback with empty content inside one transaction', async () => {
    const client = makeClient();

    const res = await request(app)
      .post('/api/Feedback')
      .set('x-mock-files', '1')
      .send({ pagePath: '/reports/revenue' });

    expect(res.status).toBe(201);
    const calls = client.query.mock.calls;
    const sqls = calls.map(([sql]) => sql);
    expect(sqls).toEqual(expect.arrayContaining([
      'BEGIN',
      expect.stringContaining('INSERT INTO feedback_threads'),
      expect.stringContaining('INSERT INTO feedback_messages'),
      'COMMIT',
    ]));
    expect(calls.find(([sql]) => sql.includes('INSERT INTO feedback_messages'))[1][2]).toBe('');
    expect(attachments.insertAttachments).toHaveBeenCalledWith(client, MESSAGE_ID, expect.any(Array));
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it('wraps admin reply attachment rows in a transaction before locking the thread', async () => {
    const client = makeClient();

    const res = await request(app)
      .post(`/api/Feedback/all/${THREAD_ID}/reply`)
      .set('x-mock-files', '1')
      .send({});

    expect(res.status).toBe(201);
    const calls = client.query.mock.calls;
    const sqls = calls.map(([sql]) => sql);
    expect(sqls[0]).toBe('BEGIN');
    expect(sqls[1]).toEqual(expect.stringContaining('SELECT id FROM feedback_threads'));
    expect(sqls).toContain('COMMIT');
    expect(sqls).not.toContain('ROLLBACK');
    expect(calls.find(([sql]) => sql.includes('INSERT INTO feedback_messages'))[1][2]).toBe('');
    expect(attachments.insertAttachments).toHaveBeenCalledWith(client, MESSAGE_ID, expect.any(Array));
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it('wraps staff reply attachment rows in a transaction before locking the thread', async () => {
    const client = makeClient();

    const res = await request(app)
      .post(`/api/Feedback/my/${THREAD_ID}/reply`)
      .set('x-mock-files', '1')
      .send({});

    expect(res.status).toBe(201);
    const calls = client.query.mock.calls;
    const sqls = calls.map(([sql]) => sql);
    expect(sqls[0]).toBe('BEGIN');
    expect(sqls[1]).toEqual(expect.stringContaining('SELECT id FROM feedback_threads'));
    expect(sqls).toContain('COMMIT');
    expect(sqls).not.toContain('ROLLBACK');
    expect(calls.find(([sql]) => sql.includes('INSERT INTO feedback_messages'))[1][2]).toBe('');
    expect(attachments.insertAttachments).toHaveBeenCalledWith(client, MESSAGE_ID, expect.any(Array));
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it('rolls back admin reply rows when attachment persistence fails', async () => {
    const client = makeClient();
    attachments.insertAttachments.mockRejectedValueOnce(new Error('attachment insert failed'));

    const res = await request(app)
      .post(`/api/Feedback/all/${THREAD_ID}/reply`)
      .set('x-mock-files', '1')
      .send({ content: 'resolved with proof' });

    expect(res.status).toBe(500);
    const sqls = client.query.mock.calls.map(([sql]) => sql);
    expect(sqls[0]).toBe('BEGIN');
    expect(sqls).toContain('ROLLBACK');
    expect(sqls).not.toContain('COMMIT');
    expect(attachments.removeUploadedFiles).toHaveBeenCalledWith(expect.any(Array));
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it('removes uploaded reply files when the target admin thread is missing', async () => {
    const client = makeMissingThreadClient();

    const res = await request(app)
      .post(`/api/Feedback/all/${THREAD_ID}/reply`)
      .set('x-mock-files', '1')
      .send({ content: 'proof for missing thread' });

    expect(res.status).toBe(404);
    expect(client.query.mock.calls.map(([sql]) => sql)).toEqual([
      'BEGIN',
      expect.stringContaining('SELECT id FROM feedback_threads'),
      'ROLLBACK',
    ]);
    expect(attachments.removeUploadedFiles).toHaveBeenCalledWith(expect.any(Array));
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it('keeps attachment files when deleting a thread rolls back before commit', async () => {
    const client = makeDeleteClient({ failOnAttachmentDelete: true });
    const existsSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    const unlinkSpy = jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});

    const res = await request(app).delete(`/api/Feedback/all/${THREAD_ID}`);

    expect(res.status).toBe(500);
    const sqls = client.query.mock.calls.map(([sql]) => sql);
    expect(sqls).toContain('ROLLBACK');
    expect(sqls).not.toContain('COMMIT');
    expect(unlinkSpy).not.toHaveBeenCalled();
    expect(client.release).toHaveBeenCalledTimes(1);

    existsSpy.mockRestore();
    unlinkSpy.mockRestore();
  });

  it('deletes attachment files only after the thread delete transaction commits', async () => {
    const client = makeDeleteClient();
    const existsSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    const unlinkSpy = jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});

    const res = await request(app).delete(`/api/Feedback/all/${THREAD_ID}`);

    expect(res.status).toBe(204);
    const commitCall = client.query.mock.calls.find(([sql]) => sql === 'COMMIT');
    const commitOrder = client.query.mock.invocationCallOrder[client.query.mock.calls.indexOf(commitCall)];
    expect(unlinkSpy).toHaveBeenCalledWith(expect.stringContaining('11111111-1111-4111-8111-111111111111.jpg'));
    expect(unlinkSpy.mock.invocationCallOrder[0]).toBeGreaterThan(commitOrder);
    expect(client.release).toHaveBeenCalledTimes(1);

    existsSpy.mockRestore();
    unlinkSpy.mockRestore();
  });

  it('does not delete outside the upload directory when stored_name is invalid', async () => {
    const client = makeDeleteClient({ attachmentName: '../secret.jpg' });
    const existsSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    const unlinkSpy = jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});

    const res = await request(app).delete(`/api/Feedback/all/${THREAD_ID}`);

    expect(res.status).toBe(204);
    expect(client.query.mock.calls.map(([sql]) => sql)).toContain('COMMIT');
    expect(attachments.getAttachmentFilePath).toHaveBeenCalledWith('../secret.jpg');
    expect(unlinkSpy).not.toHaveBeenCalled();

    existsSpy.mockRestore();
    unlinkSpy.mockRestore();
  });

  it('filters admin auto feedback by source and current host without losing error fields', async () => {
    query.mockImplementation(async (sql, params = []) => {
      if (sql.includes('ip_access_settings')) return [{ mode: 'disabled' }];
      if (sql.includes('ip_access_entries')) return [];
      if (sql.includes('FROM feedback_threads t')) {
        return [{
          id: THREAD_ID,
          employeeId: null,
          employeeName: 'System',
          source: 'auto',
          errorMessage: 'current host failure',
        }];
      }
      return [];
    });

    const res = await request(app).get('/api/Feedback/all?source=auto&host=https://tmv.2checkin.com/feedback');

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    const feedbackQueryCall = query.mock.calls.find(([sql]) => sql.includes('FROM feedback_threads t'));
    expect(feedbackQueryCall[0]).toContain('t.source = $1');
    expect(feedbackQueryCall[0]).toContain("e.metadata->>'url'");
    expect(feedbackQueryCall[0]).toContain('e.message AS "errorMessage"');
    expect(feedbackQueryCall[1]).toEqual(['auto', 'tmv.2checkin.com']);
  });

  it('preserves manual source filtering while omitting host when not requested', async () => {
    query.mockImplementation(async (sql) => {
      if (sql.includes('ip_access_settings')) return [{ mode: 'disabled' }];
      if (sql.includes('ip_access_entries')) return [];
      if (sql.includes('FROM feedback_threads t')) return [];
      return [];
    });

    const res = await request(app).get('/api/Feedback/all?source=manual');

    expect(res.status).toBe(200);
    const feedbackQueryCall = query.mock.calls.find(([sql]) => sql.includes('FROM feedback_threads t'));
    expect(feedbackQueryCall[0]).toContain('t.source = $1');
    expect(feedbackQueryCall[0]).not.toContain("e.metadata->>'url'");
    expect(feedbackQueryCall[1]).toEqual(['manual']);
  });
});
