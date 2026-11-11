// Menu math: totals, scaling a day template to targets, swaps, logged intake.
import { FOODS } from '../data/foods.js';

const ZERO = () => ({ kcal: 0, p: 0, c: 0, f: 0 });

/** items: [{food, g}] -> {kcal, p, c, f} */
export function totals(items) {
  const t = ZERO();
  for (const { food, g } of items) {
    const x = FOODS[food];
    t.kcal += (x.kcal * g) / 100;
    t.p += (x.p * g) / 100;
    t.c += (x.c * g) / 100;
    t.f += (x.f * g) / 100;
  }
  return t;
}

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

function roundGrams(food, g) {
  const unit = FOODS[food].unit;
  if (unit) return Math.max(1, Math.round(g / unit)) * unit;
  return Math.max(5, Math.round(g / 5) * 5);
}

const sum = (items, key, pred = () => true) =>
  items.filter(pred).reduce((s, it) => s + (FOODS[it.food][key] * it.g) / 100, 0);

/** Adjust the biggest gram-based item with `role` so that `key` total moves by `delta`. */
function fineTune(items, role, key, delta) {
  const candidates = items.filter((it) => it.role === role && !FOODS[it.food].unit && FOODS[it.food][key] > 0);
  if (!candidates.length) return;
  const it = candidates.reduce((a, b) => (b.g > a.g ? b : a));
  const per = FOODS[it.food][key] / 100;
  const next = Math.round((it.g + delta / per) / 5) * 5;
  it.g = Math.max(Math.round(it.base * 0.3 / 5) * 5 || 5, next);
}

function finish(meals) {
  const out = meals.map((m) => ({ ...m, totals: totals(m.items) }));
  const t = ZERO();
  for (const m of out) for (const k of Object.keys(t)) t[k] += m.totals[k];
  return { meals: out, totals: t };
}

/**
 * template: {name, note, meals:[{key, items:[[food, g, role]]}]}
 * targets: {kcal, protein}
 */
export function scaleDay(template, targets) {
  const items = [];
  const meals = template.meals.map((m) => ({
    key: m.key,
    items: m.items.map(([food, g, role]) => {
      const it = { food, g, base: g, role };
      items.push(it);
      return it;
    }),
  }));

  let fP = 1;
  let fC = 1;
  const apply = () => {
    for (const it of items) it.g = it.base * (it.role === 'protein' ? fP : it.role === 'carb' ? fC : 1);
  };
  const isP = (it) => it.role === 'protein';
  const isC = (it) => it.role === 'carb';
  const baseSum = (key, pred) => items.filter(pred).reduce((s, it) => s + (FOODS[it.food][key] * it.base) / 100, 0);

  for (let i = 0; i < 6; i++) {
    apply();
    fP = clamp((targets.protein - sum(items, 'p', (it) => !isP(it))) / baseSum('p', isP), 0.4, 2.0);
    apply();
    fC = clamp((targets.kcal - sum(items, 'kcal', (it) => !isC(it))) / baseSum('kcal', isC), 0.25, 2.5);
  }
  apply();
  for (const it of items) if (it.role !== 'fixed') it.g = roundGrams(it.food, it.g);

  for (let i = 0; i < 2; i++) {
    fineTune(items, 'protein', 'p', targets.protein - sum(items, 'p'));
    fineTune(items, 'carb', 'kcal', targets.kcal - sum(items, 'kcal'));
  }

  const clean = meals.map((m) => ({ key: m.key, items: m.items.map(({ food, g, role }) => ({ food, g, role })) }));
  return { name: template.name, note: template.note, ...finish(clean) };
}

/** Grams of `toId` equivalent to `grams` of `fromId`: protein swaps match protein, carb swaps match carbs, others kcal. */
export function equivalentGrams(fromId, grams, toId) {
  const from = FOODS[fromId];
  const to = FOODS[toId];
  const key = from.swap === 'protein' ? 'p' : from.swap === 'carb' ? 'c' : 'kcal';
  const amount = (from[key] * grams) / 100;
  if (!to[key]) return grams;
  return roundGrams(toId, (amount * 100) / to[key]);
}

export function swapCandidates(foodId) {
  const group = FOODS[foodId].swap;
  if (!group) return [];
  return Object.keys(FOODS).filter((id) => id !== foodId && FOODS[id].swap === group);
}

/** swaps: {'mealIdx:itemIdx': foodId}. Returns a new day; the input is not modified. */
export function applySwaps(day, swaps = {}) {
  const meals = day.meals.map((m, mi) => ({
    key: m.key,
    items: m.items.map((it, ii) => {
      const to = swaps[`${mi}:${ii}`];
      if (!to || !FOODS[to] || to === it.food) return { ...it };
      return { food: to, g: equivalentGrams(it.food, it.g, to), role: it.role, swappedFrom: it.food };
    }),
  }));
  return { name: day.name, note: day.note, ...finish(meals) };
}

/** kcal eaten on a day: checked meals + extras. null when nothing is logged. */
export function dayIntake(dayLog, day) {
  if (!dayLog) return null;
  const eaten = dayLog.eaten ?? [];
  const extras = dayLog.extras ?? [];
  if (!eaten.length && !extras.length) return null;
  let k = 0;
  for (const mi of eaten) if (day.meals[mi]) k += day.meals[mi].totals.kcal;
  k += totals(extras).kcal;
  return k;
}

function halves(n) {
  const whole = Math.floor(n / 2);
  const half = n % 2 === 1;
  if (!whole) return '½';
  return `${whole}${half ? '½' : ''}`;
}

/** Human amount: '½ رغيف', '2 بيضة', '120 جم'. */
export function formatAmount(foodId, g) {
  const food = FOODS[foodId];
  if (food.unit && food.unitName) {
    const n = Math.round(g / food.unit);
    if (Math.abs(n * food.unit - g) < 0.01) {
      if (food.unitName === 'loaf-half') return n === 2 ? 'رغيف' : `${halves(n)} رغيف`;
      if (food.unit === 4.5 || food.unit === 5 || food.unit === 4.2) return `${n} ${food.unitName}`;
      return `${n} ${food.unitName}`;
    }
  }
  return `${Math.round(g)} جم`;
}
