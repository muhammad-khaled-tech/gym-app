// Energy targets and the plan's adjustment rules.
import { addDays, diffDays } from './dates.js';

export const KCAL_PER_KG = 7700;
export const MIN_KCAL = 1500;

export function mifflinMale({ weightKg, height, age }) {
  return 10 * weightKg + 6.25 * height - 5 * age + 5;
}

export function katch(lbm) {
  return 370 + 21.6 * lbm;
}

/** Mifflin by default; Katch-McArdle once body fat is under 15%. */
export function bmr({ weightKg, height, age, bf, lbm }) {
  return bf < 15 ? katch(lbm) : mifflinMale({ weightKg, height, age });
}

export function deficitPct(bf) {
  if (bf >= 25) return 0.20;
  if (bf >= 15) return 0.175;
  return 0.125;
}

const round50 = (x) => Math.round(x / 50) * 50;

/**
 * mode: 'deficit' | 'maintenance'. kcalOffset: user-applied correction (e.g. -150).
 * Returns grams for protein/fat/carbs.
 */
export function computeTargets({ tdee, bf, lbm, weightKg, mode = 'deficit', kcalOffset = 0 }) {
  let kcal;
  let deficit = 0;
  if (mode === 'maintenance') {
    kcal = round50(tdee) + kcalOffset;
  } else {
    deficit = Math.min(tdee * deficitPct(bf), 750);
    kcal = round50(tdee - deficit) + kcalOffset;
  }
  kcal = Math.max(kcal, MIN_KCAL);
  const protein = Math.round(bf >= 25 ? 2.1 * (lbm / 0.8) : 2.0 * weightKg);
  const fat = Math.max(Math.round((0.25 * kcal) / 9), Math.round(0.5 * weightKg));
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { kcal, protein, fat, carbs, deficit: Math.round(tdee - kcal) };
}

/** Entries with date in (endIso - days, endIso]. */
function inWindow(weights, endIso, days) {
  return weights.filter((w) => {
    const d = diffDays(w.date, endIso);
    return d >= 0 && d < days;
  });
}

/** Mean weight of the `days` days ending at endIso (null when empty). */
export function movingAverage(weights, endIso, days = 7) {
  const xs = inWindow(weights, endIso, days);
  if (!xs.length) return null;
  return xs.reduce((s, w) => s + w.kg, 0) / xs.length;
}

const MIN_WEIGH_INS = 4;

/**
 * Real TDEE from the scale trend over the last `windowDays` days:
 * avg intake + (avg of first 7 days - avg of last 7 days) * 7700 / (windowDays - 7).
 * intakeFor(iso) -> kcal eaten that day. Returns null without enough weigh-ins.
 */
export function trendTdee({ weights, intakeFor, endIso, windowDays = 21 }) {
  const firstEnd = addDays(endIso, -(windowDays - 7));
  const first = inWindow(weights, firstEnd, 7);
  const last = inWindow(weights, endIso, 7);
  if (first.length < MIN_WEIGH_INS || last.length < MIN_WEIGH_INS) return null;
  const avg = (xs) => xs.reduce((s, w) => s + w.kg, 0) / xs.length;
  let intake = 0;
  for (let i = 0; i < windowDays; i++) intake += intakeFor(addDays(endIso, -i));
  intake /= windowDays;
  return intake + ((avg(first) - avg(last)) * KCAL_PER_KG) / (windowDays - 7);
}

function waistChange(waists, endIso) {
  const sorted = [...waists].filter((w) => diffDays(w.date, endIso) >= 0).sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length < 2) return 0;
  const latest = sorted[sorted.length - 1];
  const older = sorted.filter((w) => diffDays(w.date, latest.date) >= 7);
  if (!older.length) return 0;
  return latest.cm - older[older.length - 1].cm;
}

/**
 * Plan rules from week 3: compare the 7-day average now vs two weeks ago.
 * type: 'wait' | 'cut-more' | 'eat-more' | 'on-track'
 */
export function advice({ weights, waists = [], endIso, weekNumber }) {
  if (weekNumber < 3) return { type: 'wait', kcalDelta: 0, lossPerWeek: null };
  const now = inWindow(weights, endIso, 7);
  const before = inWindow(weights, addDays(endIso, -14), 7);
  if (now.length < MIN_WEIGH_INS || before.length < MIN_WEIGH_INS) {
    return { type: 'wait', kcalDelta: 0, lossPerWeek: null };
  }
  const a2 = movingAverage(weights, endIso, 7);
  const a0 = movingAverage(weights, addDays(endIso, -14), 7);
  const lossPerWeek = (a0 - a2) / 2;
  const waistFlat = waistChange(waists, endIso) > -0.5;
  if (lossPerWeek > 1.2) return { type: 'eat-more', kcalDelta: 150, lossPerWeek };
  if (lossPerWeek / a2 < 0.005 && waistFlat) return { type: 'cut-more', kcalDelta: -150, lossPerWeek };
  return { type: 'on-track', kcalDelta: 0, lossPerWeek };
}
