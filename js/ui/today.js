// "Today": program status, calorie ring + macros, workout CTA, day meal table, steps, weight.
import { esc, n0, n1, bar, num } from './dom.js';
import { icon } from './icons.js';
import { stats, menuFor, eatenTotals, adviceFor, programEnd } from '../model.js';
import { MEAL_NAMES } from '../data/menus.js';
import { SESSIONS } from '../data/exercises.js';
import { PHASE_AR, stepsTarget } from '../engine/program.js';
import { formatAmount, totals } from '../engine/menu.js';
import { FOODS } from '../data/foods.js';
import { todayISO, formatShort, formatLong, diffDays } from '../engine/dates.js';
import { dayLog, upsertByDate } from '../store.js';

export function statusLine(st, profile) {
  const w = st.plan.weekNumber;
  if (w < 1) return `قبل البرنامج · بيبدأ ${formatLong(profile.startDate)}`;
  if (w > profile.totalWeeks) return 'خلّصت البرنامج، ابدأ مرحلة جديدة من الإعدادات';
  return `الأسبوع ${w} من ${profile.totalWeeks} · ${PHASE_AR[st.plan.week.phase]}`;
}

export function adviceCard(a, applied) {
  if (!a) return '';
  const msgs = {
    wait: a.lossPerWeek == null
      ? ['info', '', 'أول أسبوعين بنسيب الجسم يستقر. سجّل وزنك كل يوم الصبح، ومن الأسبوع 3 هقولك لو محتاجين نعدّل.']
      : null,
    'on-track': ['check', 'ok', `ماشي صح. بتنزل حوالي ${n1(a.lossPerWeek ?? 0)} كجم في الأسبوع، كمّل زي ما انت.`],
    'cut-more': ['info', 'warn', 'النزول أبطأ من 0.5% في الأسبوع لمدة أسبوعين، والوسط ثابت. الاقتراح: قلّل 150 سعر من الكارب، أو زوّد 2,000 خطوة في اليوم.'],
    'eat-more': ['info', 'warn', `بتنزل ${n1(a.lossPerWeek)} كجم في الأسبوع، وده أسرع من اللازم. الاقتراح: زوّد 150 سعر عشان تحافظ على العضل.`],
  };
  const m = msgs[a.type];
  if (!m) return '';
  const btn = a.kcalDelta && !applied
    ? `<button class="btn small primary" data-act="apply-advice" data-delta="${a.kcalDelta}">طبّق (${a.kcalDelta > 0 ? '+' : ''}${a.kcalDelta} سعر)</button>`
    : '';
  return `<section class="card"><div class="note ${m[1]}">${icon(m[0])}<div class="grow">${m[2]}${btn ? `<div class="row">${btn}</div>` : ''}</div></div></section>`;
}

function ring(eaten, target) {
  const r = 54;
  const c = 2 * Math.PI * r;
  const pct = target > 0 ? Math.min(1, eaten / target) : 0;
  const left = Math.round(target - eaten);
  const over = left < 0;
  return `
    <div class="ring ${over ? 'over' : ''}" role="img" aria-label="${over ? 'زيادة' : 'فاضل'} ${Math.abs(left)} سعر">
      <svg viewBox="0 0 128 128"><circle class="track" cx="64" cy="64" r="${r}" fill="none" stroke-width="12"/>
        <circle class="value" cx="64" cy="64" r="${r}" fill="none" stroke-width="12" stroke-linecap="round"
          stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - pct)).toFixed(1)}"/></svg>
      <div class="ring-center"><span class="num">${n0(Math.abs(left))}</span><small>${over ? 'سعر زيادة' : 'سعر فاضل'}</small></div>
    </div>`;
}

function macroRow(label, value, target, cls) {
  return `<div class="macro-row"><div class="top"><span>${label}</span><b>${n0(value)} / ${n0(target)}</b></div>${bar(value, target, cls)}</div>`;
}

export function render(ctx) {
  const s = ctx.state;
  const iso = todayISO();
  const st = stats(s, iso);
  const day = menuFor(s, iso, st);
  const eaten = eatenTotals(s, iso, day);
  const log = s.days[iso] ?? { eaten: [], extras: [] };
  const t = st.targets;
  const left = diffDays(iso, programEnd(s.profile));
  const session = SESSIONS[st.plan.sessionKey];
  const week = st.plan.week;
  const steps = stepsTarget(Math.max(1, st.plan.weekNumber));
  const todayWeight = s.weights.find((w) => w.date === iso);
  const advice = st.plan.inProgram ? adviceFor(s, iso, st) : null;
  const applied = s.adviceAppliedOn && diffDays(s.adviceAppliedOn, iso) < 14;

  const rows = day.meals.map((m, i) => {
    const done = log.eaten?.includes(i);
    const time = s.settings.mealTimes[m.key];
    const items = m.items.map((it) => {
      const t = totals([it]);
      return `<tr class="${done ? 'done' : ''}"><td>${esc(FOODS[it.food].name.split(' (')[0])}</td><td class="amt">${esc(formatAmount(it.food, it.g))}</td>
        <td class="n">${n0(t.kcal)}</td><td class="n p">${n0(t.p)}</td></tr>`;
    }).join('');
    return `
      <tbody class="grp ${done ? 'done' : ''}">
        <tr class="grp-head"><td colspan="4"><div class="grp-row">
          ${time ? `<span class="time">${esc(time)}</span>` : ''}<b class="grow">${esc(MEAL_NAMES[m.key].split(' (')[0])}</b>
          <span class="grp-k"><span class="num">${n0(m.totals.kcal)}</span> سعر · <span class="num good">${n0(m.totals.p)}</span> جم</span>
          <button class="check" data-act="toggle-meal" data-i="${i}" aria-label="أكلت ${esc(MEAL_NAMES[m.key])}">${icon('check')}</button>
        </div></td></tr>
        ${items}
      </tbody>`;
  }).join('');
  const dt = day.totals;
  const meals = `
    <table class="food-table today-table">
      <colgroup><col class="c-name"><col class="c-amt"><col><col></colgroup>
      <thead><tr><th>الصنف</th><th>الكمية</th><th>سعرات</th><th>بروتين</th></tr></thead>
      ${rows}
      <tfoot><tr><td colspan="2">مجموع اليوم</td><td class="n">${n0(dt.kcal)}</td><td class="n p">${n0(dt.p)}</td></tr></tfoot>
    </table>`;

  const workout = session
    ? `<button class="workout-cta" data-act="tab" data-tab="workout" data-date="${iso}">
        <div class="grow"><div class="kicker">تمرين النهارده · ${esc(session.name)}</div><h2>${esc(session.ar)}</h2>
        ${week ? `<div class="meta">${week.sets} مجموعات · RIR ${week.rir}${week.loadNote ? ` · قلّل الأوزان ${week.loadNote}` : ''}${week.extraSetFirst ? ' · مجموعة زيادة على أول تمرين' : ''}</div>` : ''}</div>
        <span class="play-btn">${icon('play')}</span></button>`
    : `<div class="workout-cta rest"><div class="grow"><div class="kicker muted">النهارده</div><h2>يوم راحة</h2><div class="meta muted">مشي 45–60 دقيقة على راحتك، ونام كويس.</div></div><span class="play-btn">${icon('moon')}</span></div>`;

  return `
    <section class="card">
      <span class="pill">${icon('calendar')}${esc(statusLine(st, s.profile))}</span>
      ${st.plan.preStart ? `<p class="muted small" style="margin-top:8px">النهارده ${st.plan.sessionKey === 'rest' ? 'راحة' : 'فول بادي تمهيدي'}، والأكل ماشي على الخطة من دلوقتي.</p>` : ''}
      ${st.plan.inProgram ? `<p class="muted small" style="margin-top:8px">فاضل ${left} يوم${st.mode === 'maintenance' ? ' · الأسبوع ده أكل صيانة' : ''}${st.goalReached ? ' · وصلت للنسبة المستهدفة' : ''}</p>` : ''}
      <div class="hero-grid">
        ${ring(eaten.kcal, t.kcal)}
        <div class="macros">
          ${macroRow('بروتين (جم)', eaten.p, t.protein, 'protein')}
          ${macroRow('كارب (جم)', eaten.c, t.carbs, 'carbs')}
          ${macroRow('دهون (جم)', eaten.f, t.fat, 'fat')}
        </div>
      </div>
    </section>

    <div class="tiles">
      <div class="tile">${icon('activity')}<span class="num">${log.steps ? n0(log.steps) : '—'}</span><small>خطوة من ${n0(steps.min)}</small></div>
      <div class="tile">${icon('scale')}<span class="num">${st.avg ? n1(st.avg) : n1(st.weightKg)}</span><small>كجم (متوسط)</small></div>
      <div class="tile">${icon('percent')}<span class="num">${n1(st.bodyFat.bf)}</span><small>% دهون</small></div>
    </div>

    ${workout}
    ${adviceCard(advice, applied)}

    <section class="card">
      <div class="card-head"><h2>${icon('utensils')}أكل النهارده</h2><button class="btn small soft" data-act="tab" data-tab="meals">${icon('swap')}بدّل</button></div>
      ${meals}
      ${(log.extras ?? []).length ? `<p class="muted small">+ ${log.extras.length} أكلة برا الجدول</p>` : ''}
    </section>

    <section class="card">
      <div class="card-head"><h2>${icon('activity')}سجّل النهارده</h2></div>
      <label class="field inline"><span>الخطوات</span>
        <input type="number" inputmode="numeric" min="0" step="100" data-change="steps" value="${esc(log.steps ?? '')}" placeholder="0"></label>
      ${bar(log.steps ?? 0, steps.min)}
      <label class="field inline"><span>الوزن الصبح (كجم)</span>
        <input type="number" inputmode="decimal" step="0.1" min="30" max="300" data-change="weight" value="${esc(todayWeight?.kg ?? '')}" placeholder="0.0"></label>
      <p class="muted small">هدف الخطوات الأسبوع ده: ${steps.min === steps.max ? n0(steps.min) : `${n0(steps.min)}–${n0(steps.max)}`}${st.plan.weekNumber >= 3 && ['pushA', 'pullA', 'pushB', 'pullB'].includes(st.plan.sessionKey) ? '. وممكن 15–20 دقيقة مشي على مشاية مايلة بعد التمرين.' : '.'}</p>
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
    ctx.toast('اتسجل');
  },
  'apply-advice': (el, ctx) => {
    ctx.state.kcalOffset = (ctx.state.kcalOffset ?? 0) + Number(el.dataset.delta);
    ctx.state.adviceAppliedOn = todayISO(); // one change per 2 weeks, then let the trend settle
    ctx.save();
    ctx.toast('السعرات اتعدلت');
  },
};
