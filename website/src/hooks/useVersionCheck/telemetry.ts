import { PENDING_TELEMETRY_KEY, TELEMETRY_ENDPOINT } from './constants';

export async function flushPendingTelemetry(): Promise<void> {
  try {
    const raw = localStorage.getItem(PENDING_TELEMETRY_KEY);
    if (!raw) return;
    const events: unknown[] = JSON.parse(raw);
    if (!Array.isArray(events) || events.length === 0) return;

    const results = await Promise.allSettled(
      events.map((payload) =>
        fetch(TELEMETRY_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true,
        })
      )
    );

    const failed: unknown[] = [];
    results.forEach((r, i) => {
      if (r.status === 'rejected' || !r.value.ok) {
        failed.push(events[i]);
      }
    });

    if (failed.length === 0) {
      localStorage.removeItem(PENDING_TELEMETRY_KEY);
    } else {
      localStorage.setItem(PENDING_TELEMETRY_KEY, JSON.stringify(failed));
    }
  } catch {
    // ignore
  }
}

export function queueVersionTelemetry(payload: unknown): void {
  try {
    const pending = JSON.parse(localStorage.getItem(PENDING_TELEMETRY_KEY) || '[]');
    pending.push(payload);
    localStorage.setItem(PENDING_TELEMETRY_KEY, JSON.stringify(pending));
  } catch {
    // ignore
  }
}
