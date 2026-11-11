// Derived numbers for a date, from the stored state. Pure (no DOM).
import { addDays, weekday, diffDays } from './engine/dates.js';
import { estimateBodyFat } from './engine/bodycomp.js';
import { bmr as bmrFn, computeTargets, movingAverage, trendTdee, advice } from './engine/energy.js';
import { dayPlan, buildProgram } from './engine/program.js';
import { scaleDay, applySwaps, dayIntake, totals } from './engine/menu.js';
import { MENUS } from './data/menus.js';

function latestOnOrBefore(list, iso) {
  const xs = list.filter((x) => diffDays(x.date, iso) >= 0);
  return xs.length ? xs[xs.length - 1] : null;
}

export function programEnd(profile) {
  return addDays(profile.startDate, profile.totalWeeks * 7 - 1);
}

export function program(profile) {
  return buildProgram(profile.totalWeeks);
}

/** Everything the screens need for a given date. */
export function stats(state, iso) {
  const p = state.profile;
  const avg = movingAverage(state.weights, iso, 7);
  const lastW = latestOnOrBefore(state.weights, iso);
  const weightKg = avg ?? lastW?.kg ?? p.weightKg;
  const m = latestOnOrBefore(state.measurements, iso) ?? {};
  const waist = m.waist ?? p.waist;
  const neck = m.neck ?? p.neck;
  const hip = m.hip ?? p.hip;
  const arm = m.arm ?? p.arm;
  const bodyFat = estimateBodyFat({ weightKg, height: p.height, waist, neck });
  const bmr = bmrFn({ weightKg, height: p.height, age: p.age, bf: bodyFat.bf, lbm: bodyFat.lbm });
  const tdee = state.tdeeOverride ?? bmr * p.pal;
  const plan = dayPlan({ startIso: p.startDate, totalWeeks: p.totalWeeks, iso });
  const goalReached = bodyFat.bf <= p.targetBf;
  const mode = goalReached || plan.week?.calories === 'maintenance' ? 'maintenance' : 'deficit';
  const targets = computeTargets({
    tdee, bf: bodyFat.bf, lbm: bodyFat.lbm, weightKg, mode, kcalOffset: state.kcalOffset ?? 0,
    pace: p.pace ?? 'fast',
  });
  return {
    weightKg, avg, waist, neck, hip, arm, bodyFat, bmr, tdee,
    tdeeSource: state.tdeeOverride ? 'trend' : 'formula', plan, mode, goalReached, targets,
  };
}

/** The menu for a date (scaled to that date's targets, with that date's swaps). */
export function menuFor(state, iso, s = stats(state, iso)) {
  const day = scaleDay(MENUS[weekday(iso)], s.targets);
  return applySwaps(day, state.days[iso]?.swaps ?? {});
}

/** Totals of what was eaten (checked meals + extras). */
export function eatenTotals(state, iso, day = menuFor(state, iso)) {
  const log = state.days[iso];
  const t = { kcal: 0, p: 0, c: 0, f: 0 };
  if (!log) return t;
  for (const mi of log.eaten ?? []) {
    const m = day.meals[mi];
    if (m) for (const k of Object.keys(t)) t[k] += m.totals[k];
  }
  const ex = totals(log.extras ?? []);
  for (const k of Object.keys(t)) t[k] += ex[k];
  return t;
}

function intakeFor(state, fallbackKcal) {
  return (iso) => {
    const log = state.days[iso];
    if (!log) return fallbackKcal;
    const k = dayIntake(log, menuFor(state, iso));
    return k ?? fallbackKcal;
  };
}

export function trend(state, iso, s = stats(state, iso)) {
  return trendTdee({ weights: state.weights, intakeFor: intakeFor(state, s.targets.kcal), endIso: iso, windowDays: 21 });
}

export function adviceFor(state, iso, s = stats(state, iso)) {
  const waists = state.measurements.filter((m) => m.waist).map((m) => ({ date: m.date, cm: m.waist }));
  return advice({ weights: state.weights, waists, endIso: iso, weekNumber: s.plan.weekNumber });
}

/** Last logged sets for an exercise before `iso`. */
export function lastSets(state, exKey, iso) {
  const dates = Object.keys(state.workouts).filter((d) => d < iso && state.workouts[d][exKey]?.some((x) => x.w || x.r)).sort();
  if (!dates.length) return null;
  const d = dates[dates.length - 1];
  return { date: d, sets: state.workouts[d][exKey] };
}

/** "+weight" hint: every logged set reached the top of the rep range last time. */
export function progressionHint(last, reps, lower) {
  if (!last) return null;
  const top = Number(String(reps).split(/[–-]/).pop().match(/\d+/)?.[0]);
  const done = last.sets.filter((x) => x.r);
  if (!top || !done.length) return null;
  if (done.every((x) => Number(x.r) >= top)) return lower ? '+5 كجم' : '+2.5 كجم (أو الدمبل اللي بعده)';
  return null;
}
