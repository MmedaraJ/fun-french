export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

function pad(n: number) {
  return n < 10 ? '0' + n : String(n);
}

/** Local calendar day for a timestamp, "YYYY-MM-DD". */
export function dayKey(ts: number = Date.now()): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Parse a day key back to local midnight. */
export function dayStart(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, n: number): string {
  const d = dayStart(key);
  d.setDate(d.getDate() + n);
  return dayKey(d.getTime());
}

/** Whole days from a to b (b later = positive), DST-safe. */
export function daysBetween(a: string, b: string): number {
  const da = dayStart(a);
  const db = dayStart(b);
  return Math.round((Date.UTC(db.getFullYear(), db.getMonth(), db.getDate()) - Date.UTC(da.getFullYear(), da.getMonth(), da.getDate())) / DAY);
}

const FR_DAYS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const EN_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function weekdayShort(key: string, lang: 'fr' | 'en' = 'en'): string {
  const d = dayStart(key).getDay();
  return lang === 'fr' ? FR_DAYS[d] : EN_DAYS[d];
}

export function prettyDay(key: string): string {
  const today = dayKey();
  if (key === today) return 'Today';
  if (key === addDays(today, -1)) return 'Yesterday';
  const d = dayStart(key);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return `${EN_DAYS[d.getDay()]} ${d.getDate()} ${EN_MONTHS[d.getMonth()]}${sameYear ? '' : ' ' + d.getFullYear()}`;
}

export function monthShort(key: string): string {
  return EN_MONTHS[dayStart(key).getMonth()];
}

export function formatDuration(ms: number): string {
  const totalMin = Math.round(ms / MINUTE);
  if (totalMin < 1) return `${Math.max(0, Math.round(ms / 1000))}s`;
  if (totalMin < 60) return `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function timeOfDay(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours()}:${pad(d.getMinutes())}`;
}
