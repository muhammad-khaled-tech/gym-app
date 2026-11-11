import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weekDates, weekTitle, weekNav } from '../js/ui/weekchips.js';

const P = { startDate: '2026-11-14', totalWeeks: 12 };

test('week dates run Saturday to Friday', () => {
  assert.deepEqual(weekDates('2026-11-11'), ['2026-11-07', '2026-11-08', '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13']);
  assert.equal(weekDates('2026-11-14')[0], '2026-11-14');
  assert.equal(weekDates('2026-11-20')[6], '2026-11-20');
});

test('week title names the program week and the date range', () => {
  assert.deepEqual(weekTitle(P, '2026-11-11'), { label: 'قبل البرنامج', range: '7–13 نوفمبر' });
  assert.deepEqual(weekTitle(P, '2026-11-17'), { label: 'الأسبوع 1 من 12', range: '14–20 نوفمبر' });
  assert.deepEqual(weekTitle(P, '2026-11-30'), { label: 'الأسبوع 3 من 12', range: '28 نوفمبر – 4 ديسمبر' });
  assert.equal(weekTitle(P, '2027-02-06').label, 'بعد البرنامج');
});

test('week nav shows all 7 days and moves by exactly one week', () => {
  const html = weekNav(P, '2026-11-17');
  assert.equal((html.match(/class="wd /g) || []).length, 7);
  assert.ok(html.includes('data-date="2026-11-10"'), 'previous week keeps the same weekday');
  assert.ok(html.includes('data-date="2026-11-24"'), 'next week keeps the same weekday');
  assert.ok(/class="wd active[^"]*" data-act="pick-date" data-date="2026-11-17"/.test(html));
  const weekView = weekNav(P, '2026-11-17', { dayAct: 'meals-open-day' });
  assert.ok(weekView.includes('data-act="meals-open-day" data-date="2026-11-14"'));
});
