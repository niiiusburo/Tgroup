jest.mock('../../../db', () => ({
  query: jest.fn(),
}));

jest.mock('../../../middleware/auth', () => ({
  requirePermission: () => (_req, _res, next) => next(),
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'customer-uuid'),
}));

const { query } = require('../../../db');
const { createPartner, updatePartner } = require('../mutationHandlers');
const express = require('express');
const request = require('supertest');
const partnersRouter = require('../../partners.js');

const CURRENT_SOURCE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OTHER_SOURCE_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

function createRouteTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/Partners', partnersRouter);
  return app;
}

function mockResponse() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res;
}

describe('partner mutation handlers', () => {
  let randomSpy;

  beforeEach(() => {
    query.mockReset();
  });

  afterEach(() => {
    if (randomSpy) {
      randomSpy.mockRestore();
      randomSpy = null;
    }
  });

  it('generates a cosmetic customer code with TM prefix', async () => {
    randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
    query
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'customer-1', ref: 'TM100000', name: 'Tham My Customer' }]);

    const req = {
      originalUrl: '/api/cosmetic/Partners',
      body: {
        name: 'Tham My Customer',
        phone: '0900000000',
      },
    };
    const res = mockResponse();

    await createPartner(req, res);

    const insertCall = query.mock.calls.find(([sql]) => String(sql).includes('INSERT INTO partners'));
    expect(query.mock.calls[0]).toEqual([
      'SELECT id FROM partners WHERE ref = $1 LIMIT 1',
      ['TM100000'],
    ]);
    expect(insertCall[1]).toContain('TM100000');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ id: 'customer-1', ref: 'TM100000', name: 'Tham My Customer' });
  });

  it('keeps the dental customer code prefix as T', async () => {
    randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
    query
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'customer-1', ref: 'T100000', name: 'Dental Customer' }]);

    const req = {
      originalUrl: '/api/Partners',
      body: {
        name: 'Dental Customer',
        phone: '0911111111',
      },
    };
    const res = mockResponse();

    await createPartner(req, res);

    expect(query.mock.calls[0]).toEqual([
      'SELECT id FROM partners WHERE ref = $1 LIMIT 1',
      ['T100000'],
    ]);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ id: 'customer-1', ref: 'T100000', name: 'Dental Customer' });
  });

  it('allows updating a customer phone even when phone values are not globally unique', async () => {
    query
      .mockResolvedValueOnce([{ id: 'customer-1' }])
      .mockResolvedValueOnce([{ id: 'customer-1', phone: 'T8250', ref: 'T8250' }]);

    const req = {
      params: { id: 'customer-1' },
      body: {
        name: 'Test Customer',
        phone: 'T8250',
        ref: 'T8250',
      },
    };
    const res = mockResponse();

    await updatePartner(req, res);

    expect(res.status).not.toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ id: 'customer-1', phone: 'T8250', ref: 'T8250' });
    expect(query.mock.calls.some(([sql]) => String(sql).includes('WHERE phone = $1'))).toBe(false);
  });

  it('leaves omitted UUID fields unchanged during a partial customer update', async () => {
    query
      .mockResolvedValueOnce([{ id: 'customer-1', sourceid: CURRENT_SOURCE_ID }])
      .mockResolvedValueOnce([{ id: 'customer-1', note: 'Updated note' }]);

    const req = {
      params: { id: 'customer-1' },
      body: {
        note: 'Updated note',
      },
    };
    const res = mockResponse();

    await updatePartner(req, res);

    const [updateSql, updateValues] = query.mock.calls[1];
    expect(updateSql).toContain('note = $1');
    expect(updateSql).not.toContain('companyid =');
    expect(updateSql).not.toContain('sourceid =');
    expect(updateSql).not.toContain('cskhid =');
    expect(updateSql).not.toContain('salestaffid =');
    expect(updateValues).toEqual(['Updated note', 'customer-1']);
    expect(req.body).not.toHaveProperty('sourceid');
    expect(res.json).toHaveBeenCalledWith({ id: 'customer-1', note: 'Updated note' });
  });

  it('normalizes an explicitly empty non-source UUID to null during a partial customer update', async () => {
    query
      .mockResolvedValueOnce([{ id: 'customer-1', sourceid: CURRENT_SOURCE_ID }])
      .mockResolvedValueOnce([{ id: 'customer-1', note: 'Clear company', companyid: null }]);

    const req = {
      params: { id: 'customer-1' },
      body: {
        note: 'Clear company',
        companyid: '',
      },
    };
    const res = mockResponse();

    await updatePartner(req, res);

    const [updateSql, updateValues] = query.mock.calls[1];
    expect(updateSql).toContain('companyid = $1');
    expect(updateSql).toContain('note = $2');
    expect(updateSql).not.toContain('sourceid =');
    expect(updateSql).not.toContain('cskhid =');
    expect(updateSql).not.toContain('salestaffid =');
    expect(updateValues).toEqual([null, 'Clear company', 'customer-1']);
    expect(req.body.companyid).toBeNull();
    expect(res.json).toHaveBeenCalledWith({ id: 'customer-1', note: 'Clear company', companyid: null });
  });

  it('rejects a non-null customer source on create', async () => {
    const req = {
      body: {
        name: 'Test Customer',
        phone: '0900000000',
        sourceid: OTHER_SOURCE_ID,
      },
    };
    const res = mockResponse();

    await createPartner(req, res);

    expect(query).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: expect.objectContaining({ code: 'PARTNER_SOURCE_READ_ONLY' }),
    });
  });

  it('accepts an explicitly repeated customer source without writing it', async () => {
    query
      .mockResolvedValueOnce([{ id: 'customer-1', sourceid: CURRENT_SOURCE_ID }])
      .mockResolvedValueOnce([{ id: 'customer-1', note: 'Updated note', sourceid: CURRENT_SOURCE_ID }]);

    const req = {
      params: { id: 'customer-1' },
      body: {
        note: 'Updated note',
        sourceid: CURRENT_SOURCE_ID,
      },
    };
    const res = mockResponse();

    await updatePartner(req, res);

    const [updateSql, updateValues] = query.mock.calls[1];
    expect(updateSql).toContain('note = $1');
    expect(updateSql).not.toContain('sourceid =');
    expect(updateValues).toEqual(['Updated note', 'customer-1']);
    expect(res.status).not.toHaveBeenCalledWith(400);
  });

  it('returns a successful no-op when the current source is the only submitted field', async () => {
    const existing = {
      id: 'customer-1',
      name: 'Existing Customer',
      phone: '0900000000',
      sourceid: CURRENT_SOURCE_ID,
    };
    query.mockResolvedValueOnce([existing]);

    const req = {
      params: { id: 'customer-1' },
      body: { sourceid: CURRENT_SOURCE_ID },
    };
    const res = mockResponse();

    await updatePartner(req, res);

    expect(query).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(existing);
  });

  it('accepts an uppercase spelling of the unchanged source through the validated route', async () => {
    const existing = {
      id: 'customer-1',
      name: 'Existing Customer',
      phone: '0900000000',
      sourceid: CURRENT_SOURCE_ID,
    };
    query.mockResolvedValueOnce([existing]);

    const response = await request(createRouteTestApp())
      .put('/api/Partners/customer-1')
      .send({ sourceid: CURRENT_SOURCE_ID.toUpperCase() });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(existing);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('rejects a changed valid source UUID through the validated route', async () => {
    query.mockResolvedValueOnce([{ id: 'customer-1', sourceid: CURRENT_SOURCE_ID }]);

    const response = await request(createRouteTestApp())
      .put('/api/Partners/customer-1')
      .send({ sourceid: OTHER_SOURCE_ID });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('PARTNER_SOURCE_READ_ONLY');
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('rejects a valid non-null source UUID on create through the validated route', async () => {
    const response = await request(createRouteTestApp())
      .post('/api/Partners')
      .send({
        name: 'Test Customer',
        phone: '0900000000',
        sourceid: OTHER_SOURCE_ID,
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('PARTNER_SOURCE_READ_ONLY');
    expect(query).not.toHaveBeenCalled();
  });

  it.each([OTHER_SOURCE_ID, '', null])(
    'rejects a changed or cleared customer source on update (%p)',
    async (sourceid) => {
      query.mockResolvedValueOnce([{ id: 'customer-1', sourceid: CURRENT_SOURCE_ID }]);

      const req = {
        params: { id: 'customer-1' },
        body: { sourceid },
      };
      const res = mockResponse();

      await updatePartner(req, res);

      expect(query).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: expect.objectContaining({ code: 'PARTNER_SOURCE_READ_ONLY' }),
      });
    }
  );
});
