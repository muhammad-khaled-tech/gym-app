// "Meals": the day's menu with swaps, extras logging, and day totals.
import { esc, n0, num } from './dom.js';
import { weekChips } from './weekchips.js';
import { stats, menuFor, eatenTotals } from '../model.js';
import { MEAL_NAMES } from '../data/menus.js';
import { FOODS, FOOD_GROUPS_AR } from '../data/foods.js';
import { formatAmount, swapCandidates, equivalentGrams, totals } from '../engine/menu.js';
import { dayLog } from '../store.js';

function itemRow(it, mi, ii) {
  const f = FOODS[it.food];
  const t = totals([it]);
  const canSwap = swapCandidates(it.swappedFrom ?? it.food).length > 0;
  return `
    <li class="item">
      <div class="grow">
        <div>${esc(f.name)}</div>
        <div class="muted small"><b>${esc(formatAmount(it.food, it.g))}</b>${f.unit && !/جم$/.test(formatAmount(it.food, it.g)) ? ` (${n0(it.g)} جم)` : ''} · ${n0(t.kcal)} سعر · ${n0(t.p)} جم بروتين
          ${it.swappedFrom ? `<span class="tag">بدل ${esc(FOODS[it.swappedFrom].name.split(' (')[0])}</span>` : ''}</div>
      </div>
      ${it.swappedFrom ? `<button class="btn small ghost" data-act="swap-reset" data-k="${mi}:${ii}">رجّع</button>` : ''}
      ${canSwap ? `<button class="btn small" data-act="swap-open" data-m="${mi}" data-i="${ii}">بدّل</button>` : ''}
    </li>`;
}

function swapSheet(ctx, day) {
  const sw = ctx.ui.swap;
  if (!sw) return '';
  const it = day.meals[sw.m]?.items[sw.i];
  if (!it) return '';
  const original = it.swappedFrom ?? it.food;
  const base = FOODS[original].swap;
  const key = base === 'protein' ? 'البروتين' : base === 'carb' ? 'الكارب' : 'السعرات';
  // grams of the original as scaled for this day
  const origG = it.swappedFrom ? equivalentGrams(it.food, it.g, original) : it.g;
  const rows = [original, ...swapCandidates(original)].map((id) => {
    const g = id === original ? origG : equivalentGrams(original, origG, id);
    const t = totals([{ food: id, g }]);
    return `<li><button class="pick ${id === it.food ? 'active' : ''}" data-act="swap-pick" data-food="${id}">
      <span class="grow">${esc(FOODS[id].name)}</span>
      <span class="muted small">${esc(formatAmount(id, g))} · ${n0(t.kcal)} سعر · ${n0(t.p)} جم بروتين</span></button></li>`;
  }).join('');
  return `
    <div class="sheet-backdrop" data-act="sheet-close"></div>
    <div class="sheet" role="dialog" aria-label="بدّل الصنف">
      <div class="sheet-head"><b>بدّل ${esc(FOODS[original].name.split(' (')[0])}</b><button class="btn small ghost" data-act="sheet-close">قفل</button></div>
      <p class="muted small">الكمية بتتحسب عشان ${key} يفضل زي ما هو تقريبًا (${esc(FOOD_GROUPS_AR[base] ?? '')}).</p>
      <ul class="pick-list">${rows}</ul>
    </div>`;
}

function searchResults(q) {
  const s = q.trim();
  const ids = Object.keys(FOODS).filter((id) => !s || FOODS[id].name.includes(s)).slice(0, 25);
  if (!ids.length) return '<li class="muted small">مفيش نتايج</li>';
  return ids.map((id) => `<li><button class="pick" data-act="extra-pick" data-food="${id}">
    <span class="grow">${esc(FOODS[id].name)}</span><span class="muted small">${n0(FOODS[id].kcal)} سعر لكل 100 جم</span></button></li>`).join('');
}

function extrasCard(ctx, log) {
  const pick = ctx.ui.extraFood;
  const list = (log.extras ?? []).map((e, i) => {
    const t = totals([e]);
    return `<li class="item"><div class="grow">${esc(FOODS[e.food].name)}<div class="muted small">${esc(formatAmount(e.food, e.g))} · ${n0(t.kcal)} سعر · ${n0(t.p)} جم بروتين</div></div>
      <button class="btn small ghost" data-act="extra-del" data-i="${i}">امسح</button></li>`;
  }).join('');
  const f = pick && FOODS[pick];
  return `
    <section class="card">
      <h2>أكلت حاجة برا الجدول؟</h2>
      ${list ? `<ul class="items">${list}</ul>` : ''}
      ${f ? `
        <form class="extra-form" data-submit="extra-add">
          <div><b>${esc(f.name)}</b> <span class="muted small">${n0(f.kcal)} سعر و${f.p} جم بروتين لكل 100 جم</span></div>
          <label class="field inline"><span>الكمية (جرام)</span>
            <input name="g" type="number" inputmode="decimal" min="1" max="3000" value="${f.unit ?? 100}" required></label>
          ${f.unit ? `<p class="muted small">${esc(formatAmount(pick, f.unit))} = ${f.unit} جم</p>` : ''}
          <div class="row"><button class="btn primary" type="submit">ضيف</button><button class="btn ghost" type="button" data-act="extra-cancel">إلغاء</button></div>
        </form>`
      : `
        <input class="search" type="search" placeholder="دوّر: كشري، طعمية، بسبوسة…" data-input="food-search" value="${esc(ctx.ui.search ?? '')}">
        <ul class="pick-list" id="food-results">${searchResults(ctx.ui.search ?? '')}</ul>`}
    </section>`;
}

export function render(ctx) {
  const s = ctx.state;
  const iso = ctx.iso;
  const st = stats(s, iso);
  const day = menuFor(s, iso, st);
  const log = s.days[iso] ?? { eaten: [], extras: [], swaps: {} };
  const eaten = eatenTotals(s, iso, day);
  const meals = day.meals.map((m, mi) => {
    const time = s.settings.mealTimes[m.key];
    const done = log.eaten?.includes(mi);
    return `
      <section class="card meal ${done ? 'done' : ''}">
        <div class="meal-head">
          <h3>${time ? `<span class="time">${esc(time)}</span>` : ''}${esc(MEAL_NAMES[m.key])}</h3>
          <button class="check" data-act="toggle-meal-at" data-i="${mi}" aria-label="أكلتها">${done ? '✓' : ''}</button>
        </div>
        <ul class="items">${m.items.map((it, ii) => itemRow(it, mi, ii)).join('')}</ul>
        <div class="meal-total muted small">${n0(m.totals.kcal)} سعر · ${n0(m.totals.p)} جم بروتين · ${n0(m.totals.c)} جم كارب · ${n0(m.totals.f)} جم دهون</div>
      </section>`;
  }).join('');
  return `
    ${weekChips(iso)}
    <section class="card summary">
      <div class="sum-grid">
        <div><b>${n0(day.totals.kcal)}</b><small>سعر في الخطة</small></div>
        <div><b>${n0(day.totals.p)} جم</b><small>بروتين</small></div>
        <div><b>${n0(eaten.kcal)}</b><small>اتاكل</small></div>
      </div>
      <p class="muted small">الهدف: ${n0(st.targets.kcal)} سعر · ${st.targets.protein} جم بروتين${st.mode === 'maintenance' ? ' · أسبوع صيانة' : ''}. ${esc(day.note ?? '')}</p>
      <p class="muted small">الأوزان كلها للأكل <b>بعد الطبخ</b>. الطبيخ بمعلقة سمنة أو زيت واحدة للحلة كلها.</p>
    </section>
    ${meals}
    ${extrasCard(ctx, log)}
    ${swapSheet(ctx, day)}`;
}

export const actions = {
  'toggle-meal-at': (el, ctx) => {
    const i = Number(el.dataset.i);
    const log = dayLog(ctx.state, ctx.iso);
    log.eaten = log.eaten.includes(i) ? log.eaten.filter((x) => x !== i) : [...log.eaten, i];
    ctx.save();
  },
  'swap-open': (el, ctx) => { ctx.ui.swap = { m: Number(el.dataset.m), i: Number(el.dataset.i) }; },
  'sheet-close': (el, ctx) => { ctx.ui.swap = null; },
  'swap-pick': (el, ctx) => {
    const { m, i } = ctx.ui.swap;
    const log = dayLog(ctx.state, ctx.iso);
    const day = menuFor({ ...ctx.state, days: { ...ctx.state.days, [ctx.iso]: { ...log, swaps: {} } } }, ctx.iso);
    const original = day.meals[m].items[i].food;
    if (el.dataset.food === original) delete log.swaps[`${m}:${i}`];
    else log.swaps[`${m}:${i}`] = el.dataset.food;
    ctx.ui.swap = null;
    ctx.save();
  },
  'swap-reset': (el, ctx) => {
    delete dayLog(ctx.state, ctx.iso).swaps[el.dataset.k];
    ctx.save();
  },
  'food-search': (el, ctx) => {
    ctx.ui.search = el.value;
    const ul = document.getElementById('food-results');
    if (ul) ul.innerHTML = searchResults(el.value);
    return false;
  },
  'extra-pick': (el, ctx) => { ctx.ui.extraFood = el.dataset.food; },
  'extra-cancel': (el, ctx) => { ctx.ui.extraFood = null; },
  'extra-del': (el, ctx) => {
    const log = dayLog(ctx.state, ctx.iso);
    log.extras.splice(Number(el.dataset.i), 1);
    ctx.save();
  },
};

export const submits = {
  'extra-add': (form, ctx) => {
    const g = num(new FormData(form).get('g'));
    if (!g || g <= 0) { ctx.toast('اكتب الكمية بالجرام'); return false; }
    dayLog(ctx.state, ctx.iso).extras.push({ food: ctx.ui.extraFood, g });
    ctx.ui.extraFood = null;
    ctx.ui.search = '';
    ctx.save();
    ctx.toast('اتضاف ✓');
  },
};
