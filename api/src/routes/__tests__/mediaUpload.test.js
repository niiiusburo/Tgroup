'use strict';

const request = require('supertest');
const express = require('express');
const fs = require('fs');
const path = require('path');
const {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  UPLOADS_PER_MINUTE,
  upload,
  createMediaUploadRateLimiter,
  handleMulterError,
} = require('../../services/mediaUpload');

describe('MediaUpload Service', () => {
  describe('Constants', () => {
    test('ALLOWED_MIME_TYPES includes JPEG, PNG, WebP, HEIC, HEIF', () => {
      expect(ALLOWED_MIME_TYPES.has('image/jpeg')).toBe(true);
      expect(ALLOWED_MIME_TYPES.has('image/jpg')).toBe(true);
      expect(ALLOWED_MIME_TYPES.has('image/png')).toBe(true);
      expect(ALLOWED_MIME_TYPES.has('image/webp')).toBe(true);
      expect(ALLOWED_MIME_TYPES.has('image/heic')).toBe(true);
      expect(ALLOWED_MIME_TYPES.has('image/heif')).toBe(true);
    });

    test('MAX_FILE_SIZE is 10 MB', () => {
      expect(MAX_FILE_SIZE).toBe(10 * 1024 * 1024);
    });

    test('UPLOADS_PER_MINUTE is 5', () => {
      expect(UPLOADS_PER_MINUTE).toBe(5);
    });
  });

  describe('Multer Configuration', () => {
    test('upload.single("image") accepts JPEG files', async () => {
      const app = express();
      app.use(upload.single('image'));
      app.post('/', (req, res) => {
        res.json({
          success: !!req.file,
          filename: req.file?.originalname,
          mimetype: req.file?.mimetype,
        });
      });

      const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0]); // JPEG magic bytes
      const response = await request(app)
        .post('/')
        .attach('image', jpegBuffer, { filename: 'test.jpg', contentType: 'image/jpeg' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.mimetype).toBe('image/jpeg');
    });

    test('upload.single("image") rejects PDF files', async () => {
      const app = express();
      app.use(upload.single('image'));
      app.use(handleMulterError);
      app.post('/', (req, res) => {
        res.json({ success: true });
      });

      const pdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46]); // PDF magic bytes
      const response = await request(app)
        .post('/')
        .attach('image', pdfBuffer, { filename: 'test.pdf', contentType: 'application/pdf' });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('INVALID_FILE_TYPE');
    });

    test('upload.single("image") rejects HTML files', async () => {
      const app = express();
      app.use(upload.single('image'));
      app.use(handleMulterError);
      app.post('/', (req, res) => {
        res.json({ success: true });
      });

      const htmlBuffer = Buffer.from('<html></html>');
      const response = await request(app)
        .post('/')
        .attach('image', htmlBuffer, { filename: 'test.html', contentType: 'text/html' });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('INVALID_FILE_TYPE');
    });

    test('upload.single("image") enforces 10 MB file size limit', async () => {
      const app = express();
      app.use(upload.single('image'));
      app.use(handleMulterError);
      app.post('/', (req, res) => {
        res.json({ success: true });
      });

      // Create a file slightly over 10 MB
      const oversizeBuffer = Buffer.alloc(10 * 1024 * 1024 + 1024);
      const response = await request(app)
        .post('/')
        .attach('image', oversizeBuffer, { filename: 'large.jpg', contentType: 'image/jpeg' });

      expect(response.status).toBe(413);
      expect(response.body.code).toBe('FILE_TOO_LARGE');
    });

    test('upload.single("image") accepts files under 10 MB', async () => {
      const app = express();
      app.use(upload.single('image'));
      app.use(handleMulterError);
      app.post('/', (req, res) => {
        res.json({ success: !!req.file });
      });

      // Create a file slightly under 10 MB limit (9.9 MB)
      const maxBuffer = Buffer.alloc(10 * 1024 * 1024 - 1024);
      const response = await request(app)
        .post('/')
        .attach('image', maxBuffer, { filename: 'max.jpg', contentType: 'image/jpeg' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('upload.single("image") rejects multiple files', async () => {
      const app = express();
      app.use(upload.single('image'));
      app.use(handleMulterError);
      app.post('/', (req, res) => {
        res.json({ success: true });
      });

      const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      const response = await request(app)
        .post('/')
        .attach('image', jpegBuffer, { filename: 'test1.jpg', contentType: 'image/jpeg' })
        .attach('image', jpegBuffer, { filename: 'test2.jpg', contentType: 'image/jpeg' });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('MULTIPLE_FILES_NOT_ALLOWED');
    });
  });

  describe('Rate Limiting Middleware', () => {
    test('createMediaUploadRateLimiter allows 5 requests per minute per user', async () => {
      const app = express();
      const rateLimiter = createMediaUploadRateLimiter();

      app.use((req, res, next) => {
        req.user = { id: 'user123' };
        next();
      });
      app.use(rateLimiter);
      app.post('/', (req, res) => {
        res.json({ success: true });
      });

      const responses = [];
      for (let i = 0; i < 5; i++) {
        const response = await request(app).post('/');
        responses.push(response.status);
      }

      expect(responses).toEqual([200, 200, 200, 200, 200]);
    });

    test('createMediaUploadRateLimiter blocks 6th request with 429', async () => {
      const app = express();
      const rateLimiter = createMediaUploadRateLimiter();

      app.use((req, res, next) => {
        req.user = { id: 'user456' };
        next();
      });
      app.use(rateLimiter);
      app.post('/', (req, res) => {
        res.json({ success: true });
      });

      // Make 6 requests
      for (let i = 0; i < 5; i++) {
        await request(app).post('/');
      }

      const sixthResponse = await request(app).post('/');
      expect(sixthResponse.status).toBe(429);
      expect(sixthResponse.body.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    test('createMediaUploadRateLimiter uses patient.partnerId for patients', async () => {
      const app = express();
      const rateLimiter = createMediaUploadRateLimiter();

      app.use((req, res, next) => {
        req.patient = { partnerId: 'patient123' };
        next();
      });
      app.use(rateLimiter);
      app.post('/', (req, res) => {
        res.json({ success: true });
      });

      const responses = [];
      for (let i = 0; i < 5; i++) {
        const response = await request(app).post('/');
        responses.push(response.status);
      }

      expect(responses).toEqual([200, 200, 200, 200, 200]);
    });

    test('createMediaUploadRateLimiter isolates limits between different authenticated patients', async () => {
      const app = express();
      const rateLimiter = createMediaUploadRateLimiter();

      app.use((req, res, next) => {
        // Store patient ID from request header for testing
        if (req.get('X-Patient-ID')) {
          req.patient = { partnerId: req.get('X-Patient-ID') };
        }
        next();
      });
      app.post('/', rateLimiter, (req, res) => {
        res.json({ success: true });
      });

      // Patient 1: 5 requests allowed
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .post('/')
          .set('X-Patient-ID', 'patient-1');
        expect(response.status).toBe(200);
      }

      // Patient 2: 5 requests allowed (different patient ID, separate limit)
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .post('/')
          .set('X-Patient-ID', 'patient-2');
        expect(response.status).toBe(200);
      }
    });

    test('createMediaUploadRateLimiter skips non-POST requests', async () => {
      const app = express();
      const rateLimiter = createMediaUploadRateLimiter();

      app.use((req, res, next) => {
        req.user = { id: 'user789' };
        next();
      });
      app.use(rateLimiter);
      app.get('/', (req, res) => {
        res.json({ success: true });
      });

      // GET requests should not be rate limited
      const responses = [];
      for (let i = 0; i < 10; i++) {
        const response = await request(app).get('/');
        responses.push(response.status);
      }

      // All should be 200, not rate limited
      expect(responses.every((status) => status === 200)).toBe(true);
    });
  });

  describe('Error Handler Middleware', () => {
    test('handleMulterError responds with FILE_TOO_LARGE for LIMIT_FILE_SIZE', () => {
      const mockErr = Object.create(require('multer').MulterError.prototype);
      mockErr.message = 'File too large';
      mockErr.code = 'LIMIT_FILE_SIZE';

      const req = {};
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const next = jest.fn();

      handleMulterError(mockErr, req, res, next);

      expect(res.status).toHaveBeenCalledWith(413);
      expect(res.json).toHaveBeenCalledWith({
        error: `File size exceeds maximum of ${MAX_FILE_SIZE / (1024 * 1024)} MB`,
        code: 'FILE_TOO_LARGE',
      });
    });

    test('handleMulterError responds with MULTIPLE_FILES_NOT_ALLOWED for LIMIT_FILE_COUNT', () => {
      const mockErr = Object.create(require('multer').MulterError.prototype);
      mockErr.message = 'Too many files';
      mockErr.code = 'LIMIT_FILE_COUNT';

      const req = {};
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const next = jest.fn();

      handleMulterError(mockErr, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Only one file is allowed',
        code: 'MULTIPLE_FILES_NOT_ALLOWED',
      });
    });

    test('handleMulterError responds with INVALID_FILE_TYPE for custom file type error', async () => {
      const mockErr = new Error('File type not allowed: application/pdf');
      mockErr.code = 'INVALID_FILE_TYPE';

      const req = {};
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const next = jest.fn();

      handleMulterError(mockErr, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'File type not allowed: application/pdf',
        code: 'INVALID_FILE_TYPE',
      });
    });

    test('handleMulterError calls next for unknown errors', async () => {
      const mockErr = new Error('Unknown error');

      const req = {};
      const res = {};
      const next = jest.fn();

      handleMulterError(mockErr, req, res, next);

      expect(next).toHaveBeenCalledWith(mockErr);
    });
  });
});
