// Sat..Fri date chips for the week that contains the selected date.
import { addDays, weekday, dayNameAr, formatShort, todayISO } from '../engine/dates.js';

export function weekDates(iso) {
  const back = (weekday(iso) + 1) % 7; // days since Saturday
  const sat = addDays(iso, -back);
  return Array.from({ length: 7 }, (_, i) => addDays(sat, i));
}

export function weekChips(selected) {
  const today = todayISO();
  const dates = weekDates(selected);
  return `
    <div class="chips-nav">
      <button class="chip arrow" data-act="pick-date" data-date="${addDays(dates[0], -7)}" aria-label="الأسبوع اللي فات">›</button>
      <div class="chips">
        ${dates.map((d) => `<button class="chip ${d === selected ? 'active' : ''} ${d === today ? 'today' : ''}" data-act="pick-date" data-date="${d}">
          <span>${dayNameAr(d)}</span><small>${formatShort(d)}</small></button>`).join('')}
      </div>
      <button class="chip arrow" data-act="pick-date" data-date="${addDays(dates[6], 1)}" aria-label="الأسبوع الجاي">‹</button>
    </div>`;
}
