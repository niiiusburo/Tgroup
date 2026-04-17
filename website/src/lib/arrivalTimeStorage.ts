export const ARRIVAL_TIMES_KEY = 'tgclinic:arrivalTimes';

export function getStoredArrivalTime(id: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(ARRIVAL_TIMES_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    return map[id] || null;
  } catch {
    return null;
  }
}

export function setStoredArrivalTime(id: string, time: string): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(ARRIVAL_TIMES_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    map[id] = time;
    localStorage.setItem(ARRIVAL_TIMES_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}
