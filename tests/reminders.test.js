import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gcalLink, reminderEvents, toICS } from '../js/engine/reminders.js';

const SESSIONS = { pushA: 'Push A', pullA: 'Pull A', legsA: 'Legs A', pushB: 'Push B', pullB: 'Pull B', legsB: 'Legs B' };
const MEAL_TIMES = { breakfast: '09:00', lunch: '14:00', snack: '17:30', dinner: '21:30', night: '23:30' };

test('reminder events cover meals, workouts, steps and the weekly check', () => {
  const ev = reminderEvents({ startIso: '2026-11-11', endIso: '2027-02-02', mealTimes: MEAL_TIMES, sessionNames: SESSIONS });
  const ids = ev.map((e) => e.id);
  for (const k of Object.keys(MEAL_TIMES)) assert.ok(ids.includes(`meal-${k}`), k);
  for (const k of Object.keys(SESSIONS)) assert.ok(ids.includes(`workout-${k}`), k);
  assert.ok(ids.includes('steps'));
  assert.ok(ids.includes('weekly-check'));
  const pushA = ev.find((e) => e.id === 'workout-pushA');
  assert.equal(pushA.startIso, '2026-11-14'); // first Saturday on/after start
  assert.match(pushA.rrule, /^RRULE:FREQ=WEEKLY;BYDAY=SA;UNTIL=20270202T235959Z$/);
  const breakfast = ev.find((e) => e.id === 'meal-breakfast');
  assert.equal(breakfast.time, '09:00');
  assert.match(breakfast.rrule, /^RRULE:FREQ=DAILY;UNTIL=20270202T235959Z$/);
  const check = ev.find((e) => e.id === 'weekly-check');
  assert.equal(check.startIso, '2026-11-13'); // Friday
});

test('google calendar link format', () => {
  const url = gcalLink({ title: 'الفطار', details: 'x', startIso: '2026-11-11', time: '09:00', durationMin: 15, rrule: 'RRULE:FREQ=DAILY;UNTIL=20270202T235959Z' });
  assert.ok(url.startsWith('https://calendar.google.com/calendar/render?'));
  const q = new URL(url).searchParams;
  assert.equal(q.get('action'), 'TEMPLATE');
  assert.equal(q.get('text'), 'الفطار');
  assert.equal(q.get('dates'), '20261111T090000/20261111T091500');
  assert.equal(q.get('ctz'), 'Africa/Cairo');
  assert.equal(q.get('recur'), 'RRULE:FREQ=DAILY;UNTIL=20270202T235959Z');
  assert.ok(url.includes('ctz=Africa%2FCairo'));
});

test('duration crossing midnight', () => {
  const url = gcalLink({ title: 't', details: '', startIso: '2026-11-11', time: '23:50', durationMin: 15, rrule: '' });
  const q = new URL(url).searchParams;
  assert.equal(q.get('dates'), '20261111T235000/20261112T000500');
  assert.equal(q.get('recur'), null);
});

test('ICS output', () => {
  const ev = reminderEvents({ startIso: '2026-11-11', endIso: '2027-02-02', mealTimes: MEAL_TIMES, sessionNames: SESSIONS });
  const ics = toICS(ev, new Date(Date.UTC(2026, 10, 11, 10, 0, 0)));
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n'));
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, ev.length);
  assert.ok(ics.includes('DTSTART;TZID=Africa/Cairo:20261111T090000'));
  assert.ok(ics.includes('RRULE:FREQ=DAILY;UNTIL=20270202T235959Z'));
  assert.ok(ics.includes('DTSTAMP:20261111T100000Z'));
  assert.ok(ics.includes('BEGIN:VALARM'));
  assert.ok(!/[^\r]\n/.test(ics), 'all line breaks are CRLF');
});
