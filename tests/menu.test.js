import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FOODS } from '../js/data/foods.js';
import { MENUS } from '../js/data/menus.js';
import {
  totals, scaleDay, equivalentGrams, swapCandidates, applySwaps, dayIntake, formatAmount,
} from '../js/engine/menu.js';

test('every food has sane numbers and every menu item exists', () => {
  for (const [id, f] of Object.entries(FOODS)) {
    assert.ok(f.name, `${id} name`);
    const fromMacros = f.p * 4 + f.c * 4 + f.f * 9;
    // Atwater check: within 15% or 25 kcal (fibre/alcohol rounding in sources)
    assert.ok(Math.abs(fromMacros - f.kcal) <= Math.max(25, 0.15 * f.kcal), `${id}: ${f.kcal} vs ${fromMacros.toFixed(0)}`);
  }
  assert.equal(MENUS.length, 7);
  for (const day of MENUS) {
    for (const meal of day.meals) {
      for (const [food, g, role] of meal.items) {
        assert.ok(FOODS[food], `${day.name}: unknown food ${food}`);
        assert.ok(g > 0);
        assert.ok(['protein', 'carb', 'fixed'].includes(role), `${food} role ${role}`);
      }
    }
  }
});

test('totals', () => {
  const t = totals([{ food: 'chicken_breast', g: 200 }, { food: 'rice', g: 100 }]);
  assert.equal(Math.round(t.kcal), 302 + 156);
  assert.equal(Math.round(t.p * 10) / 10, 61 + 2.8);
});

for (const target of [
  { kcal: 1800, protein: 150 },
  { kcal: 2200, protein: 185 },
  { kcal: 2700, protein: 185 },
  { kcal: 2800, protein: 210 },
]) {
  test(`every day scales to ${target.kcal} kcal / ${target.protein} g`, () => {
    MENUS.forEach((tpl, i) => {
      const day = scaleDay(tpl, target);
      assert.ok(Math.abs(day.totals.kcal - target.kcal) <= 75, `day ${i} kcal ${day.totals.kcal.toFixed(0)}`);
      assert.ok(Math.abs(day.totals.p - target.protein) <= 8, `day ${i} protein ${day.totals.p.toFixed(1)}`);
      for (const meal of day.meals) for (const it of meal.items) assert.ok(it.g > 0, `${it.food} grams`);
      // fixed items keep their template grams (e.g. 60 g milk in tea is not rounded to a cup)
      tpl.meals.forEach((m, mi) => m.items.forEach(([food, g, role], ii) => {
        if (role === 'fixed') assert.equal(day.meals[mi].items[ii].g, g, `${food} fixed grams`);
      }));
    });
  });
}

test('equivalent swaps keep the key macro', () => {
  const g = equivalentGrams('chicken_breast', 200, 'tilapia');
  assert.ok(Math.abs((g * FOODS.tilapia.p) / 100 - 61) <= 1.5);
  // unit foods snap to whole units (whole cans of tuna)
  assert.equal(equivalentGrams('chicken_breast', 200, 'tuna_water') % 85, 0);
  const r = equivalentGrams('rice', 150, 'potato');
  assert.ok(Math.abs((r * FOODS.potato.c) / 100 - 51.6) <= 1.5);
  assert.ok(swapCandidates('chicken_breast').includes('tilapia'));
  assert.ok(!swapCandidates('chicken_breast').includes('rice'));
  assert.ok(!swapCandidates('chicken_breast').includes('chicken_breast'));
});

test('applySwaps replaces the item and recomputes totals', () => {
  const day = scaleDay(MENUS[6], { kcal: 2200, protein: 185 });
  const lunchIdx = day.meals.findIndex((m) => m.key === 'lunch');
  const itemIdx = day.meals[lunchIdx].items.findIndex((it) => it.role === 'protein');
  const swapped = applySwaps(day, { [`${lunchIdx}:${itemIdx}`]: 'tilapia' });
  assert.equal(swapped.meals[lunchIdx].items[itemIdx].food, 'tilapia');
  assert.ok(Math.abs(swapped.totals.p - day.totals.p) <= 1.5);
  assert.equal(day.meals[lunchIdx].items[itemIdx].food !== 'tilapia', true); // original untouched
});

test('day intake from the log', () => {
  const day = scaleDay(MENUS[6], { kcal: 2200, protein: 185 });
  assert.equal(dayIntake(undefined, day), null);
  assert.equal(dayIntake({ eaten: [], extras: [] }, day), null);
  const k = dayIntake({ eaten: [0], extras: [{ food: 'koshary', g: 250 }] }, day);
  assert.equal(Math.round(k), Math.round(day.meals[0].totals.kcal + 163 * 2.5));
});

test('amount formatting', () => {
  assert.equal(formatAmount('baladi', 90), 'رغيف');
  assert.equal(formatAmount('baladi', 45), '½ رغيف');
  assert.equal(formatAmount('baladi', 135), '1½ رغيف');
  assert.equal(formatAmount('egg', 100), '2 بيضة');
  assert.equal(formatAmount('rice', 120), '120 جم');
});
