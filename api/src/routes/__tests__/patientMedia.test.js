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

  it('creates an NK Photo client and uploads a file without exposing the API key to mobile', async () => {
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
      .attach('image', Buffer.from('png'), { filename: 'before.png', contentType: 'image/png' })
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

  it('returns 503 for uploads when the media service is not configured', async () => {
    const { app } = loadRoute({ MEDIA_SERVICE_URL: '', MEDIA_SERVICE_API_KEY: '' });

    const res = await request(app)
      .post('/media')
      .attach('image', Buffer.from('png'), { filename: 'photo.png', contentType: 'image/png' })
      .expect(503);

    expect(res.body.code).toBe('NOT_CONFIGURED');
  });
});
