jest.mock('../../../db', () => ({
  query: jest.fn(),
}));

jest.mock('../../../middleware/auth', () => ({
  requirePermission: () => (_req, _res, next) => next(),
}));

jest.mock('../../../services/reports/canonicalRevenue', () => ({
  getCanonicalRevenueByDoctor: jest.fn(),
}));

const express = require('express');
const request = require('supertest');
const { query } = require('../../../db');
const { getCanonicalRevenueByDoctor } = require('../../../services/reports/canonicalRevenue');
const doctorsRouter = require('../doctors');

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/Reports', doctorsRouter);
  return app;
}

describe('doctors performance report', () => {
  beforeEach(() => {
    query.mockReset();
    getCanonicalRevenueByDoctor.mockReset();
  });

  it('qualifies the appointment company filter to avoid ambiguous joined SQL', async () => {
    query.mockResolvedValueOnce([
      {
        id: 'doctor-1',
        name: 'Doctor One',
        total_appointments: '1',
        done: '1',
        cancelled: '0',
      },
    ]);
    getCanonicalRevenueByDoctor.mockResolvedValueOnce([]);

    const res = await request(makeApp())
      .post('/api/Reports/doctors/performance')
      .send({
        dateFrom: '2026-05-01',
        dateTo: '2026-05-31',
        companyId: '45a24396-6bbf-44ee-9e9c-a8d0b6467637',
      });

    expect(res.status).toBe(200);
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0]).toContain('a.companyid = $3');
    expect(query.mock.calls[0][0]).not.toContain(' AND companyid = $3');
  });
});
