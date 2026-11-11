import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EXERCISES, SESSIONS } from '../js/data/exercises.js';
import { SESSION_BY_WEEKDAY } from '../js/engine/program.js';

test('sessions reference known exercises and alternatives', () => {
  for (const key of Object.values(SESSION_BY_WEEKDAY)) {
    if (key !== 'rest') assert.ok(SESSIONS[key], `session ${key}`);
  }
  for (const [sk, s] of Object.entries(SESSIONS)) {
    assert.ok(s.exercises.length >= 6, sk);
    for (const { key, reps } of s.exercises) {
      assert.ok(EXERCISES[key], `${sk}: ${key}`);
      assert.ok(reps);
      for (const a of EXERCISES[key].alt) assert.ok(EXERCISES[a], `alt ${a}`);
    }
  }
});

test('video ids look like YouTube ids', () => {
  for (const [k, e] of Object.entries(EXERCISES)) {
    for (const v of [e.video, e.backup]) {
      if (v) assert.match(v.id, /^[A-Za-z0-9_-]{11}$/, k);
    }
  }
});
