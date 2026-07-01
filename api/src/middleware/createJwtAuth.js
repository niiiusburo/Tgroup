'use strict';

/**
 * @crossref:domain[auth]
 * @crossref:used-in[Shared JWT auth factory for investorAuth.js and patientAuth.js]
 * @crossref:uses[jsonwebtoken, JWT_SECRET / INVESTOR_JWT_SECRET / PATIENT_JWT_SECRET]
 *
 * createJwtAuth — shared factory that eliminates duplicated Bearer-token
 * extraction + jwt.verify boilerplate across portal auth middleware files.
 *
 * Each caller supplies:
 *   - secretEnvVar:      env var name holding the JWT signing secret
 *   - fallbackEnvVar:    optional fallback env var (e.g. JWT_SECRET)
 *   - userKey:           req property to populate with the decoded payload
 *   - validateFn:        optional async (decoded, req) => true | false | { status, ...body }
 *
 * validateFn return values:
 *   - true / undefined  → success, continue to next()
 *   - false             → 401 generic auth failure
 *   - { status, ...body } → custom error response (e.g. 403 Forbidden with a code)
 *
 * The factory sets req[userKey] = decoded BEFORE calling validateFn, so
 * validateFn may overwrite it with enriched data (e.g. DB account fields).
 */
const jwt = require('jsonwebtoken');

function createJwtAuth({ secretEnvVar, fallbackEnvVar, userKey, validateFn }) {
  return async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized', code: 'NO_TOKEN' });
    }

    const token = authHeader.slice(7);
    let decoded;
    try {
      const secret = process.env[secretEnvVar]
        || (fallbackEnvVar ? process.env[fallbackEnvVar] : undefined);
      if (!secret) {
        throw new Error(`${secretEnvVar} is required`);
      }
      decoded = jwt.verify(token, secret);
    } catch (err) {
      return res.status(401).json({ error: 'Unauthorized', code: 'INVALID_TOKEN', message: err.message });
    }

    req[userKey] = decoded;

    if (validateFn) {
      try {
        const result = await validateFn(decoded, req);
        if (result === false) {
          return res.status(401).json({ error: 'Unauthorized', code: 'AUTH_VALIDATION_FAILED' });
        }
        if (result && typeof result === 'object' && result.status) {
          const { status, ...body } = result;
          return res.status(status).json(body);
        }
      } catch (err) {
        return res.status(401).json({ error: 'Unauthorized', code: 'INVALID_TOKEN', message: err.message });
      }
    }

    next();
  };
}

module.exports = { createJwtAuth };
