// "Settings": profile & program, meal times, calendar reminders, backup, reset.
import { esc, download } from './dom.js';
import { programFields, readProgram } from './onboarding.js';
import { programEnd } from '../model.js';
import { MEAL_NAMES } from '../data/menus.js';
import { SESSION_NAMES } from '../data/exercises.js';
import { reminderEvents, gcalLink, toICS } from '../engine/reminders.js';
import { todayISO, diffDays } from '../engine/dates.js';
import { exportJSON, importJSON, defaultState } from '../store.js';

function events(s) {
  const today = todayISO();
  const start = diffDays(today, s.profile.startDate) > 0 ? s.profile.startDate : today;
  return reminderEvents({
    startIso: start, endIso: programEnd(s.profile), mealTimes: s.settings.mealTimes, sessionNames: SESSION_NAMES,
  });
}

export function render(ctx) {
  const s = ctx.state;
  const p = s.profile;
  const ev = events(s);
  const evRows = ev.map((e) => `
    <li class="item">
      <div class="grow">${esc(e.title)}<div class="muted small">${esc(e.time)} · ${e.rrule.includes('WEEKLY') ? 'كل أسبوع' : 'كل يوم'}</div></div>
      <a class="btn small" href="${esc(gcalLink(e))}" target="_blank" rel="noopener">ضيف</a>
    </li>`).join('');
  const times = Object.keys(s.settings.mealTimes).map((k) => `
    <label class="field inline"><span>${esc(MEAL_NAMES[k])}</span>
      <input type="time" data-change="mealtime" data-k="${k}" value="${esc(s.settings.mealTimes[k])}"></label>`).join('');
  return `
    <section class="card">
      <h2>التذكيرات على Google Calendar</h2>
      <p class="muted small">الويب أبليكيشن مش بيقدر يبعت إشعارات وهو مقفول، فالتذكيرات بتتعمل على Google Calendar وإشعاراته بتيجي دايمًا. دوس <b>ضيف</b> على كل تذكير، وهيفتحلك Google Calendar والتذكير جاهز ومتكرر لحد آخر البرنامج. دوس <b>Save</b> هناك وارجع هنا.</p>
      <p class="muted small">لو غيّرت مواعيد الوجبات أو مدة البرنامج، امسح التذكيرات القديمة من Calendar وضيفها تاني.</p>
      <ul class="items">${evRows}</ul>
      <button class="btn ghost block" data-act="download-ics">أو نزّل كل التذكيرات في ملف .ics</button>
    </section>

    <section class="card">
      <h2>مواعيد الوجبات</h2>
      ${times}
      <p class="muted small">السناك يتحط قبل التمرين بساعة ونص لـ 3 ساعات، أو بعده على طول.</p>
    </section>

    <form class="card" data-submit="save-profile">
      <h2>البرنامج وبياناتك</h2>
      <label class="field"><span>الطول (سم)</span><input name="height" type="number" step="0.1" value="${esc(p.height)}"></label>
      <label class="field"><span>السن</span><input name="age" type="number" value="${esc(p.age)}"></label>
      ${programFields(p)}
      <p class="muted small">الوزن والمقاسات بتتحدث من تاب التقدم.</p>
      <button class="btn primary block" type="submit">احفظ</button>
    </form>

    <section class="card">
      <h2>تصحيح السعرات</h2>
      <p class="muted small">تعديل يدوي: ${s.kcalOffset ?? 0} سعر · الحرق: ${s.tdeeOverride ? `${s.tdeeOverride} (من الترند)` : 'من المعادلة'}</p>
      <button class="btn ghost" data-act="reset-calories">رجّع السعرات للمعادلة</button>
    </section>

    <section class="card">
      <h2>نسخة احتياطية</h2>
      <p class="muted small">بياناتك متخزنة في كروم على الموبايل ده بس. لو مسحت بيانات كروم هتروح، فاعمل نسخة كل أسبوع وابعتها لنفسك.</p>
      <div class="row">
        <button class="btn" data-act="export">نزّل نسخة</button>
        <label class="btn ghost file-btn">رجّع من نسخة<input type="file" accept="application/json,.json" data-change="import" hidden></label>
      </div>
    </section>

    <section class="card danger">
      <h2>امسح كل حاجة</h2>
      <button class="btn danger" data-act="reset-all">امسح البيانات وابدأ من الأول</button>
    </section>

    <p class="muted small center">الأرقام مبنية على USDA وبيانات معملية مصرية ووصفات محسوبة. ده مش بديل عن الدكتور.</p>`;
}

export const actions = {
  mealtime: (el, ctx) => {
    ctx.state.settings.mealTimes[el.dataset.k] = el.value;
    ctx.save();
  },
  'download-ics': (el, ctx) => {
    download('gym-reminders.ics', toICS(events(ctx.state)), 'text/calendar');
    return false;
  },
  'reset-calories': (el, ctx) => {
    ctx.state.kcalOffset = 0;
    ctx.state.tdeeOverride = null;
    ctx.state.adviceAppliedOn = null;
    ctx.save();
    ctx.toast('رجعت للمعادلة ✓');
  },
  export: (el, ctx) => {
    download(`gym-backup-${todayISO()}.json`, exportJSON(ctx.state));
    return false;
  },
  import: (el, ctx) => {
    const file = el.files?.[0];
    if (!file) return false;
    file.text().then((text) => {
      try {
        ctx.state = importJSON(text);
        ctx.save();
        ctx.toast('البيانات رجعت ✓');
        ctx.render();
      } catch (e) {
        ctx.toast(e.message);
      }
    });
    return false;
  },
  'reset-all': (el, ctx) => {
    if (!confirm('متأكد؟ كل الأوزان والقياسات والتمارين هتتمسح ومش هترجع، إلا لو عندك نسخة احتياطية.')) return false;
    ctx.state = defaultState();
    ctx.save();
    ctx.go('today');
  },
};

export const submits = {
  'save-profile': (form, ctx) => {
    const f = new FormData(form);
    const p = ctx.state.profile;
    const height = Number(f.get('height'));
    const age = Number(f.get('age'));
    if (height > 100) p.height = height;
    if (age > 10) p.age = age;
    Object.assign(p, readProgram(form));
    ctx.save();
    ctx.toast('اتحفظ ✓');
  },
};
