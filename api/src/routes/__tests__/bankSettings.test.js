/**
 * Bank settings route tests
 */

const request = require('supertest');
const express = require('express');
const { requirePermission } = require('../../middleware/auth');
const bankSettingsRoutes = require('../bankSettings');

// Mock the query function
jest.mock('../../db', () =>
  require('../../__tests__/helpers/routeTestHelpers').createMockQueryDb()
);

const { query } = require('../../db');

// Mock auth middleware to not validate. NOTE: this route uses requirePermission
// (not requireAuth), so it cannot use the shared createMockAuth() helper.
jest.mock('../../middleware/auth', () => ({
  requirePermission: () => (req, res, next) => next(),
}));

describe('Bank Settings Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/settings', bankSettingsRoutes);
    jest.clearAllMocks();
  });

  describe('GET /bank', () => {
    it('should return 200 with empty-string fields when no bank settings exist', async () => {
      query.mockResolvedValue([]);

      const response = await request(app).get('/api/settings/bank');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        bankBin: '',
        bankNumber: '',
        bankAccountName: '',
      });
    });

    it('should return 200 with configured bank settings when data exists', async () => {
      query.mockResolvedValue([
        {
          bank_bin: '970436',
          bank_number: '1234567890',
          bank_account_name: 'CLINIC NAME',
        },
      ]);

      const response = await request(app).get('/api/settings/bank');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        bankBin: '970436',
        bankNumber: '1234567890',
        bankAccountName: 'CLINIC NAME',
      });
    });

    it('should return 500 on database error', async () => {
      query.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app).get('/api/settings/bank');

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Error fetching bank settings');
      expect(response.body.error).toBe('Database connection failed');
    });
  });

  describe('PUT /bank', () => {
    it('should insert new bank settings when none exist', async () => {
      // First call checks for existing, second call does insert
      query.mockResolvedValueOnce([])
        .mockResolvedValueOnce(undefined);

      const response = await request(app)
        .put('/api/settings/bank')
        .send({
          bankBin: '970436',
          bankNumber: '1234567890',
          bankAccountName: 'CLINIC NAME',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.bankBin).toBe('970436');
    });

    it('should reject when required fields are missing', async () => {
      const response = await request(app)
        .put('/api/settings/bank')
        .send({
          bankBin: '970436',
          bankNumber: '1234567890',
          // missing bankAccountName
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('required');
    });

    it('should reject when bankBin is empty string', async () => {
      const response = await request(app)
        .put('/api/settings/bank')
        .send({
          bankBin: '',
          bankNumber: '1234567890',
          bankAccountName: 'CLINIC NAME',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('required');
    });
  });
});
