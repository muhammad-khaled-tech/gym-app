// "Workout": the day's session with phase-aware sets/RIR, videos, cues, and set logging.
import { esc, num, videoBlock, iframeFor } from './dom.js';
import { weekChips } from './weekchips.js';
import { stats, lastSets, progressionHint } from '../model.js';
import { SESSIONS, EXERCISES } from '../data/exercises.js';
import { PHASE_AR, stepsTarget } from '../engine/program.js';
import { formatShort } from '../engine/dates.js';

function exerciseCard(ctx, entry, idx, week) {
  const s = ctx.state;
  const baseKey = entry.key;
  const key = s.exPrefs[baseKey] ?? baseKey;
  const ex = EXERCISES[key];
  const base = EXERCISES[baseKey];
  const sets = (week?.sets ?? 3) + (week?.extraSetFirst && idx === 0 ? 1 : 0);
  const rir = ex.iso ? week?.isoRir ?? '1' : week?.rir ?? '2';
  const logged = s.workouts[ctx.iso]?.[key] ?? [];
  const last = lastSets(s, key, ctx.iso);
  const hint = progressionHint(last, entry.reps, ex.lower);
  const options = [baseKey, ...base.alt];
  const rows = Array.from({ length: sets }, (_, i) => {
    const v = logged[i] ?? {};
    const prev = last?.sets[i];
    return `
      <div class="set-row">
        <span class="set-no">${i + 1}</span>
        <input type="number" inputmode="decimal" step="0.5" min="0" placeholder="${prev?.w ?? 'كجم'}" value="${esc(v.w ?? '')}"
          data-change="set" data-ex="${key}" data-i="${i}" data-f="w" aria-label="الوزن">
        <span class="x">×</span>
        <input type="number" inputmode="numeric" step="1" min="0" placeholder="${prev?.r ?? 'عدات'}" value="${esc(v.r ?? '')}"
          data-change="set" data-ex="${key}" data-i="${i}" data-f="r" aria-label="العدات">
      </div>`;
  }).join('');
  const playing = ctx.ui.playing?.[key];
  return `
    <section class="card exercise">
      <div class="ex-head">
        <span class="ex-no">${idx + 1}</span>
        <div class="grow">
          <h3>${esc(ex.ar)}</h3>
          <div class="muted small" dir="ltr">${esc(ex.name)}</div>
        </div>
      </div>
      <div class="ex-meta">
        <span><b>${sets}</b> مجموعات</span><span><b>${esc(entry.reps)}</b> عدة</span><span>RIR <b>${esc(rir)}</b></span><span>راحة ${esc(ex.rest)}</span>
      </div>
      ${options.length > 1 ? `<div class="alt-row">${options.map((k) => `<button class="chip small ${k === key ? 'active' : ''}" data-act="use-alt" data-base="${baseKey}" data-key="${k}">${esc(EXERCISES[k].ar)}</button>`).join('')}</div>` : ''}
      <div class="video-slot" id="v-${key}">${playing ? iframeFor(playing) : videoBlock(ex.video, ex.backup, ex.name)}</div>
      <details><summary>إزاي تعمله صح</summary><ul class="cues">${ex.cues.map((c) => `<li>${esc(c)}</li>`).join('')}</ul></details>
      ${last ? `<p class="muted small">آخر مرة (${formatShort(last.date)}): ${last.sets.filter((x) => x.w || x.r).map((x) => `${x.w ?? '–'}×${x.r ?? '–'}`).join('، ')}${hint ? ` · <b class="good">زوّد ${hint}</b>` : ''}</p>` : ''}
      <div class="sets">${rows}</div>
    </section>`;
}

export function render(ctx) {
  const s = ctx.state;
  const st = stats(s, ctx.iso);
  const session = SESSIONS[st.plan.sessionKey];
  const week = st.plan.week;
  const steps = stepsTarget(Math.max(1, st.plan.weekNumber));
  const phase = week
    ? `<p><b>الأسبوع ${st.plan.weekNumber}</b> · ${PHASE_AR[week.phase]}</p>
       <p class="muted small">${week.sets} مجموعات لكل تمرين · RIR ${week.rir} في التمارين الكبيرة و${week.isoRir} في العزل.
       ${week.phase === 'ramp' ? 'خليك محافظ: الهدف إن المفاصل تتعود.' : ''}
       ${week.phase === 'deload' ? 'أسبوع خفيف: قلّل الأوزان 10% وكُل على قد حرقك.' : ''}
       ${week.extraSetFirst ? 'زوّد مجموعة على أول تمرين.' : ''}
       ${week.phase === 'test' ? 'أسبوع القياس: قيس كل حاجة وصوّر.' : ''}</p>
       <p class="muted small">RIR يعني عدد العدات اللي كنت تقدر تعملها زيادة لما وقفت. لما كل المجموعات توصل لأعلى رقم في العدات، زوّد الوزن.</p>`
    : '<p class="muted">التاريخ ده برا مدة البرنامج.</p>';
  if (!session) {
    return `${weekChips(ctx.iso)}
      <section class="card"><h2>يوم راحة 😌</h2>${phase}
        <p>مشي 45–60 دقيقة على راحتك. هدف الخطوات: ${steps.min === steps.max ? steps.min : `${steps.min}–${steps.max}`}.</p></section>`;
  }
  const cardio = st.plan.weekNumber >= 3 && ['pushA', 'pullA', 'pushB', 'pullB'].includes(st.plan.sessionKey)
    ? '<section class="card"><h3>كارديو بعد التمرين (اختياري)</h3><p class="muted">15–20 دقيقة مشي على مشاية مايلة: ميل 8–12% وسرعة 4.5–5.5 كم/س. بلاش جري.</p></section>'
    : '';
  return `
    ${weekChips(ctx.iso)}
    <section class="card hero">
      <div class="kicker">${esc(session.name)}</div>
      <h1>${esc(session.ar)}</h1>
      ${phase}
      <p class="muted small">التسخين: 5 دقايق بسكلتة أو مشي، وبعدها 2–3 مجموعات خفيفة متدرجة لأول تمرين.</p>
    </section>
    ${session.exercises.map((e, i) => exerciseCard(ctx, e, i, week)).join('')}
    ${cardio}`;
}

export const actions = {
  play: (el, ctx) => {
    const slot = el.closest('.video-slot');
    if (!slot) return false;
    const key = slot.id.slice(2);
    ctx.ui.playing = { ...(ctx.ui.playing ?? {}), [key]: el.dataset.id };
    slot.innerHTML = iframeFor(el.dataset.id);
    return false;
  },
  'use-alt': (el, ctx) => {
    const { base, key } = el.dataset;
    if (key === base) delete ctx.state.exPrefs[base];
    else ctx.state.exPrefs[base] = key;
    ctx.save();
  },
  set: (el, ctx) => {
    const { ex, i, f } = el.dataset;
    const s = ctx.state;
    s.workouts[ctx.iso] ??= {};
    const list = (s.workouts[ctx.iso][ex] ??= []);
    while (list.length <= Number(i)) list.push({});
    const v = num(el.value);
    if (v == null) delete list[Number(i)][f];
    else list[Number(i)][f] = v;
    ctx.save();
    return false; // keep videos playing; no re-render needed
  },
};
