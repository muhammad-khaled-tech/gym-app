// Local-date helpers. Dates are plain 'YYYY-MM-DD' strings in the phone's local time.

const pad = (n) => String(n).padStart(2, '0');

export function toISO(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromISO(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayISO() {
  return toISO(new Date());
}

export function addDays(iso, n) {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

/** Whole days from a to b (b - a). Uses UTC to ignore DST shifts. */
export function diffDays(a, b) {
  const [ya, ma, da] = a.split('-').map(Number);
  const [yb, mb, db] = b.split('-').map(Number);
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86400000);
}

/** 0 = Sunday ... 6 = Saturday */
export function weekday(iso) {
  return fromISO(iso).getDay();
}

/** 1-based program week of `iso` for a program starting on `startIso`; <= 0 before the start. */
export function weekNo(startIso, iso) {
  const d = diffDays(startIso, iso);
  return d < 0 ? Math.floor(d / 7) : Math.floor(d / 7) + 1;
}

const AR_DAYS = ['الأحد', 'الإتنين', 'التلات', 'الأربع', 'الخميس', 'الجمعة', 'السبت'];
export function dayNameAr(iso) {
  return AR_DAYS[weekday(iso)];
}

export function formatShort(iso) {
  const d = fromISO(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

export const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

/** Calendar rows (Saturday..Friday, Egyptian week) covering the month. month0 is 0-based. */
export function monthMatrix(year, month0) {
  const first = toISO(new Date(year, month0, 1));
  let d = addDays(first, -((weekday(first) + 1) % 7));
  const weeks = [];
  do {
    const w = [];
    for (let i = 0; i < 7; i++) { w.push(d); d = addDays(d, 1); }
    weeks.push(w);
  } while (fromISO(d).getMonth() === month0);
  return weeks;
}

export function formatLong(iso) {
  const d = fromISO(iso);
  return `${dayNameAr(iso)} ${d.getDate()} ${MONTHS_AR[d.getMonth()]}`;
}
