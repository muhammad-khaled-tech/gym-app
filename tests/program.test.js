import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildProgram, stepsTarget, dayPlan, SESSION_BY_WEEKDAY } from '../js/engine/program.js';

const phases = (n) => buildProgram(n).map((w) => w.phase);

test('12-week program reproduces the plan', () => {
  const p = buildProgram(12);
  assert.equal(p.length, 12);
  assert.deepEqual(phases(12), [
    'ramp', 'ramp', 'build', 'build', 'build', 'build', 'deload',
    'push', 'push', 'push', 'push', 'test',
  ]);
  assert.equal(p[0].sets, 2);
  assert.equal(p[0].rir, '3');
  assert.equal(p[2].sets, 3);
  assert.equal(p[2].rir, '2');
  assert.equal(p[2].isoRir, '1');
  assert.equal(p[6].calories, 'maintenance');
  assert.equal(p[6].sets, 2);
  assert.equal(p[7].extraSetFirst, true);
  assert.equal(p[7].rir, '1–2');
  assert.equal(p[11].calories, 'deficit');
});

test('24-week program has deloads every 5th week after the ramp', () => {
  const ph = phases(24);
  const deloads = ph.map((x, i) => (x === 'deload' ? i + 1 : null)).filter(Boolean);
  assert.deepEqual(deloads, [7, 12, 17, 22]);
  assert.equal(ph[23], 'test');
  assert.equal(ph[22], 'push');
});

test('short programs', () => {
  assert.deepEqual(phases(2), ['ramp', 'ramp']);
  assert.deepEqual(phases(3), ['ramp', 'ramp', 'test']);
  assert.deepEqual(phases(4), ['ramp', 'ramp', 'build', 'test']);
});

test('steps targets ramp up', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 12].map((w) => stepsTarget(w).min), [6000, 7000, 8000, 8000, 9000, 9000]);
  assert.equal(stepsTarget(6).max, 10000);
});

test('day plan maps weekday to session', () => {
  assert.equal(SESSION_BY_WEEKDAY[6], 'pushA');
  assert.equal(SESSION_BY_WEEKDAY[5], 'rest');
  const d = dayPlan({ startIso: '2026-11-11', totalWeeks: 12, iso: '2026-11-14' }); // Saturday
  assert.equal(d.weekNumber, 1);
  assert.equal(d.inProgram, true);
  assert.equal(d.sessionKey, 'pushA');
  assert.equal(d.week.phase, 'ramp');
  const fri = dayPlan({ startIso: '2026-11-11', totalWeeks: 12, iso: '2026-11-13' });
  assert.equal(fri.sessionKey, 'rest');
  const after = dayPlan({ startIso: '2026-11-11', totalWeeks: 12, iso: '2027-02-10' });
  assert.equal(after.inProgram, false);
  assert.equal(after.week, null);
});

test('days before the start are an intro full-body block (Friday stays rest)', () => {
  const wed = dayPlan({ startIso: '2026-11-14', totalWeeks: 12, iso: '2026-11-11' });
  assert.equal(wed.sessionKey, 'fullBody');
  assert.equal(wed.week.phase, 'intro');
  assert.equal(wed.week.sets, 2);
  assert.equal(wed.inProgram, false);
  const thu = dayPlan({ startIso: '2026-11-14', totalWeeks: 12, iso: '2026-11-12' });
  assert.equal(thu.sessionKey, 'fullBody');
  const fri = dayPlan({ startIso: '2026-11-14', totalWeeks: 12, iso: '2026-11-13' });
  assert.equal(fri.sessionKey, 'rest');
  const sat = dayPlan({ startIso: '2026-11-14', totalWeeks: 12, iso: '2026-11-14' });
  assert.equal(sat.sessionKey, 'pushA');
  assert.equal(sat.weekNumber, 1);
  assert.equal(sat.week.phase, 'ramp');
});
