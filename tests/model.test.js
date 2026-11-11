import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultState, importJSON, exportJSON, upsertByDate } from '../js/store.js';
import { stats, menuFor, eatenTotals, lastSets, progressionHint, programEnd } from '../js/model.js';

// Reference example from the research report (not a real person's data).
function refState() {
  const s = defaultState();
  s.profile = {
    age: 30, height: 175, weightKg: 95, neck: 40, waist: 105, hip: 108, arm: 36,
    pal: 1.375, startDate: '2026-11-11', totalWeeks: 12, targetBf: 20, pace: 'balanced',
  };
  s.weights = [{ date: '2026-11-11', kg: 95 }];
  s.measurements = [{ date: '2026-11-11', waist: 105, neck: 40, hip: 108, arm: 36 }];
  return s;
}

test('stats for the reference example on day 1', () => {
  const st = stats(refState(), '2026-11-11');
  assert.equal(st.targets.kcal, 2100);
  assert.ok(Math.abs(st.bodyFat.bf - 29.9) < 0.05);
  assert.equal(st.plan.weekNumber, 1);
  assert.equal(st.mode, 'deficit');
  assert.equal(programEnd(refState().profile), '2027-02-02');
});

test('default pace is fast (25%) when none is saved', () => {
  const s = refState();
  delete s.profile.pace;
  assert.equal(stats(s, '2026-11-11').targets.kcal, 1950);
});

test('schema 1 data moves to the fast pace once', () => {
  const s = refState();
  s.schema = 1;
  s.profile.pace = 'balanced';
  const migrated = importJSON(JSON.stringify(s));
  assert.equal(migrated.profile.pace, 'fast');
  assert.equal(migrated.schema, 2);
  // a later deliberate choice of 'balanced' (schema 2) is kept
  const again = importJSON(JSON.stringify({ ...migrated, profile: { ...migrated.profile, pace: 'balanced' } }));
  assert.equal(again.profile.pace, 'balanced');
});

test('fast pace lowers calories but keeps protein', () => {
  const s = refState();
  s.profile.pace = 'fast';
  const st = stats(s, '2026-11-11');
  assert.equal(st.targets.kcal, 1950);
  assert.equal(st.targets.protein, 175);
  assert.equal(stats(s, '2026-12-23').targets.kcal, 2600); // deload week still at maintenance
});

test('deload week switches to maintenance calories', () => {
  const st = stats(refState(), '2026-12-23'); // week 7
  assert.equal(st.plan.week.phase, 'deload');
  assert.equal(st.mode, 'maintenance');
  assert.equal(st.targets.kcal, 2600);
});

test('menu and eaten totals', () => {
  const s = refState();
  const day = menuFor(s, '2026-11-14');
  assert.ok(Math.abs(day.totals.kcal - 2100) <= 75);
  s.days['2026-11-14'] = { eaten: [0, 1], swaps: {}, extras: [{ food: 'koshary', g: 250 }], steps: null };
  const t = eatenTotals(s, '2026-11-14');
  assert.ok(Math.abs(t.kcal - (day.meals[0].totals.kcal + day.meals[1].totals.kcal + 407.5)) < 0.01);
});

test('workout history helpers', () => {
  const s = refState();
  s.workouts['2026-11-14'] = { bench_press: [{ w: 60, r: 8 }, { w: 60, r: 8 }] };
  const last = lastSets(s, 'bench_press', '2026-11-21');
  assert.equal(last.date, '2026-11-14');
  assert.equal(progressionHint(last, '6–8', false), '+2.5 كجم (أو الدمبل اللي بعده)');
  assert.equal(progressionHint({ sets: [{ w: 60, r: 8 }, { w: 60, r: 7 }] }, '6–8', false), null);
  assert.equal(lastSets(s, 'bench_press', '2026-11-14'), null);
});

test('backup round trip and validation', () => {
  const s = refState();
  const back = importJSON(exportJSON(s));
  assert.deepEqual(back.profile, s.profile);
  assert.throws(() => importJSON('not json'), /JSON/);
  assert.throws(() => importJSON('{"a":1}'), /نسخة احتياطية/);
  assert.deepEqual(upsertByDate([{ date: '2026-11-12', kg: 1 }], { date: '2026-11-11', kg: 2 }).map((x) => x.date), ['2026-11-11', '2026-11-12']);
});
