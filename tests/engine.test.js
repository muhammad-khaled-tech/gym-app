import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toISO, fromISO, addDays, diffDays, weekday, weekNo } from '../js/engine/dates.js';
import { navyMale, rfmMale, armyMale, estimateBodyFat } from '../js/engine/bodycomp.js';
import {
  mifflinMale, katch, bmr, deficitPct, computeTargets, movingAverage, trendTdee, advice,
} from '../js/engine/energy.js';

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} expected ${b} ±${tol}, got ${a}`);
// Reference example from the research report (not a real person's data).
const REF = { weightKg: 95, height: 175, age: 30, neck: 40, waist: 105 };

test('dates helpers', () => {
  assert.equal(toISO(new Date(2026, 10, 11)), '2026-11-11');
  assert.equal(fromISO('2026-11-11').getDate(), 11);
  assert.equal(addDays('2026-11-11', 21), '2026-12-02');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(diffDays('2026-11-11', '2026-12-02'), 21);
  assert.equal(weekday('2026-11-14'), 6); // Saturday
  assert.equal(weekNo('2026-11-11', '2026-11-11'), 1);
  assert.equal(weekNo('2026-11-11', '2026-11-17'), 1);
  assert.equal(weekNo('2026-11-11', '2026-11-18'), 2);
  assert.ok(weekNo('2026-11-11', '2026-11-10') <= 0);
});

test('body fat formulas match the report example', () => {
  near(navyMale(REF), 29.1, 0.05, 'navy');
  near(rfmMale(REF), 30.7, 0.05, 'rfm');
  near(armyMale(REF), 30.2, 0.05, 'army');
  const r = estimateBodyFat(REF);
  near(r.bf, 29.9, 0.05, 'bf');
  near(r.lbm, 66.6, 0.1, 'lbm');
  near(r.fatMass, 28.4, 0.1, 'fat mass');
});

test('BMR and targets', () => {
  assert.equal(Math.round(mifflinMale(REF)), 1899);
  near(katch(70), 1882, 0.5);
  const { bf, lbm } = estimateBodyFat(REF);
  assert.equal(Math.round(bmr({ ...REF, bf, lbm })), 1899); // Mifflin above 15%
  assert.equal(Math.round(bmr({ ...REF, bf: 12, lbm: 89.8 })), Math.round(katch(89.8)));
  assert.equal(deficitPct(29.9), 0.20);
  assert.equal(deficitPct(20), 0.175);
  assert.equal(deficitPct(12), 0.125);
  // 'fast' pace: one step bigger deficit, still capped at 750 kcal/day
  assert.equal(deficitPct(29.9, 'fast'), 0.25);
  assert.equal(deficitPct(20, 'fast'), 0.20);
  assert.equal(deficitPct(12, 'fast'), 0.15);
  const fast = computeTargets({ tdee: 2611, bf: 29.9, lbm: 66.6, weightKg: 95, mode: 'deficit', pace: 'fast' });
  assert.equal(fast.kcal, 1950);
  assert.equal(fast.protein, 175); // protein stays high when the deficit grows
  const capped = computeTargets({ tdee: 3600, bf: 35, lbm: 80, weightKg: 125, mode: 'deficit', pace: 'fast' });
  assert.equal(capped.kcal, 2850); // 25% would be 900, cap is 750
  const fastMaint = computeTargets({ tdee: 2611, bf: 29.9, lbm: 66.6, weightKg: 95, mode: 'maintenance', pace: 'fast' });
  assert.equal(fastMaint.kcal, 2600); // pace never touches maintenance weeks
  const t = computeTargets({ tdee: 1898.75 * 1.375, bf, lbm, weightKg: 95, mode: 'deficit' });
  assert.equal(t.kcal, 2100);
  assert.equal(t.protein, 175);
  near(t.protein * 4 + t.fat * 9 + t.carbs * 4, t.kcal, 6, 'macros add up');
  assert.equal(t.fat, 58);
  assert.equal(t.carbs, 220);
  const m = computeTargets({ tdee: 2611, bf, lbm, weightKg: 95, mode: 'maintenance' });
  assert.equal(m.kcal, 2600);
  const off = computeTargets({ tdee: 2611, bf, lbm, weightKg: 95, mode: 'deficit', kcalOffset: -150 });
  assert.equal(off.kcal, 1950);
  const floor = computeTargets({ tdee: 1700, bf: 30, lbm: 50, weightKg: 70, mode: 'deficit' });
  assert.equal(floor.kcal, 1500);
});

test('moving average and trend TDEE', () => {
  const start = '2026-11-11';
  const weights = [];
  // 22 daily weigh-ins dropping exactly 0.1 kg/day
  for (let i = 0; i <= 21; i++) weights.push({ date: addDays(start, i), kg: 95 - 0.1 * i });
  const end = addDays(start, 21);
  near(movingAverage(weights, end, 7), 95 - 0.1 * 18, 1e-9, 'avg of last 7');
  // window 21 days: avg(first 7) - avg(last 7) = 1.4 kg over 14 days between centres
  const tdee = trendTdee({ weights, intakeFor: () => 2200, endIso: end, windowDays: 21 });
  near(tdee, 2200 + (1.4 * 7700) / 14, 1, 'trend tdee');
  // not enough data
  assert.equal(trendTdee({ weights: weights.slice(0, 10), intakeFor: () => 2200, endIso: end }), null);
});

test('advice rules', () => {
  const start = '2026-11-11';
  const flat = [];
  for (let i = 0; i <= 28; i++) flat.push({ date: addDays(start, i), kg: 100 });
  const waists = [{ date: start, cm: 108 }, { date: addDays(start, 28), cm: 108 }];
  const a = advice({ weights: flat, waists, endIso: addDays(start, 28), weekNumber: 5 });
  assert.equal(a.type, 'cut-more');
  assert.equal(a.kcalDelta, -150);
  const fast = [];
  for (let i = 0; i <= 28; i++) fast.push({ date: addDays(start, i), kg: 100 - 0.2 * i });
  assert.equal(advice({ weights: fast, waists, endIso: addDays(start, 28), weekNumber: 5 }).type, 'eat-more');
  assert.equal(advice({ weights: flat, waists, endIso: addDays(start, 10), weekNumber: 2 }).type, 'wait');
  const good = [];
  for (let i = 0; i <= 28; i++) good.push({ date: addDays(start, i), kg: 100 - 0.1 * i });
  assert.equal(advice({ weights: good, waists, endIso: addDays(start, 28), weekNumber: 5 }).type, 'on-track');
});
