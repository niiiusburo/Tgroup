// ApiClient — paginated GET with retry + throttle.
import { request } from 'undici';
import type { AuthResult, EndpointEntry, SyncConfig } from './types.js';

export class ApiClient {
  private lastRequestAt = 0;

  constructor(
    private auth: AuthResult,
    private cfg: SyncConfig,
  ) {}

  private async throttle(): Promise<void> {
    const gap = this.cfg.sync.throttleMs;
    if (gap <= 0) return;
    const elapsed = Date.now() - this.lastRequestAt;
    if (elapsed < gap) {
      await new Promise((r) => setTimeout(r, gap - elapsed));
    }
    this.lastRequestAt = Date.now();
  }

  private debug(msg: string): void {
    if (this.cfg.cli.debug) console.error(`[api] ${msg}`);
  }

  async get<T = unknown>(
    url: string,
    extraQuery?: Record<string, string | number | boolean | undefined>,
  ): Promise<T> {
    const u = new URL(url);
    if (extraQuery) {
      for (const [k, v] of Object.entries(extraQuery)) {
        if (v === undefined || v === null || v === '') continue;
        u.searchParams.set(k, String(v));
      }
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.auth.bearerToken}`,
      Accept: 'application/json',
    };
    if (this.auth.sessionId) headers['X-Session-Id'] = this.auth.sessionId;
    if (this.auth.deviceId) headers['X-Device-Id'] = this.auth.deviceId;
    headers['X-Tenant'] = this.cfg.tdental.tenant;

    const maxRetries = this.cfg.sync.maxRetries;
    let attempt = 0;
    let lastErr: unknown;
    while (attempt <= maxRetries) {
      await this.throttle();
      this.debug(`GET ${u.toString()} (attempt ${attempt + 1})`);
      try {
        const { statusCode, body } = await request(u.toString(), { method: 'GET', headers });
        if (statusCode === 401 || statusCode === 403) {
          const text = await body.text().catch(() => '');
          throw new Error(
            `ApiClient: auth failed after token capture (HTTP ${statusCode}). Body: ${text.slice(0, 300)}`,
          );
        }
        if (statusCode >= 500 || statusCode === 429) {
          const text = await body.text().catch(() => '');
          lastErr = new Error(
            `ApiClient: HTTP ${statusCode} on ${u.pathname}. Body: ${text.slice(0, 300)}`,
          );
        } else if (statusCode >= 200 && statusCode < 300) {
          const text = await body.text();
          return JSON.parse(text) as T;
        } else {
          const text = await body.text().catch(() => '');
          throw new Error(
            `ApiClient: HTTP ${statusCode} on ${u.pathname}. Body: ${text.slice(0, 300)}`,
          );
        }
      } catch (e) {
        lastErr = e;
      }
      attempt++;
      if (attempt > maxRetries) break;
      const backoff = Math.min(16_000, 1000 * Math.pow(2, attempt - 1));
      this.debug(`retry in ${backoff}ms (err=${(lastErr as Error)?.message ?? 'unknown'})`);
      await new Promise((r) => setTimeout(r, backoff));
    }
    throw lastErr instanceof Error ? lastErr : new Error(`ApiClient: give up after ${maxRetries + 1} tries`);
  }

  async *fetchAllPages(
    entry: EndpointEntry,
    baseQuery: Record<string, string | number | boolean | undefined>,
  ): AsyncGenerator<unknown[], void, unknown> {
    const pageSize = entry.pagination.default_size ?? this.cfg.sync.pageSize;
    const limitParam = entry.pagination.param_limit ?? 'limit';
    const offsetParam = entry.pagination.param_offset ?? 'offset';

    let offset = 0;
    let total: number | null = null;
    while (true) {
      const q: Record<string, string | number | boolean | undefined> = { ...baseQuery };
      q[limitParam] = pageSize;
      q[offsetParam] = offset;

      const page = await this.get<any>(entry.list_url, q);

      let items: unknown[];
      if (Array.isArray(page)) {
        items = page;
        total = items.length;
      } else if (page && Array.isArray(page.items)) {
        items = page.items;
        if (typeof page.totalItems === 'number') total = page.totalItems;
      } else {
        throw new Error(`ApiClient: unexpected response shape from ${entry.list_url}`);
      }

      this.debug(`${entry.list_url} page offset=${offset} got ${items.length} / total=${total}`);

      if (items.length === 0) return;
      yield items;

      offset += items.length;
      if (total !== null && offset >= total) return;
      if (items.length < pageSize) return;
    }
  }
}
