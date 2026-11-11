// "Plan": month calendar of the whole program; tap a day to see its workout and meals.
import { esc, n0, n1 } from './dom.js';
import { icon } from './icons.js';
import { monthMatrix, MONTHS_AR, todayISO, fromISO, formatLong, diffDays } from '../engine/dates.js';
import { dayPlan, PHASE_AR } from '../engine/program.js';
import { formatAmount } from '../engine/menu.js';
import { SESSIONS, EXERCISES } from '../data/exercises.js';
import { MEAL_NAMES } from '../data/menus.js';
import { FOODS } from '../data/foods.js';
import { menuFor, stats, programEnd } from '../model.js';

const SHORT = {
  pushA: 'دفع A', pushB: 'دفع B', pullA: 'سحب A', pullB: 'سحب B', legsA: 'رجل A', legsB: 'رجل B', fullBody: 'فول بادي', rest: 'راحة',
};
const typeOf = (k) => (k.startsWith('push') ? 'push' : k.startsWith('pull') ? 'pull' : k.startsWith('legs') ? 'legs' : k);
const DAY_HEAD = ['سبت', 'أحد', 'إتنين', 'تلات', 'أربع', 'خميس', 'جمعة'];

function shownPlan(p, iso, today) {
  const plan = dayPlan({ startIso: p.startDate, totalWeeks: p.totalWeeks, iso });
  // Show the program weeks, and the intro days only from today until the start.
  if (plan.inProgram || (plan.preStart && iso >= today)) return plan;
  return null;
}

function dayDone(s, iso) {
  const sets = Object.values(s.workouts[iso] ?? {}).flat().filter((x) => x.w || x.r).length;
  const meals = s.days[iso]?.eaten?.length ?? 0;
  return { sets, meals };
}

function cell(s, iso, month0, sel, today) {
  const p = s.profile;
  const plan = shownPlan(p, iso, today);
  const out = fromISO(iso).getMonth() !== month0;
  const cls = ['cal-day'];
  if (out) cls.push('out');
  if (iso === today) cls.push('today');
  if (iso === sel) cls.push('sel');
  if (!plan) cls.push('off');
  else {
    cls.push(`t-${typeOf(plan.sessionKey)}`);
    if (plan.week?.phase === 'deload') cls.push('deload');
    if (plan.week?.phase === 'test') cls.push('test');
  }
  const { sets, meals } = dayDone(s, iso);
  const done = sets > 0 || meals > 0;
  return `<button class="${cls.join(' ')}" data-act="cal-pick" data-date="${iso}" aria-label="${esc(formatLong(iso))}">
    <span class="dn">${fromISO(iso).getDate()}</span>
    <span class="lbl">${plan ? SHORT[plan.sessionKey] : ''}</span>
    ${done ? `<span class="done-dot">${icon('check')}</span>` : ''}
  </button>`;
}

function detail(ctx) {
  const s = ctx.state;
  const p = s.profile;
  const iso = ctx.iso;
  const today = todayISO();
  const plan = dayPlan({ startIso: p.startDate, totalWeeks: p.totalWeeks, iso });
  const st = stats(s, iso);
  const session = SESSIONS[plan.sessionKey];
  const week = plan.week;
  const status = plan.inProgram
    ? `الأسبوع ${plan.weekNumber} من ${p.totalWeeks} · ${PHASE_AR[week.phase]}`
    : plan.preStart ? `قبل البرنامج · ${PHASE_AR.intro}` : 'بعد نهاية البرنامج';

  const exList = session
    ? session.exercises.map((e, i) => {
      const key = s.exPrefs[e.key] ?? e.key;
      const sets = (week?.sets ?? 3) + (week?.extraSetFirst && i === 0 ? 1 : 0);
      return `<li><span class="grow">${esc(EXERCISES[key].ar)}</span><span class="num">${sets} × ${esc(e.reps.split(' ')[0])}</span></li>`;
    }).join('')
    : '';

  const day = menuFor(s, iso, st);
  const rows = day.meals.map((m) => `
    <tr><td class="ml">${esc(MEAL_NAMES[m.key].split(' (')[0])}${s.settings.mealTimes[m.key] ? `<small>${esc(s.settings.mealTimes[m.key])}</small>` : ''}</td>
      <td class="it">${m.items.map((it) => `${esc(FOODS[it.food].name.split(' (')[0])} <b>${esc(formatAmount(it.food, it.g))}</b>`).join('، ')}</td>
      <td class="n">${n0(m.totals.kcal)}</td><td class="n p">${n0(m.totals.p)}</td></tr>`).join('');

  const { sets, meals } = dayDone(s, iso);
  const weight = s.weights.find((w) => w.date === iso);
  const log = iso <= today && (sets || meals || weight)
    ? `<div class="note ok">${icon('check')}<span>اتسجل: ${[weight && `وزن ${n1(weight.kg)} كجم`, meals && `${meals} ${meals === 1 ? 'وجبة' : 'وجبات'}`, sets && `${sets} ${sets === 1 ? 'مجموعة' : 'مجموعات'}`].filter(Boolean).join(' · ')}</span></div>`
    : '';

  return `
    <section class="card day-detail">
      <div class="card-head"><h2>${icon('calendar')}${esc(formatLong(iso))}</h2>${iso === today ? '<span class="pill">النهارده</span>' : ''}</div>
      <span class="pill">${esc(status)}</span>
      ${st.mode === 'maintenance' && plan.inProgram ? '<p class="muted small">أسبوع أكل صيانة.</p>' : ''}
      ${log}

      <h3 class="sub-h">${icon('dumbbell')}التمرين</h3>
      ${session
        ? `<p><b>${esc(session.ar)}</b> <span class="muted small">(${esc(session.name)})</span>${week ? ` · <span class="muted small">RIR ${esc(week.rir)}${week.loadNote ? ` · الأوزان ${week.loadNote}` : ''}</span>` : ''}</p>
           <ul class="ex-list">${exList}</ul>
           <button class="btn soft block" data-act="tab" data-tab="workout" data-date="${iso}">${icon('play')}افتح التمرين والفيديوهات</button>`
        : '<p class="muted">راحة: مشي 45–60 دقيقة على راحتك.</p>'}

      <h3 class="sub-h">${icon('utensils')}الأكل · <span class="num">${n0(day.totals.kcal)}</span> سعر · <span class="num good">${n0(day.totals.p)}</span> جم بروتين</h3>
      <table class="food-table plan-meals">
        <colgroup><col class="c-ml"><col><col class="c-n"><col class="c-n"></colgroup>
        <thead><tr><th>الوجبة</th><th>الأكل</th><th>سعرات</th><th>بروتين</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <button class="btn ghost block" data-act="tab" data-tab="meals" data-date="${iso}">${icon('table')}افتح جدول الأكل والبدايل</button>
    </section>`;
}

export function render(ctx) {
  const s = ctx.state;
  const p = s.profile;
  const today = todayISO();
  const ym = ctx.ui.calMonth ?? ctx.iso.slice(0, 7);
  const [y, m] = ym.split('-').map(Number);
  const weeks = monthMatrix(y, m - 1);
  const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
  const end = programEnd(p);
  const left = diffDays(today, end);
  return `
    <section class="card cal-card">
      <div class="cal-top">
        <button class="icon-btn" data-act="cal-month" data-ym="${prev}" aria-label="الشهر اللي فات">${icon('chevronRight')}</button>
        <div class="center"><h2>${MONTHS_AR[m - 1]} ${y}</h2>
          <div class="muted small">البرنامج من ${esc(formatLong(p.startDate))} لـ ${esc(formatLong(end))}${left >= 0 ? ` · فاضل ${left} يوم` : ''}</div></div>
        <button class="icon-btn" data-act="cal-month" data-ym="${next}" aria-label="الشهر الجاي">${icon('chevronLeft')}</button>
      </div>
      <div class="cal-grid cal-head">${DAY_HEAD.map((d) => `<span>${d}</span>`).join('')}</div>
      <div class="cal-grid">${weeks.flat().map((d) => cell(s, d, m - 1, ctx.iso, today)).join('')}</div>
      <div class="cal-legend">
        <span><i class="sw t-push"></i>دفع</span><span><i class="sw t-pull"></i>سحب</span><span><i class="sw t-legs"></i>رجل</span>
        <span><i class="sw t-fullBody"></i>فول بادي</span><span><i class="sw deload"></i>أسبوع خفيف</span><span><i class="sw test"></i>قياس</span>
      </div>
      <button class="btn small ghost" data-act="cal-today">${icon('calendar')}النهارده</button>
    </section>
    ${detail(ctx)}`;
}

export const actions = {
  'cal-pick': (el, ctx) => { ctx.iso = el.dataset.date; ctx.ui.calMonth = el.dataset.date.slice(0, 7); },
  'cal-month': (el, ctx) => { ctx.ui.calMonth = el.dataset.ym; },
  'cal-today': (el, ctx) => { ctx.iso = todayISO(); ctx.ui.calMonth = ctx.iso.slice(0, 7); },
};
