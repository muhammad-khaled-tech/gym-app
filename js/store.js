// App state in localStorage (one JSON object). Never throws: storage failures are reported.

const KEY = 'gymapp.v1';
export const SCHEMA = 3; // 2: default pace 'fast' (25% deficit). 3: start moved to Saturday 14/11.

export const DEFAULT_MEAL_TIMES = {
  breakfast: '09:00', lunch: '14:00', snack: '17:30', dinner: '21:30', night: '23:30',
};

export function defaultState() {
  return {
    schema: SCHEMA,
    profile: null, // {age, height, weightKg, neck, waist, hip, arm, pal, pace, startDate, totalWeeks, targetBf}
    settings: { mealTimes: { ...DEFAULT_MEAL_TIMES } },
    weights: [], // [{date, kg}]
    measurements: [], // [{date, waist, neck, hip, arm}]
    days: {}, // {iso: {eaten: [mealIdx], swaps: {}, extras: [{food, g}], steps}}
    workouts: {}, // {iso: {exKey: [{w, r}]}}
    exPrefs: {}, // {exKey: altKey}
    kcalOffset: 0,
    tdeeOverride: null,
    adviceAppliedOn: null,
  };
}

function migrate(s) {
  const base = defaultState();
  const out = { ...base, ...s, settings: { ...base.settings, ...(s.settings ?? {}) } };
  out.settings.mealTimes = { ...DEFAULT_MEAL_TIMES, ...(out.settings.mealTimes ?? {}) };
  // schema 1 -> 2: the user asked for the 25% deficit by default (2026-11-11).
  if ((s.schema ?? 1) < 2 && out.profile) out.profile = { ...out.profile, pace: 'fast' };
  // schema 2 -> 3: the user chose to start on Saturday 2026-11-14 (Wed/Thu before it are intro full body).
  const sd = out.profile?.startDate;
  if ((s.schema ?? 1) < 3 && sd && sd >= '2026-11-09' && sd <= '2026-11-13') out.profile = { ...out.profile, startDate: '2026-11-14' };
  out.schema = SCHEMA;
  return out;
}

export function loadState() {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    if (!raw) return { state: defaultState(), error: null };
    return { state: migrate(JSON.parse(raw)), error: null };
  } catch (e) {
    return { state: defaultState(), error: e };
  }
}

export function saveState(state) {
  try {
    globalThis.localStorage.setItem(KEY, JSON.stringify(state));
    return null;
  } catch (e) {
    return e;
  }
}

export function exportJSON(state) {
  return JSON.stringify({ app: 'gym-app', exportedAt: new Date().toISOString(), state }, null, 2);
}

/** Returns a migrated state or throws Error with an Arabic message. */
export function importJSON(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('الملف ده مش JSON سليم.');
  }
  const s = parsed?.state ?? parsed;
  if (!s || typeof s !== 'object' || !('profile' in s)) throw new Error('الملف ده مش نسخة احتياطية من الأبليكيشن.');
  return migrate(s);
}

/** Insert or replace by date, keep sorted. */
export function upsertByDate(list, entry) {
  const out = list.filter((x) => x.date !== entry.date);
  out.push(entry);
  out.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}

export function dayLog(state, iso) {
  if (!state.days[iso]) state.days[iso] = { eaten: [], swaps: {}, extras: [], steps: null };
  return state.days[iso];
}
