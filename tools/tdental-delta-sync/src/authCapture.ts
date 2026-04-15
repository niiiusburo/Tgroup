// AuthCapture — direct POST to /api/Account/Login (HTTP only, no browser).
// Playwright is kept as a dependency for --recon mode but not used in the sync path.
import { request } from 'undici';
import type { AuthResult, SyncConfig } from './types.js';

function decodeJwtExpiry(token: string): Date {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('AuthCapture: bearer token is not a JWT (expected 3 dot-separated parts)');
  }
  const payloadB64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  // pad base64
  const pad = payloadB64.length % 4 === 0 ? '' : '='.repeat(4 - (payloadB64.length % 4));
  const json = Buffer.from(payloadB64 + pad, 'base64').toString('utf8');
  const payload = JSON.parse(json);
  if (typeof payload.exp !== 'number') {
    return new Date(Date.now() + 7 * 24 * 3600 * 1000);
  }
  return new Date(payload.exp * 1000);
}

export async function captureAuth(cfg: SyncConfig): Promise<AuthResult> {
  const baseUrl = cfg.tdental.baseUrl.replace(/\/$/, '');
  const loginUrl = `${baseUrl}/api/Account/Login`;

  // Match the Angular SPA's POST body shape. Recon says: { userName, password, tenant }.
  // Server ignores extra fields, and some tenants also accept `username` casing, so send both camel + pascal.
  const payloads: Array<Record<string, string>> = [
    { userName: cfg.tdental.user, password: cfg.tdental.pass, tenant: cfg.tdental.tenant },
    { UserName: cfg.tdental.user, Password: cfg.tdental.pass, Tenant: cfg.tdental.tenant },
    { userName: cfg.tdental.user, password: cfg.tdental.pass },
  ];

  let lastErr: Error | null = null;
  for (const body of payloads) {
    try {
      const { statusCode, body: resBody, headers } = await request(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Tenant': cfg.tdental.tenant,
        },
        body: JSON.stringify(body),
      });
      const text = await resBody.text();
      if (statusCode < 200 || statusCode >= 300) {
        lastErr = new Error(`HTTP ${statusCode}: ${text.slice(0, 300)}`);
        continue;
      }
      let json: any;
      try {
        json = JSON.parse(text);
      } catch {
        lastErr = new Error(`Login returned non-JSON (HTTP ${statusCode}): ${text.slice(0, 200)}`);
        continue;
      }
      const token: string | undefined = json?.access_token ?? json?.accessToken ?? json?.token;
      if (!token || typeof token !== 'string') {
        lastErr = new Error(
          `Login response missing access_token. Keys: ${Object.keys(json ?? {}).join(', ')}. Body: ${text.slice(0, 200)}`,
        );
        continue;
      }

      // Optional session + device ids — SPA stores them in localStorage; not strictly needed for API calls.
      const sessionId = json?.session_info?.id ?? json?.sessionInfo?.id;
      // cookie may contain company ids but we don't need them
      void headers;

      const tokenExpiry = decodeJwtExpiry(token);
      return {
        bearerToken: token,
        baseUrl,
        tokenExpiry,
        sessionId: typeof sessionId === 'string' ? sessionId : undefined,
        deviceId: undefined,
      };
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
    }
  }

  throw new Error(
    `AuthCapture: login failed against ${loginUrl}. Last error: ${lastErr?.message ?? 'unknown'}. ` +
      `Check TDENTAL_USER / TDENTAL_PASS / TDENTAL_TENANT in .env.`,
  );
}
