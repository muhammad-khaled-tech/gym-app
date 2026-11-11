// "Meals": detailed per-day tables (tap a row to swap), a full weekly table, and off-plan logging.
import { esc, n0, num } from './dom.js';
import { icon } from './icons.js';
import { weekNav, weekDates } from './weekchips.js';
import { stats, menuFor, eatenTotals } from '../model.js';
import { MEAL_NAMES } from '../data/menus.js';
import { FOODS, FOOD_GROUPS_AR } from '../data/foods.js';
import { formatAmount, swapCandidates, equivalentGrams, totals } from '../engine/menu.js';
import { dayNameAr, formatShort, todayISO } from '../engine/dates.js';
import { dayLog } from '../store.js';

const MEAL_ORDER = ['breakfast', 'lunch', 'snack', 'dinner', 'night', 'tea'];
const shortName = (id) => FOODS[id].name.split(' (')[0];
// Units that already name the food ("2 بيضة") don't need the food name in front.
const SELF_NAMED = new Set(['بيضة', 'بياض', 'موزة', 'تفاحة', 'برتقانة', 'يوسفية', 'جوافة', 'بلحاية']);
export function itemLabel(id, g) {
  const a = formatAmount(id, g);
  const selfNamed = SELF_NAMED.has(FOODS[id].unitName) && !a.endsWith('جم');
  return selfNamed ? `<b>${esc(a)}</b>` : `${esc(shortName(id))} <b>${esc(a)}</b>`;
}

function amountCell(food, g) {
  const a = formatAmount(food, g);
  const grams = /جم$/.test(a) ? '' : `<span class="muted"> (${n0(g)} جم)</span>`;
  return `${esc(a)}${grams}`;
}

function mealTable(m, mi) {
  const rows = m.items.map((it, ii) => {
    const t = totals([it]);
    const canSwap = swapCandidates(it.swappedFrom ?? it.food).length > 0;
    const attrs = canSwap ? ` class="tap" data-act="swap-open" data-m="${mi}" data-i="${ii}"` : '';
    return `<tr${attrs}>
      <td><span class="fname">${esc(shortName(it.food))}</span>
        ${it.swappedFrom ? `<span class="tag">بدل ${esc(shortName(it.swappedFrom))}</span>` : canSwap ? `<span class="swap-hint">${icon('swap')}بدّل</span>` : ''}</td>
      <td class="amt">${amountCell(it.food, it.g)}</td>
      <td class="n">${n0(t.kcal)}</td><td class="n p">${n0(t.p)}</td><td class="n">${n0(t.c)}</td><td class="n">${n0(t.f)}</td>
    </tr>`;
  }).join('');
  const s = m.totals;
  return `
    <table class="food-table">
      <colgroup><col class="c-name"><col class="c-amt"><col><col><col><col></colgroup>
      <thead><tr><th>الصنف</th><th>الكمية</th><th>سعرات</th><th>بروتين</th><th>كارب</th><th>دهون</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><td colspan="2">مجموع الوجبة</td><td class="n">${n0(s.kcal)}</td><td class="n p">${n0(s.p)}</td><td class="n">${n0(s.c)}</td><td class="n">${n0(s.f)}</td></tr></tfoot>
    </table>`;
}

function swapSheet(ctx, day) {
  const sw = ctx.ui.swap;
  if (!sw) return '';
  const it = day.meals[sw.m]?.items[sw.i];
  if (!it) return '';
  const original = it.swappedFrom ?? it.food;
  const base = FOODS[original].swap;
  const key = base === 'protein' ? 'البروتين' : base === 'carb' ? 'الكارب' : 'السعرات';
  const origG = it.swappedFrom ? equivalentGrams(it.food, it.g, original) : it.g;
  const rows = [original, ...swapCandidates(original)].map((id) => {
    const g = id === original ? origG : equivalentGrams(original, origG, id);
    const t = totals([{ food: id, g }]);
    return `<li><button class="pick ${id === it.food ? 'active' : ''}" data-act="swap-pick" data-food="${id}">
      <span class="grow">${esc(FOODS[id].name)}${id === original ? ' <span class="tag-sm">الأصلي</span>' : ''}</span>
      <span class="meta">${esc(formatAmount(id, g))} · ${n0(t.kcal)} سعر · ${n0(t.p)} جم</span></button></li>`;
  }).join('');
  return `
    <div class="sheet-backdrop" data-act="sheet-close"></div>
    <div class="sheet" role="dialog" aria-label="بدّل الصنف">
      <div class="sheet-head"><h2>بدّل ${esc(shortName(original))}</h2><button class="icon-btn" data-act="sheet-close" aria-label="قفل">${icon('x')}</button></div>
      <p class="muted small">الكمية بتتظبط عشان ${key} يفضل زي ما هو تقريبًا (${esc(FOOD_GROUPS_AR[base] ?? '')}).</p>
      <ul class="pick-list">${rows}</ul>
    </div>`;
}

function searchResults(q) {
  const s = q.trim();
  const ids = Object.keys(FOODS).filter((id) => !s || FOODS[id].name.includes(s)).slice(0, 25);
  if (!ids.length) return '<li class="muted small">مفيش نتايج</li>';
  return ids.map((id) => `<li><button class="pick" data-act="extra-pick" data-food="${id}">
    <span class="grow">${esc(FOODS[id].name)}</span><span class="meta">${n0(FOODS[id].kcal)} سعر لكل 100 جم</span></button></li>`).join('');
}

function extrasCard(ctx, log) {
  const pick = ctx.ui.extraFood;
  const list = (log.extras ?? []).map((e, i) => {
    const t = totals([e]);
    return `<li class="item"><div class="grow"><b>${esc(FOODS[e.food].name)}</b><div class="muted small">${esc(formatAmount(e.food, e.g))} · ${n0(t.kcal)} سعر · ${n0(t.p)} جم بروتين</div></div>
      <button class="icon-btn" data-act="extra-del" data-i="${i}" aria-label="امسح">${icon('trash')}</button></li>`;
  }).join('');
  const f = pick && FOODS[pick];
  return `
    <section class="card">
      <div class="card-head"><h2>${icon('plus')}أكلت حاجة برا الجدول؟</h2></div>
      ${list ? `<ul class="items">${list}</ul>` : ''}
      ${f ? `
        <form class="extra-form" data-submit="extra-add">
          <div><b>${esc(f.name)}</b><div class="muted small">${n0(f.kcal)} سعر و${f.p} جم بروتين لكل 100 جم</div></div>
          <label class="field inline"><span>الكمية (جرام)</span>
            <input name="g" type="number" inputmode="decimal" min="1" max="3000" value="${f.unit ?? 100}" required></label>
          ${f.unit ? `<p class="muted small">${esc(formatAmount(pick, f.unit))} = ${f.unit} جم</p>` : ''}
          <div class="row"><button class="btn primary" type="submit">${icon('plus')}ضيف</button><button class="btn ghost" type="button" data-act="extra-cancel">إلغاء</button></div>
        </form>`
      : `
        <div class="search-box">${icon('search')}<input type="search" placeholder="كشري، طعمية، بسبوسة…" data-input="food-search" value="${esc(ctx.ui.search ?? '')}"></div>
        <ul class="pick-list" id="food-results">${searchResults(ctx.ui.search ?? '')}</ul>`}
    </section>`;
}

function dayView(ctx) {
  const s = ctx.state;
  const iso = ctx.iso;
  const st = stats(s, iso);
  const day = menuFor(s, iso, st);
  const log = s.days[iso] ?? { eaten: [], extras: [], swaps: {} };
  const eaten = eatenTotals(s, iso, day);
  const t = st.targets;
  const meals = day.meals.map((m, mi) => {
    const time = s.settings.mealTimes[m.key];
    const done = log.eaten?.includes(mi);
    return `
      <section class="card ${done ? 'done' : ''}">
        <div class="meal-head">
          <h3>${time ? `<span class="time">${esc(time)}</span>` : ''}${esc(MEAL_NAMES[m.key])}</h3>
          <button class="check" data-act="toggle-meal-at" data-i="${mi}" aria-label="أكلت ${esc(MEAL_NAMES[m.key])}">${icon('check')}</button>
        </div>
        ${mealTable(m, mi)}
      </section>`;
  }).join('');
  const d = day.totals;
  return `
    ${weekNav(s.profile, iso)}
    <section class="card">
      <div class="card-head"><h2>${icon('flame')}مجموع ${esc(dayNameAr(iso))}</h2><span class="muted small">اتاكل ${n0(eaten.kcal)} سعر</span></div>
      <div class="day-sum">
        <div class="k"><span class="num">${n0(d.kcal)}</span><small>سعرات</small><div class="of">/ ${n0(t.kcal)}</div></div>
        <div class="pr"><span class="num">${n0(d.p)}</span><small>بروتين</small><div class="of">/ ${t.protein}</div></div>
        <div><span class="num">${n0(d.c)}</span><small>كارب</small><div class="of">/ ${t.carbs}</div></div>
        <div><span class="num">${n0(d.f)}</span><small>دهون</small><div class="of">/ ${t.fat}</div></div>
      </div>
      <p class="muted small">${esc(day.note ?? '')}${st.mode === 'maintenance' ? ' · أسبوع صيانة' : ''}</p>
      <div class="note">${icon('info')}<span>الأوزان كلها للأكل <b>بعد الطبخ</b>. الطبيخ بمعلقة سمنة أو زيت واحدة للحلة كلها، والشاي بستيفيا. دوس على أي صنف عشان تبدّله.</span></div>
    </section>
    ${meals}
    ${extrasCard(ctx, log)}
    ${swapSheet(ctx, day)}`;
}

function weekView(ctx) {
  const s = ctx.state;
  const dates = weekDates(ctx.iso);
  const today = todayISO();
  const days = dates.map((d) => ({ d, day: menuFor(s, d) }));
  const head = days.map(({ d }) => `<th class="${d === today ? 'today' : ''}${d === ctx.iso ? ' sel' : ''}"><button class="th-btn" data-act="meals-open-day" data-date="${d}">${dayNameAr(d)}<small>${formatShort(d)}</small></button></th>`).join('');
  const rows = MEAL_ORDER.map((key) => {
    const cells = days.map(({ d, day }) => {
      const sel = d === ctx.iso ? ' class="sel"' : '';
      const m = day.meals.find((x) => x.key === key);
      if (!m) return `<td${sel}><span class="muted">—</span></td>`;
      const items = m.items.map((it) => `<li>${itemLabel(it.food, it.g)}</li>`).join('');
      return `<td${sel}><ul>${items}</ul><div class="cell-k">${n0(m.totals.kcal)} سعر · ${n0(m.totals.p)} جم</div></td>`;
    }).join('');
    const time = s.settings.mealTimes[key];
    return `<tr><th class="sticky">${esc(MEAL_NAMES[key].split(' (')[0])}${time ? `<small>${esc(time)}</small>` : ''}</th>${cells}</tr>`;
  }).join('');
  const foot = days.map(({ d, day }) => `<td${d === ctx.iso ? ' class="sel"' : ''}><span class="num">${n0(day.totals.kcal)}</span> سعر<br><span class="num good">${n0(day.totals.p)}</span> جم بروتين<br><span class="muted">${n0(day.totals.c)} كارب · ${n0(day.totals.f)} دهون</span></td>`).join('');
  return `
    ${weekNav(s.profile, ctx.iso, { dayAct: 'meals-open-day' })}
    <section class="card">
      <div class="card-head"><h2>${icon('table')}جدول الأسبوع</h2><span class="muted small">دوس على أي يوم يفتحه</span></div>
      <div class="week-wrap">
        <table class="week-table">
          <thead><tr><th class="sticky">الوجبة</th>${head}</tr></thead>
          <tbody>${rows}</tbody>
          <tfoot><tr><th class="sticky">المجموع</th>${foot}</tr></tfoot>
        </table>
      </div>
      <p class="muted small">الأوزان بعد الطبخ. أي تبديل بتعمله في يوم بيظهر هنا.</p>
    </section>`;
}

export function render(ctx) {
  const view = ctx.ui.mealsView ?? 'day';
  return `
    <div class="segmented" role="tablist">
      <button class="${view === 'day' ? 'active' : ''}" data-act="meals-view" data-v="day" role="tab">${icon('list')}جدول اليوم</button>
      <button class="${view === 'week' ? 'active' : ''}" data-act="meals-view" data-v="week" role="tab">${icon('table')}جدول الأسبوع</button>
    </div>
    ${view === 'week' ? weekView(ctx) : dayView(ctx)}`;
}

export const actions = {
  'meals-view': (el, ctx) => { ctx.ui.mealsView = el.dataset.v; ctx.ui.swap = null; },
  'meals-open-day': (el, ctx) => { ctx.iso = el.dataset.date; ctx.ui.mealsView = 'day'; ctx.ui.swap = null; window.scrollTo(0, 0); },
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
    ctx.toast('اتضاف');
  },
};
