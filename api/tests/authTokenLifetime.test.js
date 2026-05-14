/**
 * Auth Token Lifetime Tests
 * Verifies Remember Me = 60 days, default = 24 hours
 */

jest.mock('../src/db', () => ({
  query: jest.fn(),
}));

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'mock-jwt-token'),
}));

const { query } = require('../src/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../src/server');

describe('POST /api/Auth/login token lifetime', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('signs token with 24h expiry by default', async () => {
    query.mockResolvedValueOnce([{
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Test',
      email: 'test@t.com',
      password_hash: 'hash',
      companyId: 'c1',
      companyName: 'HQ',
    }]);
    bcrypt.compare.mockResolvedValueOnce(true);
    query.mockResolvedValueOnce([]);
    query.mockResolvedValueOnce([]);

    await request(app)
      .post('/api/Auth/login')
      .send({ email: 'test@t.com', password: 'pass' });

    expect(jwt.sign).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(String),
      expect.objectContaining({ expiresIn: '24h' })
    );
  });

  it('signs token with 60d expiry when rememberMe is true', async () => {
    query.mockResolvedValueOnce([{
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Test',
      email: 'test@t.com',
      password_hash: 'hash',
      companyId: 'c1',
      companyName: 'HQ',
    }]);
    bcrypt.compare.mockResolvedValueOnce(true);
    query.mockResolvedValueOnce([]);
    query.mockResolvedValueOnce([]);

    await request(app)
      .post('/api/Auth/login')
      .send({ email: 'test@t.com', password: 'pass', rememberMe: true });

    expect(jwt.sign).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(String),
      expect.objectContaining({ expiresIn: '60d' })
    );
  });
});
