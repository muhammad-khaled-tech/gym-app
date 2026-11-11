// Week navigation: a titled week header (program week + date range) with one-week arrows,
// and all 7 days (Saturday..Friday) visible at once — no hidden days, no horizontal scroll.
import { addDays, weekday, todayISO, fromISO, MONTHS_AR, weekNo } from '../engine/dates.js';
import { icon } from './icons.js';

const SHORT_DAYS = ['أحد', 'إتنين', 'تلات', 'أربع', 'خميس', 'جمعة', 'سبت']; // by JS weekday

export function weekDates(iso) {
  const back = (weekday(iso) + 1) % 7; // days since Saturday
  const sat = addDays(iso, -back);
  return Array.from({ length: 7 }, (_, i) => addDays(sat, i));
}

export function weekTitle(profile, iso) {
  const dates = weekDates(iso);
  const a = fromISO(dates[0]);
  const b = fromISO(dates[6]);
  const range = a.getMonth() === b.getMonth()
    ? `${a.getDate()}–${b.getDate()} ${MONTHS_AR[b.getMonth()]}`
    : `${a.getDate()} ${MONTHS_AR[a.getMonth()]} – ${b.getDate()} ${MONTHS_AR[b.getMonth()]}`;
  const w = weekNo(profile.startDate, iso);
  const label = w < 1 ? 'قبل البرنامج' : w > profile.totalWeeks ? 'بعد البرنامج' : `الأسبوع ${w} من ${profile.totalWeeks}`;
  return { label, range };
}

/** dayAct: the action a day button fires (default selects the day in place). */
export function weekNav(profile, selected, { dayAct = 'pick-date' } = {}) {
  const today = todayISO();
  const dates = weekDates(selected);
  const t = weekTitle(profile, selected);
  const back = dates.includes(today) ? '' : `<button class="link small" data-act="pick-date" data-date="${today}">ارجع للنهارده</button>`;
  return `
    <div class="week-nav">
      <div class="wn-top">
        <button class="icon-btn" data-act="pick-date" data-date="${addDays(selected, -7)}" aria-label="الأسبوع اللي فات">${icon('chevronRight')}</button>
        <div class="wn-title"><b>${t.label}</b><small>${t.range}</small>${back}</div>
        <button class="icon-btn" data-act="pick-date" data-date="${addDays(selected, 7)}" aria-label="الأسبوع الجاي">${icon('chevronLeft')}</button>
      </div>
      <div class="wn-days">
        ${dates.map((d) => `<button class="wd ${d === selected ? 'active' : ''}${d === today ? ' today' : ''}" data-act="${dayAct}" data-date="${d}"><span>${SHORT_DAYS[weekday(d)]}</span><b>${fromISO(d).getDate()}</b></button>`).join('')}
      </div>
    </div>`;
}
