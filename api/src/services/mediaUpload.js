'use strict';
/**
 * @crossref:domain[patient-portal]
 * @crossref:used-in[api/src/routes/patient/media.js, api/src/routes/media.js]
 * Shared multer configuration and rate limiting middleware for media uploads.
 * Enforces file size limits (10 MB), file type validation (images only), and rate limiting (5/minute).
 */

const multer = require('multer');
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const UPLOADS_PER_MINUTE = 5;

/**
 * Multer configuration for media uploads.
 * Enforces file size limits and file type validation.
 * Accepts multiple field names: 'file', 'image', or 'photo'.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      const err = new Error(`File type not allowed: ${file.mimetype}`);
      err.code = 'INVALID_FILE_TYPE';
      err.status = 400;
      cb(err);
    }
  },
});

/**
 * Multer configuration that accepts any of the three field names.
 * Uses upload.fields() to accept 'file', 'image', or 'photo'.
 */
const uploadMultipleFields = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      const err = new Error(`File type not allowed: ${file.mimetype}`);
      err.code = 'INVALID_FILE_TYPE';
      err.status = 400;
      cb(err);
    }
  },
}).fields([
  { name: 'file', maxCount: 1 },
  { name: 'image', maxCount: 1 },
  { name: 'photo', maxCount: 1 },
]);

/**
 * Middleware to normalize file field from multiple possible names.
 * Accepts 'file', 'image', or 'photo' and normalizes to req.file.
 * Rejects if multiple files are provided across all fields.
 */
const normalizeFileField = (req, res, next) => {
  const files = req.files || {};
  const fileArray = files.file || files.image || files.photo || [];

  // Check total file count across all fields
  const totalFiles = (files.file?.length || 0) + (files.image?.length || 0) + (files.photo?.length || 0);
  if (totalFiles > 1) {
    return res.status(400).json({
      error: 'Only one file is allowed',
      code: 'MULTIPLE_FILES_NOT_ALLOWED',
    });
  }

  // Normalize the first file found to req.file
  req.file = fileArray[0] || undefined;
  next();
};

/**
 * Rate limiting middleware for media uploads.
 * Limits to 5 uploads per minute per authenticated user.
 *
 * NOTE: Uses express-rate-limit's default in-memory MemoryStore, which is
 * per-process and only evicts entries on window expiry. This is fine for the
 * current single-process Docker deployments, but for multi-instance or
 * long-uptime (>24h) production servers, pass a shared store instead
 * (e.g. `store: new RedisStore(...)`) to bound memory and share counters.
 */
const createMediaUploadRateLimiter = () => {
  return rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: UPLOADS_PER_MINUTE,
    keyGenerator: (req) => {
      // For authenticated patient: use patient.partnerId
      if (req.patient?.partnerId) {
        return `patient:${req.patient.partnerId}`;
      }
      // For authenticated staff: use user.id
      if (req.user?.id) {
        return `user:${req.user.id}`;
      }
      // Fallback to IP using ipKeyGenerator for IPv6 safety
      return ipKeyGenerator(req);
    },
    skip: (req) => {
      // Skip rate limiting for non-upload requests
      return req.method !== 'POST';
    },
    handler: (req, res) => {
      res.status(429).json({
        error: 'Too many uploads, please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
      });
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

/**
 * Error handler middleware for multer errors.
 * Maps multer errors to standard error envelope.
 */
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: `File size exceeds maximum of ${MAX_FILE_SIZE / (1024 * 1024)} MB`,
        code: 'FILE_TOO_LARGE',
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: 'Only one file is allowed',
        code: 'MULTIPLE_FILES_NOT_ALLOWED',
      });
    }
  }

  // Handle custom file type validation error
  if (err.code === 'INVALID_FILE_TYPE') {
    return res.status(400).json({
      error: err.message,
      code: 'INVALID_FILE_TYPE',
    });
  }

  next(err);
};

module.exports = {
  upload,
  uploadMultipleFields,
  normalizeFileField,
  createMediaUploadRateLimiter,
  handleMulterError,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  UPLOADS_PER_MINUTE,
};
