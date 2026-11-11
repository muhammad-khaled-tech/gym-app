// Inline SVG weight chart: daily weigh-ins (dots) + 7-day average (line).
import { diffDays, addDays, formatShort } from '../engine/dates.js';
import { movingAverage } from '../engine/energy.js';

export function weightChart(weights, endIso, startIso) {
  const pts = weights.filter((w) => diffDays(startIso, w.date) >= 0 && diffDays(w.date, endIso) >= 0);
  if (pts.length < 2) {
    return '<p class="muted">الرسم هيظهر لما تسجّل وزنك يومين أو أكتر.</p>';
  }
  const span = Math.max(7, diffDays(pts[0].date, endIso));
  const first = pts[0].date;
  const avg = [];
  for (let i = 0; i <= span; i++) {
    const d = addDays(first, i);
    const a = movingAverage(weights, d, 7);
    if (a != null) avg.push({ x: i, y: a });
  }
  const ys = [...pts.map((p) => p.kg), ...avg.map((p) => p.y)];
  const lo = Math.floor(Math.min(...ys) - 0.5);
  const hi = Math.ceil(Math.max(...ys) + 0.5);
  const W = 340, H = 170, L = 34, R = 8, T = 10, B = 22;
  const sx = (x) => L + (x / span) * (W - L - R);
  const sy = (y) => T + ((hi - y) / (hi - lo || 1)) * (H - T - B);
  const grid = [];
  const step = Math.max(1, Math.round((hi - lo) / 4));
  for (let y = lo; y <= hi; y += step) {
    grid.push(`<line x1="${L}" x2="${W - R}" y1="${sy(y)}" y2="${sy(y)}" class="grid"/><text x="${L - 4}" y="${sy(y) + 4}" class="axis" text-anchor="end">${y}</text>`);
  }
  const dots = pts.map((p) => `<circle cx="${sx(diffDays(first, p.date)).toFixed(1)}" cy="${sy(p.kg).toFixed(1)}" r="2.6" class="dot"/>`).join('');
  const line = avg.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ');
  return `
    <svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="رسم الوزن" direction="ltr">
      ${grid.join('')}
      <path d="${line}" class="avg"/>
      ${dots}
      <text x="${L}" y="${H - 4}" class="axis">${formatShort(first)}</text>
      <text x="${W - R}" y="${H - 4}" class="axis" text-anchor="end">${formatShort(endIso)}</text>
    </svg>
    <div class="legend"><span class="lg-dot"></span> وزن اليوم <span class="lg-line"></span> متوسط 7 أيام</div>`;
}
