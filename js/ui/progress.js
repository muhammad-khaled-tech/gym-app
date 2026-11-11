// "Progress": weight chart, measurements, body fat, real TDEE, advice, program overview.
import { esc, n0, n1, num } from './dom.js';
import { weightChart } from './chart.js';
import { adviceCard } from './today.js';
import { stats, trend, adviceFor, program, programEnd } from '../model.js';
import { PHASE_AR } from '../engine/program.js';
import { waistToHeight, waistToHip } from '../engine/bodycomp.js';
import { movingAverage } from '../engine/energy.js';
import { todayISO, addDays, formatShort, diffDays } from '../engine/dates.js';
import { upsertByDate } from '../store.js';

export function render(ctx) {
  const s = ctx.state;
  const iso = todayISO();
  const st = stats(s, iso);
  const p = s.profile;
  const first = s.weights[0];
  const avg14 = movingAverage(s.weights, addDays(iso, -14), 7);
  const rate = st.avg != null && avg14 != null ? (avg14 - st.avg) / 2 : null;
  const tdeeReal = trend(s, iso, st);
  const adv = st.plan.inProgram ? adviceFor(s, iso, st) : null;
  const applied = s.adviceAppliedOn && diffDays(s.adviceAppliedOn, iso) < 14;
  const bf = st.bodyFat;
  const prog = program(p);
  const weeks = prog.map((w) => {
    const from = addDays(p.startDate, (w.week - 1) * 7);
    const cur = w.week === st.plan.weekNumber;
    return `<li class="${cur ? 'current' : ''} ph-${w.phase}"><b>${w.week}</b><span>${formatShort(from)}</span><span class="grow">${PHASE_AR[w.phase]}</span><span class="muted small">${w.calories === 'maintenance' ? 'صيانة' : 'عجز'}</span></li>`;
  }).join('');
  const ms = [...s.measurements].reverse().slice(0, 12).map((m) => `
    <tr><td>${formatShort(m.date)}</td><td>${m.waist ?? '–'}</td><td>${m.neck ?? '–'}</td><td>${m.hip ?? '–'}</td><td>${m.arm ?? '–'}</td></tr>`).join('');
  const weightsList = [...s.weights].reverse().slice(0, 10).map((w) => `
    <li class="item"><span class="grow">${formatShort(w.date)}</span><b>${n1(w.kg)} كجم</b><button class="btn small ghost" data-act="weight-del" data-date="${w.date}">امسح</button></li>`).join('');

  return `
    <section class="card">
      <h2>الوزن</h2>
      <div class="sum-grid">
        <div><b>${first ? n1(first.kg) : '–'}</b><small>البداية</small></div>
        <div><b>${st.avg != null ? n1(st.avg) : '–'}</b><small>متوسط آخر 7 أيام</small></div>
        <div><b>${first && st.avg != null ? n1(st.avg - first.kg) : '–'}</b><small>الفرق</small></div>
      </div>
      ${rate != null ? `<p class="muted small">بتنزل حوالي <b>${n1(rate)}</b> كجم في الأسبوع (${n1((rate / st.avg) * 100)}%). الهدف 0.5–1%.</p>` : ''}
      ${weightChart(s.weights, iso, first && first.date < p.startDate ? first.date : p.startDate)}
      <form class="row-form" data-submit="weight-add">
        <input name="date" type="date" value="${iso}" max="${iso}">
        <input name="kg" type="number" inputmode="decimal" step="0.1" placeholder="كجم" required>
        <button class="btn primary" type="submit">سجّل</button>
      </form>
      <details><summary>آخر الأوزان</summary><ul class="items">${weightsList}</ul></details>
    </section>

    ${adviceCard(adv, applied)}

    <section class="card">
      <h2>نسبة الدهون</h2>
      <div class="sum-grid">
        <div><b>${n1(bf.bf)}%</b><small>التقدير الشغال</small></div>
        <div><b>${n1(bf.lbm)}</b><small>كتلة صافية (كجم)</small></div>
        <div><b>${n1(bf.fatMass)}</b><small>دهون (كجم)</small></div>
      </div>
      <p class="muted small">Navy ${n1(bf.navy)}% · RFM ${n1(bf.rfm)}% · Army ${n1(bf.army)}% · الوسط÷الطول ${waistToHeight(st.waist, p.height).toFixed(2)} (الحد 0.5) · الوسط÷الهيب ${waistToHip(st.waist, st.hip).toFixed(2)} (الحد 0.90)</p>
      <p class="muted small">الهدف: ${p.targetBf}%. الأرقام دي تقديرية (±3–4%)، الأهم هو اتجاه الوسط.</p>
    </section>

    <section class="card">
      <h2>القياسات</h2>
      <form data-submit="measure-add" class="measure-form">
        <label class="field"><span>التاريخ</span><input name="date" type="date" value="${iso}" max="${iso}"></label>
        <label class="field"><span>الوسط عند السرة</span><input name="waist" type="number" inputmode="decimal" step="0.1" value="${st.waist ?? ''}"></label>
        <label class="field"><span>الرقبة</span><input name="neck" type="number" inputmode="decimal" step="0.1" value="${st.neck ?? ''}"></label>
        <label class="field"><span>الهيب</span><input name="hip" type="number" inputmode="decimal" step="0.1" value="${st.hip ?? ''}"></label>
        <label class="field"><span>الدراع</span><input name="arm" type="number" inputmode="decimal" step="0.1" value="${st.arm ?? ''}"></label>
        <button class="btn primary block" type="submit">احفظ القياس</button>
      </form>
      <table class="table"><thead><tr><th>التاريخ</th><th>وسط</th><th>رقبة</th><th>هيب</th><th>دراع</th></tr></thead><tbody>${ms}</tbody></table>
    </section>

    <section class="card">
      <h2>الحرق اليومي (TDEE)</h2>
      <p>المستخدم دلوقتي: <b>${n0(st.tdee)}</b> سعر ${st.tdeeSource === 'trend' ? '(من ترند وزنك)' : `(من المعادلة: BMR ${n0(st.bmr)} × ${p.pal})`}</p>
      ${tdeeReal != null
        ? `<p>حرقك الحقيقي من آخر 21 يوم: <b>${n0(tdeeReal)}</b> سعر.</p>
           <button class="btn" data-act="apply-trend" data-v="${Math.round(tdeeReal)}">استخدم الرقم ده</button>`
        : '<p class="muted small">الحرق الحقيقي بيتحسب بعد 3 أسابيع، لما يبقى فيه 4 أوزان على الأقل في أول أسبوع وآخر أسبوع.</p>'}
      ${s.kcalOffset ? `<p class="muted small">تعديل يدوي على السعرات: ${s.kcalOffset > 0 ? '+' : ''}${s.kcalOffset}</p>` : ''}
    </section>

    <section class="card">
      <h2>البرنامج (${p.totalWeeks} أسبوع، لحد ${formatShort(programEnd(p))})</h2>
      <ul class="weeks">${weeks}</ul>
    </section>`;
}

export const actions = {
  'apply-trend': (el, ctx) => {
    ctx.state.tdeeOverride = Number(el.dataset.v);
    ctx.state.kcalOffset = 0;
    ctx.save();
    ctx.toast('السعرات اتحسبت من حرقك الحقيقي ✓');
  },
  'weight-del': (el, ctx) => {
    ctx.state.weights = ctx.state.weights.filter((w) => w.date !== el.dataset.date);
    ctx.save();
  },
};

export const submits = {
  'weight-add': (form, ctx) => {
    const f = new FormData(form);
    const kg = num(f.get('kg'));
    if (kg == null || kg < 30 || kg > 300) { ctx.toast('اكتب الوزن بالكيلو'); return false; }
    ctx.state.weights = upsertByDate(ctx.state.weights, { date: f.get('date') || todayISO(), kg });
    ctx.save();
    ctx.toast('اتسجل ✓');
  },
  'measure-add': (form, ctx) => {
    const f = new FormData(form);
    const m = { date: f.get('date') || todayISO() };
    for (const k of ['waist', 'neck', 'hip', 'arm']) {
      const v = num(f.get(k));
      if (v != null) m[k] = v;
    }
    if (m.waist != null && m.neck != null && m.waist <= m.neck) { ctx.toast('الوسط لازم يبقى أكبر من الرقبة'); return false; }
    ctx.state.measurements = upsertByDate(ctx.state.measurements, m);
    ctx.save();
    ctx.toast('القياس اتحفظ ✓');
  },
};
