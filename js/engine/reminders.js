// Calendar reminders: Google Calendar template links + an .ics file. Times are Africa/Cairo.
import { addDays, weekday } from './dates.js';
import { SESSION_BY_WEEKDAY } from './program.js';

export const TZ = 'Africa/Cairo';
const BYDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

const MEAL_LABELS = {
  breakfast: 'الفطار', lunch: 'الغدا', snack: 'السناك', dinner: 'العشا', night: 'كوباية اللبن قبل النوم',
};

const compactDate = (iso) => iso.replaceAll('-', '');

function stamp(iso, time, plusMin = 0) {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + plusMin;
  const day = addDays(iso, Math.floor(total / 1440));
  const mins = total % 1440;
  const hh = String(Math.floor(mins / 60)).padStart(2, '0');
  const mm = String(mins % 60).padStart(2, '0');
  return `${compactDate(day)}T${hh}${mm}00`;
}

function firstOnOrAfter(iso, wd) {
  let d = iso;
  while (weekday(d) !== wd) d = addDays(d, 1);
  return d;
}

/** Recurring events from program start to end. */
export function reminderEvents({ startIso, endIso, mealTimes, sessionNames }) {
  const until = `UNTIL=${compactDate(endIso)}T235959Z`;
  const daily = `RRULE:FREQ=DAILY;${until}`;
  const events = [];
  for (const [key, time] of Object.entries(mealTimes)) {
    if (!time) continue;
    events.push({
      id: `meal-${key}`,
      title: `🍽 ${MEAL_LABELS[key] ?? key}`,
      details: key === 'breakfast'
        ? 'افتح الأبليكيشن وشوف وجبة النهارده. وماتنساش الكرياتين 5 جرام.'
        : 'افتح الأبليكيشن وشوف وجبة النهارده وعلّم عليها لما تخلص.',
      startIso, time, durationMin: 15, rrule: daily,
    });
  }
  for (let wd = 0; wd < 7; wd++) {
    const key = SESSION_BY_WEEKDAY[wd];
    if (key === 'rest' || !sessionNames[key]) continue;
    events.push({
      id: `workout-${key}`,
      title: `🏋️ تمرين النهارده: ${sessionNames[key]}`,
      details: 'حدد معاد الجيم النهارده. السناك يبقى قبل التمرين بساعة ونص لـ 3 ساعات.',
      startIso: firstOnOrAfter(startIso, wd), time: '10:00', durationMin: 15,
      rrule: `RRULE:FREQ=WEEKLY;BYDAY=${BYDAY[wd]};${until}`,
    });
  }
  events.push({
    id: 'steps',
    title: '🚶 الخطوات والكارديو',
    details: 'وصلت لهدف الخطوات النهارده؟ لو لأ، انزل اتمشى شوية. وسجّل الرقم في الأبليكيشن.',
    startIso, time: '20:00', durationMin: 15, rrule: daily,
  });
  events.push({
    id: 'weekly-check',
    title: '📏 القياس الأسبوعي',
    details: 'الوسط عند السرة (بطن مرتخية، آخر زفير). وكل أسبوعين: الرقبة والدراع وصور.',
    startIso: firstOnOrAfter(startIso, 5), time: '09:30', durationMin: 15,
    rrule: `RRULE:FREQ=WEEKLY;BYDAY=FR;${until}`,
  });
  return events;
}

export function gcalLink({ title, details, startIso, time, durationMin, rrule }) {
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    details: details ?? '',
    dates: `${stamp(startIso, time)}/${stamp(startIso, time, durationMin)}`,
    ctz: TZ,
  });
  if (rrule) q.set('recur', rrule);
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

function utcStamp(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`;
}

export function toICS(events, now = new Date()) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//gym-app//AR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  for (const e of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.id}-${e.startIso}@gym-app`,
      `DTSTAMP:${utcStamp(now)}`,
      `DTSTART;TZID=${TZ}:${stamp(e.startIso, e.time)}`,
      `DTEND;TZID=${TZ}:${stamp(e.startIso, e.time, e.durationMin)}`,
      `SUMMARY:${esc(e.title)}`,
      `DESCRIPTION:${esc(e.details ?? '')}`,
    );
    if (e.rrule) lines.push(e.rrule);
    lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(e.title)}`, 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}
