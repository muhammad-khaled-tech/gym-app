import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultState } from '../js/store.js';
import { weekCards } from '../js/ui/meals.js';

function state() {
  const s = defaultState();
  s.profile = { age: 30, height: 175, weightKg: 95, neck: 40, waist: 105, hip: 108, arm: 36, pal: 1.375, pace: 'fast', startDate: '2026-11-14', totalWeeks: 12, targetBf: 20 };
  return s;
}

test('week view: 7 day cards, only the selected day open, nothing navigates away', () => {
  const ctx = { state: state(), iso: '2026-11-17', ui: {} };
  const html = weekCards(ctx);
  assert.equal((html.match(/class="wk-day/g) || []).length, 7);
  assert.equal((html.match(/class="wk-day open/g) || []).length, 1);
  assert.ok(/class="wk-day open[^"]*" data-date="2026-11-17"/.test(html));
  assert.ok(!html.includes('data-tab='), 'no tab switching from the week view');
  assert.ok(!html.includes('meals-open-day'));
  assert.equal((html.match(/data-act="week-toggle"/g) || []).length, 7);
  assert.ok(html.includes('دفع B'), 'Tuesday shows its session tag');
});

test('week view: toggling opens and closes days in place', () => {
  const ctx = { state: state(), iso: '2026-11-17', ui: { weekOpen: { '2026-11-17': false, '2026-11-14': true, '2026-11-15': true } } };
  const html = weekCards(ctx);
  assert.equal((html.match(/class="wk-day open/g) || []).length, 2);
  assert.ok(/class="wk-day open[^"]*" data-date="2026-11-14"/.test(html));
});
