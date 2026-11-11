// Program generator: any length, same structure as the 12-week plan.
import { weekNo, weekday } from './dates.js';

/** JS weekday (0 = Sunday) -> session key. Friday is rest. */
export const SESSION_BY_WEEKDAY = {
  6: 'pushA', 0: 'pullA', 1: 'legsA', 2: 'pushB', 3: 'pullB', 4: 'legsB', 5: 'rest',
};

const PHASES = {
  ramp:   { sets: 2, rir: '3',   isoRir: '3',   extraSetFirst: false, calories: 'deficit',     loadNote: '' },
  build:  { sets: 3, rir: '2',   isoRir: '1',   extraSetFirst: false, calories: 'deficit',     loadNote: '' },
  push:   { sets: 3, rir: '1–2', isoRir: '0–1', extraSetFirst: true,  calories: 'deficit',     loadNote: '' },
  deload: { sets: 2, rir: '4',   isoRir: '4',   extraSetFirst: false, calories: 'maintenance', loadNote: '-10%' },
  test:   { sets: 3, rir: '2',   isoRir: '2',   extraSetFirst: false, calories: 'deficit',     loadNote: '' },
};

export const PHASE_AR = {
  ramp: 'رجوع وتظبيط تكنيك',
  build: 'بناء',
  push: 'ضغط',
  deload: 'Deload + أكل صيانة',
  test: 'أسبوع القياس',
};

/**
 * Weeks 1-2 ramp; then cycles of 4 training weeks + 1 deload (first cycle 'build',
 * later 'push'); the final week (when >= 3 weeks) is 'test'.
 */
export function buildProgram(totalWeeks) {
  const weeks = [];
  for (let w = 1; w <= totalWeeks; w++) {
    let phase;
    if (w <= 2) phase = 'ramp';
    else if (w === totalWeeks) phase = 'test';
    else {
      const pos = (w - 3) % 5; // 0..3 training, 4 deload
      const cycle = Math.floor((w - 3) / 5);
      phase = pos === 4 ? 'deload' : cycle === 0 ? 'build' : 'push';
    }
    weeks.push({ week: w, phase, ...PHASES[phase] });
  }
  return weeks;
}

export function stepsTarget(week) {
  if (week <= 1) return { min: 6000, max: 6000 };
  if (week === 2) return { min: 7000, max: 7000 };
  if (week <= 4) return { min: 8000, max: 8000 };
  return { min: 9000, max: 10000 };
}

export function dayPlan({ startIso, totalWeeks, iso }) {
  const weekNumber = weekNo(startIso, iso);
  const inProgram = weekNumber >= 1 && weekNumber <= totalWeeks;
  const week = inProgram ? buildProgram(totalWeeks)[weekNumber - 1] : null;
  return { weekNumber, inProgram, week, sessionKey: SESSION_BY_WEEKDAY[weekday(iso)] };
}
