// Bootstrap: state, tab router, event delegation, service worker.
import { loadState, saveState } from './store.js';
import { todayISO, dayNameAr, formatShort } from './engine/dates.js';
import { icon } from './ui/icons.js';
import * as Onboarding from './ui/onboarding.js';
import * as Today from './ui/today.js';
import * as Meals from './ui/meals.js';
import * as Workout from './ui/workout.js';
import * as Progress from './ui/progress.js';
import * as Settings from './ui/settings.js';
import * as Plan from './ui/plan.js';

const VIEWS = { today: Today, meals: Meals, workout: Workout, plan: Plan, progress: Progress, settings: Settings };
const MODULES = [Onboarding, Today, Meals, Workout, Plan, Progress, Settings];

const actions = Object.assign({}, ...MODULES.map((m) => m.actions ?? {}), {
  tab: (el, ctx) => {
    if (el.dataset.date) ctx.iso = el.dataset.date;
    if (el.dataset.tab === 'plan') ctx.ui.calMonth = ctx.iso.slice(0, 7);
    ctx.go(el.dataset.tab);
    return false;
  },
  'pick-date': (el, ctx) => {
    ctx.iso = el.dataset.date;
    ctx.ui.swap = null;
    ctx.ui.playing = {};
  },
});
const submits = Object.assign({}, ...MODULES.map((m) => m.submits ?? {}));

const loaded = loadState();
const ctx = {
  state: loaded.state,
  iso: todayISO(),
  tab: (location.hash.slice(1) in VIEWS) ? location.hash.slice(1) : 'today',
  ui: { playing: {} },
  save() {
    const err = saveState(ctx.state);
    document.getElementById('banner').hidden = !err;
  },
  render,
  go(tab) {
    ctx.tab = tab;
    ctx.ui.swap = null;
    ctx.ui.playing = {};
    if (location.hash.slice(1) !== tab) history.replaceState(null, '', `#${tab}`);
    render();
    window.scrollTo(0, 0);
  },
  toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(ctx._t);
    ctx._t = setTimeout(() => t.classList.remove('show'), 2200);
  },
};

const TABS = [
  ['today', 'home', 'النهارده'],
  ['meals', 'utensils', 'الأكل'],
  ['workout', 'dumbbell', 'التمرين'],
  ['plan', 'calendar', 'الخطة'],
  ['progress', 'chart', 'التقدم'],
];

function renderChrome() {
  document.getElementById('logo-mark').innerHTML = icon('dumbbell');
  document.getElementById('top-settings').innerHTML = icon('sliders');
  const t = todayISO();
  document.getElementById('top-date').textContent = `${dayNameAr(t)} ${formatShort(t)}`;
  document.getElementById('nav').innerHTML = TABS.map(([tab, ic, label]) =>
    `<button data-act="tab" data-tab="${tab}"><span class="ic-wrap">${icon(ic)}</span>${label}</button>`).join('');
}

function render() {
  const root = document.getElementById('view');
  const nav = document.getElementById('nav');
  document.getElementById('top-date').textContent = `${dayNameAr(todayISO())} ${formatShort(todayISO())}`;
  try {
    if (!ctx.state.profile) {
      nav.hidden = true;
      document.getElementById('top-settings').hidden = true;
      root.innerHTML = Onboarding.render(ctx);
      return;
    }
    nav.hidden = false;
    document.getElementById('top-settings').hidden = false;
    root.innerHTML = VIEWS[ctx.tab].render(ctx);
    for (const b of nav.querySelectorAll('[data-tab]')) b.classList.toggle('active', b.dataset.tab === ctx.tab);
    // Week table: bring the selected day's column into view (works in RTL too).
    const col = root.querySelector('.week-table thead th.sel');
    const wrap = col?.closest('.week-wrap');
    if (wrap) {
      const sticky = wrap.querySelector('thead th.sticky')?.offsetWidth ?? 0;
      const c = col.getBoundingClientRect();
      const w = wrap.getBoundingClientRect();
      wrap.scrollLeft += c.left - w.left - (w.width - sticky - c.width) / 2;
    }
  } catch (e) {
    console.error(e);
    root.innerHTML = `<section class="card danger"><h2>حصلت مشكلة</h2><p class="muted small">${String(e.message).replace(/</g, '&lt;')}</p>
      <p>جرّب تعمل نسخة احتياطية من الإعدادات وتفتح الأبليكيشن تاني.</p></section>`;
  }
}

function run(handler, el, e) {
  if (!handler) return;
  const r = handler(el, ctx, e);
  if (r !== false) render();
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  e.preventDefault();
  run(actions[el.dataset.act], el, e);
});
document.addEventListener('change', (e) => {
  const el = e.target.closest('[data-change]');
  if (el) run(actions[el.dataset.change], el, e);
});
document.addEventListener('input', (e) => {
  const el = e.target.closest('[data-input]');
  if (el) run(actions[el.dataset.input], el, e);
});
document.addEventListener('submit', (e) => {
  const form = e.target.closest('[data-submit]');
  if (!form) return;
  e.preventDefault();
  run(submits[form.dataset.submit], form, e);
});
window.addEventListener('hashchange', () => {
  const t = location.hash.slice(1);
  if (t in VIEWS && t !== ctx.tab) ctx.go(t);
});
// A new day while the app stays open: refresh "today".
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && ctx.tab === 'today') render();
});

if (loaded.error) document.getElementById('banner').hidden = false;
else if (loaded.state.profile) saveState(loaded.state); // persist any schema migration right away
renderChrome();
render();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('./sw.js').catch((err) => console.warn('SW', err));
}
