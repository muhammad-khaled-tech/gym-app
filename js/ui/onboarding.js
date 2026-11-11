// First run: collect measurements and program settings (stored only on this phone).
import { esc, num } from './dom.js';
import { icon } from './icons.js';
import { todayISO } from '../engine/dates.js';
import { upsertByDate } from '../store.js';

const FIELDS = [
  ['weightKg', 'الوزن (كجم)', 'الصبح بعد الحمام وقبل الأكل', 40, 250],
  ['height', 'الطول (سم)', '', 140, 220],
  ['age', 'السن', '', 16, 80],
  ['neck', 'الرقبة (سم)', 'تحت تفاحة آدم على طول', 25, 60],
  ['waist', 'الوسط عند السرة (سم)', 'بطن مرتخية، في آخر زفير', 50, 200],
  ['hip', 'الهيب (سم)', 'أعرض نقطة في المقعدة', 60, 200],
  ['arm', 'الدراع (سم)', 'نص المسافة بين الكتف والكوع', 20, 70],
];

export function profileFields(p = {}) {
  return FIELDS.map(([k, label, hint, min, max]) => `
    <label class="field">
      <span>${label}</span>
      <input name="${k}" type="number" inputmode="decimal" step="0.1" min="${min}" max="${max}" required value="${esc(p[k] ?? '')}">
      ${hint ? `<small>${hint}</small>` : ''}
    </label>`).join('');
}

export function programFields(p = {}) {
  const weeks = p.totalWeeks ?? 12;
  const preset = [12, 24].includes(weeks) ? String(weeks) : 'custom';
  return `
    <label class="field"><span>نشاطك اليومي من غير الجيم</span>
      <select name="pal">
        <option value="1.2" ${p.pal === 1.2 ? 'selected' : ''}>قاعد طول اليوم وخطوات قليلة جدًا</option>
        <option value="1.375" ${!p.pal || p.pal === 1.375 ? 'selected' : ''}>شغل مكتبي + جيم (الأنسب ليك)</option>
        <option value="1.55" ${p.pal === 1.55 ? 'selected' : ''}>شغل فيه حركة ووقوف كتير</option>
      </select></label>
    <label class="field"><span>سرعة التنشيف</span>
      <select name="pace">
        <option value="balanced" ${p.pace !== 'fast' ? 'selected' : ''}>متوازن: عجز 20% (أحسن لبناء العضل)</option>
        <option value="fast" ${p.pace === 'fast' ? 'selected' : ''}>أسرع: عجز 25% (نزول أسرع، أقصى حد آمن)</option>
      </select>
      <small>العجز مش بيعدّي 750 سعر في اليوم في الحالتين، والبروتين بيفضل عالي.</small></label>
    <label class="field"><span>مدة البرنامج</span>
      <select name="weeksPreset" data-change="weeks-preset">
        <option value="12" ${preset === '12' ? 'selected' : ''}>3 شهور (12 أسبوع)</option>
        <option value="24" ${preset === '24' ? 'selected' : ''}>6 شهور (24 أسبوع)</option>
        <option value="custom" ${preset === 'custom' ? 'selected' : ''}>مدة تانية</option>
      </select></label>
    <label class="field ${preset === 'custom' ? '' : 'hidden'}" id="custom-weeks"><span>عدد الأسابيع</span>
      <input name="totalWeeks" type="number" min="2" max="104" value="${esc(weeks)}"></label>
    <label class="field"><span>تاريخ البداية</span>
      <input name="startDate" type="date" required value="${esc(p.startDate ?? todayISO())}"></label>
    <label class="field"><span>نسبة الدهون المستهدفة %</span>
      <input name="targetBf" type="number" min="8" max="30" step="0.5" value="${esc(p.targetBf ?? 20)}">
      <small>لما توصلها، الأبليكيشن هيقلب على أكل صيانة وبناء عضل.</small></label>`;
}

export function readProgram(form) {
  const f = new FormData(form);
  const preset = f.get('weeksPreset');
  const totalWeeks = preset === 'custom' ? Math.round(num(f.get('totalWeeks')) ?? 12) : Number(preset);
  return {
    pal: Number(f.get('pal')),
    pace: f.get('pace') === 'fast' ? 'fast' : 'balanced',
    totalWeeks: Math.min(104, Math.max(2, totalWeeks)),
    startDate: f.get('startDate') || todayISO(),
    targetBf: num(f.get('targetBf')) ?? 20,
  };
}

export function render() {
  return `
    <section class="card welcome">
      <div class="logo-mark">${icon('dumbbell')}</div>
      <h1>أهلًا بيك في خطتي</h1>
      <p>دخّل مقاساتك مرة واحدة، والأبليكيشن هيحسبلك نسبة الدهون والسعرات والبروتين، ويبنيلك البرنامج والأكل.</p>
      <p class="muted small">بياناتك بتتحفظ على الموبايل ده بس، ومش بتتبعت لأي حد.</p>
    </section>
    <form class="card" data-submit="onboard">
      <div class="card-head"><h2>${icon('ruler')}مقاساتك</h2></div>
      <div class="form-grid">${profileFields()}</div>
      <div class="card-head" style="margin-top:14px"><h2>${icon('calendar')}البرنامج</h2></div>
      ${programFields()}
      <button class="btn primary block" type="submit">ابدأ</button>
    </form>`;
}

export const actions = {
  'weeks-preset': (el) => {
    document.getElementById('custom-weeks')?.classList.toggle('hidden', el.value !== 'custom');
    return false;
  },
};

export const submits = {
  onboard: (form, ctx) => {
    const f = new FormData(form);
    const p = {};
    for (const [k] of FIELDS) p[k] = num(f.get(k));
    if (Object.values(p).some((v) => v == null)) {
      ctx.toast('كمّل كل المقاسات الأول');
      return false;
    }
    if (p.waist <= p.neck) {
      ctx.toast('الوسط لازم يبقى أكبر من الرقبة، راجع القياس');
      return false;
    }
    Object.assign(p, readProgram(form));
    const s = ctx.state;
    s.profile = p;
    const today = todayISO();
    s.weights = upsertByDate(s.weights, { date: today, kg: p.weightKg });
    s.measurements = upsertByDate(s.measurements, { date: today, waist: p.waist, neck: p.neck, hip: p.hip, arm: p.arm });
    ctx.save();
    ctx.go('today');
  },
};
