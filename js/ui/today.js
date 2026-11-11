// "Today": program status, targets, today's workout, meals check-off, steps, weight.
import { esc, n0, n1, bar, num } from './dom.js';
import { stats, menuFor, eatenTotals, adviceFor, programEnd } from '../model.js';
import { MEAL_NAMES } from '../data/menus.js';
import { FOODS } from '../data/foods.js';
import { SESSIONS } from '../data/exercises.js';
import { PHASE_AR, stepsTarget } from '../engine/program.js';
import { formatAmount } from '../engine/menu.js';
import { todayISO, dayNameAr, formatShort, diffDays } from '../engine/dates.js';
import { dayLog, upsertByDate } from '../store.js';

export function statusLine(st, profile) {
  const w = st.plan.weekNumber;
  if (w < 1) return `البرنامج هيبدأ يوم ${formatShort(profile.startDate)}`;
  if (w > profile.totalWeeks) return 'خلّصت البرنامج 🎉 ابدأ مرحلة جديدة من الإعدادات';
  return `الأسبوع ${w} من ${profile.totalWeeks} · ${PHASE_AR[st.plan.week.phase]}`;
}

export function adviceCard(a, applied) {
  if (!a) return '';
  const msgs = {
    wait: a.lossPerWeek == null
      ? 'أول أسبوعين بنسيب الجسم يستقر. سجّل وزنك كل يوم الصبح، ومن الأسبوع 3 هقولك لو محتاجين نعدّل.'
      : '',
    'on-track': `ماشي صح 👌 بتنزل حوالي ${n1(a.lossPerWeek ?? 0)} كجم في الأسبوع. كمّل زي ما انت.`,
    'cut-more': 'النزول أبطأ من 0.5% في الأسبوع لمدة أسبوعين، والوسط ثابت. الاقتراح: قلّل 150 سعر من الكارب، أو زوّد 2,000 خطوة في اليوم.',
    'eat-more': `بتنزل ${n1(a.lossPerWeek)} كجم في الأسبوع، وده أسرع من اللازم. الاقتراح: زوّد 150 سعر عشان تحافظ على العضل.`,
  };
  const msg = msgs[a.type];
  if (!msg) return '';
  const btn = a.kcalDelta && !applied
    ? `<button class="btn small" data-act="apply-advice" data-delta="${a.kcalDelta}">طبّق (${a.kcalDelta > 0 ? '+' : ''}${a.kcalDelta} سعر)</button>`
    : '';
  return `<section class="card advice ${a.type}"><p>${msg}</p>${btn}</section>`;
}

export function render(ctx) {
  const s = ctx.state;
  const iso = todayISO();
  const st = stats(s, iso);
  const day = menuFor(s, iso, st);
  const eaten = eatenTotals(s, iso, day);
  const log = s.days[iso] ?? { eaten: [], extras: [] };
  const t = st.targets;
  const end = programEnd(s.profile);
  const left = diffDays(iso, end);
  const session = SESSIONS[st.plan.sessionKey];
  const week = st.plan.week;
  const steps = stepsTarget(Math.max(1, st.plan.weekNumber));
  const todayWeight = s.weights.find((w) => w.date === iso);
  const advice = st.plan.inProgram ? adviceFor(s, iso, st) : null;

  const meals = day.meals.map((m, i) => {
    const done = log.eaten?.includes(i);
    const time = s.settings.mealTimes[m.key];
    const items = m.items.map((it) => `${FOODS[it.food].name.split(' (')[0]} ${formatAmount(it.food, it.g)}`).join('، ');
    return `
      <li class="meal-row ${done ? 'done' : ''}">
        <button class="check" data-act="toggle-meal" data-i="${i}" aria-label="أكلت الوجبة دي">${done ? '✓' : ''}</button>
        <div class="grow">
          <div class="row-title">${time ? `<span class="time">${esc(time)}</span>` : ''}${esc(MEAL_NAMES[m.key])}</div>
          <div class="muted small">${esc(items)}</div>
        </div>
        <div class="kc">${n0(m.totals.kcal)}<small> سعر</small><br>${n0(m.totals.p)}<small> جم بروتين</small></div>
      </li>`;
  }).join('');

  return `
    <section class="card hero">
      <div class="kicker">${dayNameAr(iso)} ${formatShort(iso)}</div>
      <h1>${esc(statusLine(st, s.profile))}</h1>
      ${st.plan.inProgram ? `<p class="muted">فاضل ${left} يوم على نهاية البرنامج${st.mode === 'maintenance' ? ' · الأسبوع ده أكل صيانة' : ''}${st.goalReached ? ' · وصلت للنسبة المستهدفة 🎯' : ''}</p>` : ''}
    </section>

    ${adviceCard(advice, s.adviceAppliedOn && diffDays(s.adviceAppliedOn, iso) < 14)}

    <section class="card">
      <h2>أكل النهارده</h2>
      <div class="macro"><span>السعرات</span><b>${n0(eaten.kcal)} / ${n0(t.kcal)}</b></div>${bar(eaten.kcal, t.kcal)}
      <div class="macro"><span>البروتين</span><b>${n0(eaten.p)} / ${n0(t.protein)} جم</b></div>${bar(eaten.p, t.protein, 'protein')}
      <div class="macro-mini muted small">كارب ${n0(eaten.c)} / ${n0(t.carbs)} جم · دهون ${n0(eaten.f)} / ${n0(t.fat)} جم</div>
      <ul class="meals">${meals}</ul>
      ${(log.extras ?? []).length ? `<p class="muted small">+ ${log.extras.length} أكلة برا الجدول (من تاب الأكل)</p>` : ''}
      <button class="btn ghost block" data-act="tab" data-tab="meals">تفاصيل الأكل والبدايل</button>
    </section>

    <section class="card">
      <h2>تمرين النهارده</h2>
      ${session ? `
        <div class="session-title">${esc(session.ar)}</div>
        ${week ? `<p class="muted">${week.sets} مجموعات لكل تمرين · RIR ${week.rir} (العزل ${week.isoRir})${week.loadNote ? ` · قلّل الأوزان ${week.loadNote}` : ''}${week.extraSetFirst ? ' · مجموعة زيادة على أول تمرين' : ''}</p>` : ''}
        <button class="btn primary block" data-act="tab" data-tab="workout" data-date="${iso}">افتح التمرين والفيديوهات</button>`
      : `<div class="session-title">راحة 😌</div><p class="muted">مشي 45–60 دقيقة على راحتك، ونام كويس.</p>`}
    </section>

    <section class="card">
      <h2>الخطوات</h2>
      <p class="muted">هدف الأسبوع ده: <b>${steps.min === steps.max ? n0(steps.min) : `${n0(steps.min)}–${n0(steps.max)}`}</b> خطوة${st.plan.weekNumber >= 3 && session && ['pushA', 'pullA', 'pushB', 'pullB'].includes(st.plan.sessionKey) ? ' · ممكن 15–20 دقيقة مشي على مشاية مايلة بعد التمرين' : ''}</p>
      <label class="field inline"><span>خطوات النهارده</span>
        <input type="number" inputmode="numeric" min="0" step="100" data-change="steps" value="${esc(log.steps ?? '')}" placeholder="من الموبايل"></label>
      ${log.steps ? bar(log.steps, steps.min, 'steps') : ''}
    </section>

    <section class="card">
      <h2>الوزن</h2>
      <label class="field inline"><span>وزن النهارده الصبح</span>
        <input type="number" inputmode="decimal" step="0.1" min="30" max="300" data-change="weight" value="${esc(todayWeight?.kg ?? '')}" placeholder="كجم"></label>
      <p class="muted small">${st.avg ? `متوسط آخر 7 أيام: <b>${n1(st.avg)}</b> كجم · ` : ''}نسبة الدهون التقديرية: <b>${n1(st.bodyFat.bf)}%</b></p>
    </section>`;
}

export const actions = {
  'toggle-meal': (el, ctx) => {
    const i = Number(el.dataset.i);
    const log = dayLog(ctx.state, todayISO());
    log.eaten = log.eaten.includes(i) ? log.eaten.filter((x) => x !== i) : [...log.eaten, i];
    ctx.save();
  },
  steps: (el, ctx) => {
    const v = num(el.value);
    dayLog(ctx.state, todayISO()).steps = v == null ? null : Math.round(v);
    ctx.save();
  },
  weight: (el, ctx) => {
    const v = num(el.value);
    if (v == null || v < 30 || v > 300) { ctx.toast('اكتب الوزن بالكيلو'); return false; }
    ctx.state.weights = upsertByDate(ctx.state.weights, { date: todayISO(), kg: v });
    ctx.save();
    ctx.toast('اتسجل ✓');
  },
  'apply-advice': (el, ctx) => {
    ctx.state.kcalOffset = (ctx.state.kcalOffset ?? 0) + Number(el.dataset.delta);
    ctx.state.adviceAppliedOn = todayISO(); // one change per 2 weeks, then let the trend settle
    ctx.save();
    ctx.toast('السعرات اتعدلت ✓');
  },
};
