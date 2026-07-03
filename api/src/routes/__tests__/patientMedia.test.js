'use strict';

const express = require('express');
const request = require('supertest');

const originalEnv = process.env;
const originalFetch = global.fetch;

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function loadRoute(env = {}) {
  jest.resetModules();
  process.env = { ...originalEnv, ...env };

  const db = jest.fn();
  jest.doMock('../../db', () => ({ getQuery: () => db }));
  jest.doMock('../../middleware/patientAuth', () => ({
    requirePatientAuth: (req, _res, next) => {
      req.patient = { partnerId: 'partner-1', phone: '0900000000', name: 'Patient One' };
      next();
    },
  }));

  const router = require('../patient/media');
  // nosemgrep: javascript.express.security.audit.express-check-csurf-middleware-usage.express-check-csurf-middleware-usage
  const app = express();
  app.use('/media', router);
  return { app, db, helpers: router._test };
}

afterEach(() => {
  process.env = originalEnv;
  global.fetch = originalFetch;
  jest.dontMock('../../db');
  jest.dontMock('../../middleware/patientAuth');
});

describe('patient media route', () => {
  it('lists NK Photo media for the authenticated patient client', async () => {
    const { app, db } = loadRoute({
      MEDIA_SERVICE_URL: 'http://media.test',
      MEDIA_SERVICE_API_KEY: 'media-key',
    });
    db
      .mockResolvedValueOnce([{ id: 'partner-1', ref: 'T001', name: 'Patient One', phone: '0900000000', email: null }])
      .mockResolvedValueOnce([]);
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse({ ok: true, clients: [{ id: 'client-1', external_ref: 'partner-1' }] }))
      .mockResolvedValueOnce(jsonResponse({
        ok: true,
        media: [{
          id: 'media-1',
          client_id: 'client-1',
          url: 'http://media.test/api/media/media-1',
          signedUrl: 'http://media.test/api/media/media-1?token=signed',
          category: 'xray',
          label: 'X-ray',
        }],
      }));

    const res = await request(app).get('/media').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.client).toEqual({ id: 'client-1' });
    expect(res.body.media).toHaveLength(1);
    expect(res.body.media[0]).toMatchObject({
      id: 'media-1',
      media_service_id: 'media-1',
      signedUrl: 'http://media.test/api/media/media-1?token=signed',
      type: 'xray',
    });
    expect(global.fetch.mock.calls[0][0]).toBe('http://media.test/api/clients?search=partner-1');
    expect(global.fetch.mock.calls[0][1].headers['X-API-Key']).toBe('media-key');
  });

  it('dedupes cached local rows against NK Photo media by media_service_id', async () => {
    const { app, db } = loadRoute({
      MEDIA_SERVICE_URL: 'http://media.test',
      MEDIA_SERVICE_API_KEY: 'media-key',
    });
    db
      .mockResolvedValueOnce([{ id: 'partner-1', ref: 'T001', name: 'Patient One', phone: '0900000000', email: null }])
      .mockResolvedValueOnce([{
        id: 'local-row-1',
        media_service_id: 'media-1',
        media_url: 'http://media.test/api/media/media-1',
        category: 'treatment_photo',
        label: 'Cached copy',
        created_at: '2026-07-01T00:00:00Z',
      }]);
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse({ ok: true, clients: [{ id: 'client-1', external_ref: 'partner-1' }] }))
      .mockResolvedValueOnce(jsonResponse({
        ok: true,
        media: [{
          id: 'media-1',
          client_id: 'client-1',
          url: 'http://media.test/api/media/media-1',
          signedUrl: 'http://media.test/api/media/media-1?token=signed',
          category: 'treatment_photo',
          label: 'External copy',
        }],
      }));

    const res = await request(app).get('/media').expect(200);

    expect(res.body.media).toHaveLength(1);
    expect(res.body.media[0]).toMatchObject({
      id: 'media-1',
      media_service_id: 'media-1',
      label: 'External copy',
      signedUrl: 'http://media.test/api/media/media-1?token=signed',
    });
  });

  it('enriches external media with the locally cached service-line tag', async () => {
    const { app, db } = loadRoute({
      MEDIA_SERVICE_URL: 'http://media.test',
      MEDIA_SERVICE_API_KEY: 'media-key',
    });
    db
      .mockResolvedValueOnce([{ id: 'partner-1', ref: 'T001', name: 'Patient One', phone: '0900000000', email: null }])
      .mockResolvedValueOnce([{
        id: 'local-row-1',
        media_service_id: 'media-1',
        sale_order_line_id: 'line-1',
        media_url: 'http://media.test/api/media/media-1',
        category: 'treatment_photo',
        label: 'Cached copy',
        created_at: '2026-07-01T00:00:00Z',
      }]);
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse({ ok: true, clients: [{ id: 'client-1', external_ref: 'partner-1' }] }))
      .mockResolvedValueOnce(jsonResponse({
        ok: true,
        media: [
          {
            id: 'media-1',
            client_id: 'client-1',
            url: 'http://media.test/api/media/media-1',
            signedUrl: 'http://media.test/api/media/media-1?token=signed',
            category: 'treatment_photo',
            label: 'External copy',
          },
          {
            id: 'media-2',
            client_id: 'client-1',
            url: 'http://media.test/api/media/media-2',
            category: 'general',
            label: 'Untagged external',
          },
        ],
      }));

    const res = await request(app).get('/media').expect(200);

    expect(res.body.media).toHaveLength(2);
    const tagged = res.body.media.find((m) => m.id === 'media-1');
    const untagged = res.body.media.find((m) => m.id === 'media-2');
    // The external copy wins the merge but must keep the cached service-line tag.
    expect(tagged).toMatchObject({ label: 'External copy', saleOrderLineId: 'line-1' });
    expect(untagged.saleOrderLineId).toBeNull();
  });

  it('does not leak unmatched external media when filtering by saleOrderLineId', async () => {
    const { app, db } = loadRoute({
      MEDIA_SERVICE_URL: 'http://media.test',
      MEDIA_SERVICE_API_KEY: 'media-key',
    });
    db
      .mockResolvedValueOnce([{ id: 'partner-1', ref: 'T001', name: 'Patient One', phone: '0900000000', email: null }])
      .mockResolvedValueOnce([{
        id: 'local-row-1',
        media_service_id: 'media-1',
        sale_order_line_id: 'line-1',
        media_url: 'http://media.test/api/media/media-1',
        category: 'treatment_photo',
        label: 'Cached copy',
        created_at: '2026-07-01T00:00:00Z',
      }]);
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse({ ok: true, clients: [{ id: 'client-1', external_ref: 'partner-1' }] }))
      .mockResolvedValueOnce(jsonResponse({
        ok: true,
        media: [
          {
            id: 'media-1',
            client_id: 'client-1',
            url: 'http://media.test/api/media/media-1',
            signedUrl: 'http://media.test/api/media/media-1?token=signed',
            category: 'treatment_photo',
            label: 'External copy',
          },
          {
            id: 'media-2',
            client_id: 'client-1',
            url: 'http://media.test/api/media/media-2',
            category: 'general',
            label: 'Unrelated external',
          },
        ],
      }));

    const res = await request(app).get('/media?saleOrderLineId=line-1').expect(200);

    // Filtered SELECT is parameterized on the line id.
    expect(db.mock.calls[1][0]).toContain('sale_order_line_id = $2');
    expect(db.mock.calls[1][1]).toEqual(['partner-1', 'line-1']);
    // Only the matching item comes back; the unrelated external item must not leak.
    expect(res.body.media).toHaveLength(1);
    expect(res.body.media[0]).toMatchObject({ id: 'media-1', saleOrderLineId: 'line-1' });
  });

  it('creates an NK Photo client and uploads a file using file field name', async () => {
    const { app, db } = loadRoute({
      MEDIA_SERVICE_URL: 'http://media.test',
      MEDIA_SERVICE_API_KEY: 'media-key',
    });
    db
      .mockResolvedValueOnce([{ id: 'partner-1', ref: 'T001', name: 'Patient One', phone: '0900000000', email: 'p@test.local' }])
      .mockResolvedValueOnce([{ id: 'patient-media-1' }]);
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse({ ok: true, clients: [] }))
      .mockResolvedValueOnce(jsonResponse({ ok: true, clients: [] }))
      .mockResolvedValueOnce(jsonResponse({ ok: true, clients: [] }))
      .mockResolvedValueOnce(jsonResponse({ ok: true, client: { id: 'client-1', external_ref: 'partner-1' } }, 201))
      .mockResolvedValueOnce(jsonResponse({
        ok: true,
        media: {
          id: 'media-1',
          client_id: 'client-1',
          url: 'http://media.test/api/media/media-1',
          signedUrl: 'http://media.test/api/media/media-1?token=signed',
          category: 'treatment_photo',
          label: 'Before',
        },
      }, 201));

    const res = await request(app)
      .post('/media')
      .field('type', 'treatment_photo')
      .field('label', 'Before')
      .attach('file', Buffer.from('png'), { filename: 'before.png', contentType: 'image/png' })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.client).toEqual({ id: 'client-1' });
    expect(res.body.media).toMatchObject({
      media_service_id: 'media-1',
      client_id: 'client-1',
      signedUrl: 'http://media.test/api/media/media-1?token=signed',
    });
    expect(global.fetch.mock.calls[3][0]).toBe('http://media.test/api/clients');
    expect(global.fetch.mock.calls[4][0]).toBe('http://media.test/api/clients/client-1/media');
    expect(global.fetch.mock.calls[4][1].headers['X-API-Key']).toBe('media-key');
    expect(db.mock.calls[1][0]).toContain('INSERT INTO dbo.patient_media');
  });

  it('accepts image field name as alternative to file', async () => {
    const { app, db } = loadRoute({
      MEDIA_SERVICE_URL: 'http://media.test',
      MEDIA_SERVICE_API_KEY: 'media-key',
    });
    db
      .mockResolvedValueOnce([{ id: 'partner-1', ref: 'T001', name: 'Patient One', phone: '0900000000', email: 'p@test.local' }])
      .mockResolvedValueOnce([{ id: 'patient-media-1' }]);
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse({ ok: true, clients: [] }))
      .mockResolvedValueOnce(jsonResponse({ ok: true, clients: [] }))
      .mockResolvedValueOnce(jsonResponse({ ok: true, clients: [] }))
      .mockResolvedValueOnce(jsonResponse({ ok: true, client: { id: 'client-1', external_ref: 'partner-1' } }, 201))
      .mockResolvedValueOnce(jsonResponse({
        ok: true,
        media: {
          id: 'media-1',
          client_id: 'client-1',
          url: 'http://media.test/api/media/media-1',
          signedUrl: 'http://media.test/api/media/media-1?token=signed',
          category: 'treatment_photo',
          label: 'After',
        },
      }, 201));

    const res = await request(app)
      .post('/media')
      .field('type', 'treatment_photo')
      .field('label', 'After')
      .attach('image', Buffer.from('png'), { filename: 'after.png', contentType: 'image/png' })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.media).toMatchObject({ media_service_id: 'media-1' });
  });

  it('accepts photo field name as alternative to file', async () => {
    const { app, db } = loadRoute({
      MEDIA_SERVICE_URL: 'http://media.test',
      MEDIA_SERVICE_API_KEY: 'media-key',
    });
    db
      .mockResolvedValueOnce([{ id: 'partner-1', ref: 'T001', name: 'Patient One', phone: '0900000000', email: 'p@test.local' }])
      .mockResolvedValueOnce([{ id: 'patient-media-1' }]);
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse({ ok: true, clients: [] }))
      .mockResolvedValueOnce(jsonResponse({ ok: true, clients: [] }))
      .mockResolvedValueOnce(jsonResponse({ ok: true, clients: [] }))
      .mockResolvedValueOnce(jsonResponse({ ok: true, client: { id: 'client-1', external_ref: 'partner-1' } }, 201))
      .mockResolvedValueOnce(jsonResponse({
        ok: true,
        media: {
          id: 'media-1',
          client_id: 'client-1',
          url: 'http://media.test/api/media/media-1',
          signedUrl: 'http://media.test/api/media/media-1?token=signed',
          category: 'treatment_photo',
          label: 'Xray',
        },
      }, 201));

    const res = await request(app)
      .post('/media')
      .field('type', 'treatment_photo')
      .field('label', 'Xray')
      .attach('photo', Buffer.from('png'), { filename: 'xray.png', contentType: 'image/png' })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.media).toMatchObject({ media_service_id: 'media-1' });
  });

  it('rejects uploads with multiple files across different field names', async () => {
    const { app } = loadRoute({
      MEDIA_SERVICE_URL: 'http://media.test',
      MEDIA_SERVICE_API_KEY: 'media-key',
    });

    const res = await request(app)
      .post('/media')
      .attach('file', Buffer.from('png1'), { filename: 'photo1.png', contentType: 'image/png' })
      .attach('image', Buffer.from('png2'), { filename: 'photo2.png', contentType: 'image/png' })
      .expect(400);

    expect(res.body.code).toBe('MULTIPLE_FILES_NOT_ALLOWED');
    expect(res.body.error).toContain('Only one file');
  });

  it('returns 503 for uploads when the media service is not configured', async () => {
    const { app } = loadRoute({ MEDIA_SERVICE_URL: '', MEDIA_SERVICE_API_KEY: '' });

    const res = await request(app)
      .post('/media')
      .attach('image', Buffer.from('png'), { filename: 'photo.png', contentType: 'image/png' })
      .expect(503);

    expect(res.body.code).toBe('NOT_CONFIGURED');
  });

  it('filters GET results by saleOrderLineId when query param is provided', async () => {
    const { app, db } = loadRoute({
      MEDIA_SERVICE_URL: 'http://media.test',
      MEDIA_SERVICE_API_KEY: 'media-key',
    });
    const saleOrderLineId = 'sol-123';
    db
      .mockResolvedValueOnce([{ id: 'partner-1', ref: 'T001', name: 'Patient One', phone: '0900000000', email: null }])
      .mockResolvedValueOnce([
        {
          id: 'media-1',
          sale_order_line_id: saleOrderLineId,
          media_service_id: 'media-1',
          media_url: 'http://media.test/api/media/media-1',
          category: 'treatment_photo',
          label: 'Service photo',
          created_at: '2026-07-01T00:00:00Z',
        },
      ]);
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse({ ok: true, clients: [{ id: 'client-1', external_ref: 'partner-1' }] }))
      .mockResolvedValueOnce(jsonResponse({ ok: true, media: [] }));

    const res = await request(app)
      .get(`/media?saleOrderLineId=${saleOrderLineId}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.media).toHaveLength(1);
    expect(res.body.media[0]).toMatchObject({
      id: 'media-1',
      saleOrderLineId: saleOrderLineId,
      label: 'Service photo',
    });
    const sqlCall = db.mock.calls[1][0];
    expect(sqlCall).toContain('sale_order_line_id = $2');
    expect(db.mock.calls[1][1][1]).toBe(saleOrderLineId);
  });

  it('includes saleOrderLineId (camelCase) in GET response items', async () => {
    const { app, db } = loadRoute({
      MEDIA_SERVICE_URL: 'http://media.test',
      MEDIA_SERVICE_API_KEY: 'media-key',
    });
    db
      .mockResolvedValueOnce([{ id: 'partner-1', ref: 'T001', name: 'Patient One', phone: '0900000000', email: null }])
      .mockResolvedValueOnce([
        {
          id: 'media-1',
          sale_order_line_id: 'sol-123',
          media_service_id: 'media-1',
          media_url: 'http://media.test/api/media/media-1',
          category: 'treatment_photo',
          label: 'Before',
          created_at: '2026-07-01T00:00:00Z',
        },
      ]);
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse({ ok: true, clients: [{ id: 'client-1', external_ref: 'partner-1' }] }))
      .mockResolvedValueOnce(jsonResponse({ ok: true, media: [] }));

    const res = await request(app).get('/media').expect(200);

    expect(res.body.media).toHaveLength(1);
    expect(res.body.media[0]).toHaveProperty('saleOrderLineId', 'sol-123');
  });

  it('accepts saleOrderLineId in POST and validates ownership via sale order join', async () => {
    const { app, db } = loadRoute({
      MEDIA_SERVICE_URL: 'http://media.test',
      MEDIA_SERVICE_API_KEY: 'media-key',
    });
    const saleOrderLineId = 'sol-123';
    db
      .mockResolvedValueOnce([{ id: 'partner-1', ref: 'T001', name: 'Patient One', phone: '0900000000', email: 'p@test.local' }])
      .mockResolvedValueOnce([{ id: saleOrderLineId }])
      .mockResolvedValueOnce([{ id: 'patient-media-1' }]);
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse({ ok: true, clients: [] }))
      .mockResolvedValueOnce(jsonResponse({ ok: true, clients: [] }))
      .mockResolvedValueOnce(jsonResponse({ ok: true, clients: [] }))
      .mockResolvedValueOnce(jsonResponse({ ok: true, client: { id: 'client-1', external_ref: 'partner-1' } }, 201))
      .mockResolvedValueOnce(jsonResponse({
        ok: true,
        media: {
          id: 'media-1',
          client_id: 'client-1',
          url: 'http://media.test/api/media/media-1',
          signedUrl: 'http://media.test/api/media/media-1?token=signed',
          category: 'treatment_photo',
          label: 'Before',
        },
      }, 201));

    const res = await request(app)
      .post('/media')
      .field('type', 'treatment_photo')
      .field('label', 'Before')
      .field('saleOrderLineId', saleOrderLineId)
      .attach('file', Buffer.from('png'), { filename: 'before.png', contentType: 'image/png' })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.media).toMatchObject({
      media_service_id: 'media-1',
      saleOrderLineId: saleOrderLineId,
    });
    const insertCall = db.mock.calls[2][0];
    expect(insertCall).toContain('INSERT INTO dbo.patient_media');
    expect(insertCall).toContain('$2');
    expect(db.mock.calls[2][1][1]).toBe(saleOrderLineId);
  });

  it('rejects POST with saleOrderLineId that does not belong to patient (SOL_NOT_OWNED)', async () => {
    const { app, db } = loadRoute({
      MEDIA_SERVICE_URL: 'http://media.test',
      MEDIA_SERVICE_API_KEY: 'media-key',
    });
    db
      .mockResolvedValueOnce([{ id: 'partner-1', ref: 'T001', name: 'Patient One', phone: '0900000000', email: 'p@test.local' }])
      .mockResolvedValueOnce([]);

    const res = await request(app)
      .post('/media')
      .field('type', 'treatment_photo')
      .field('saleOrderLineId', 'foreign-sol-999')
      .attach('file', Buffer.from('png'), { filename: 'photo.png', contentType: 'image/png' })
      .expect(400);

    expect(res.body.code).toBe('SOL_NOT_OWNED');
    expect(res.body.error).toContain('does not belong to this patient');
  });

  it('POST without saleOrderLineId persists NULL (existing behavior)', async () => {
    const { app, db } = loadRoute({
      MEDIA_SERVICE_URL: 'http://media.test',
      MEDIA_SERVICE_API_KEY: 'media-key',
    });
    db
      .mockResolvedValueOnce([{ id: 'partner-1', ref: 'T001', name: 'Patient One', phone: '0900000000', email: 'p@test.local' }])
      .mockResolvedValueOnce([{ id: 'patient-media-1' }]);
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse({ ok: true, clients: [] }))
      .mockResolvedValueOnce(jsonResponse({ ok: true, clients: [] }))
      .mockResolvedValueOnce(jsonResponse({ ok: true, clients: [] }))
      .mockResolvedValueOnce(jsonResponse({ ok: true, client: { id: 'client-1', external_ref: 'partner-1' } }, 201))
      .mockResolvedValueOnce(jsonResponse({
        ok: true,
        media: {
          id: 'media-1',
          client_id: 'client-1',
          url: 'http://media.test/api/media/media-1',
          signedUrl: 'http://media.test/api/media/media-1?token=signed',
          category: 'general',
          label: '',
        },
      }, 201));

    const res = await request(app)
      .post('/media')
      .attach('file', Buffer.from('png'), { filename: 'photo.png', contentType: 'image/png' })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.media.saleOrderLineId).toBeNull();
    const insertCall = db.mock.calls[1][0];
    expect(insertCall).toContain('INSERT INTO dbo.patient_media');
    expect(db.mock.calls[1][1][1]).toBeNull();
  });
});
