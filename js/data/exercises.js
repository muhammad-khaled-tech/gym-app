// Exercises and sessions. Videos come from ./videos.js (verified YouTube ids).
import { VIDEOS } from './videos.js';

const X = (name, ar, { lower = false, iso = false, rest, cues, alt = [] }) => ({
  name, ar, lower, iso, rest: rest ?? (iso ? '60–90 ث' : '2–3 د'), cues, alt,
});

const RAW = {
  bench_press: X('Barbell Bench Press', 'بنش برس بالبار', {
    cues: ['لوحي الكتف مقفولين لورا وتحت، ورجلك ثابتة في الأرض.', 'نزّل البار على أسفل الصدر بتحكم، والكوع حوالي 45° من جسمك.', 'ادفع لفوق ولورا ناحية وشك من غير ما تنط بالبار من الصدر.'],
    alt: ['machine_chest_press'] }),
  incline_db_press: X('Incline Dumbbell Press', 'بنش مايل بالدمبل', {
    cues: ['الدكة مايلة 30° تقريبًا، مش أكتر.', 'نزّل الدمبل لحد جنب الصدر واحس بالشد.', 'اطلع والدمبلين بيقربوا من بعض من غير ما يخبطوا.'],
    alt: ['smith_incline_press'] }),
  seated_db_shoulder_press: X('Seated Dumbbell Shoulder Press', 'كتف أمامي بالدمبل قاعد', {
    cues: ['ضهرك لازق في الدكة وبطنك مشدودة.', 'نزّل لحد مستوى الودن تقريبًا.', 'ادفع لفوق من غير ما تقوّس ضهرك.'],
    alt: ['machine_shoulder_press'] }),
  lateral_raise: X('Lateral Raise', 'رفرفة جانبي', { iso: true,
    cues: ['ارفع لحد مستوى الكتف بس، والكوع مثني سنة.', 'فكّر إنك بتزق الدمبل لبره مش لفوق.', 'نزّل ببطء ومن غير مرجحة.'] }),
  triceps_pushdown: X('Cable Triceps Pushdown', 'ترايسبس كابل لتحت', { iso: true,
    cues: ['الكوع ثابت جنب جسمك طول الحركة.', 'افرد دراعك للآخر واعصر تحت.', 'ارجع لحد ما الساعد يبقى موازي للأرض تقريبًا.'] }),
  overhead_triceps_extension: X('Overhead Triceps Extension', 'ترايسبس فوق الراس', { iso: true,
    cues: ['الكوع موجّه لقدام ومش بيفتح لبره كتير.', 'نزّل ورا راسك لحد ما تحس بشد كامل.', 'افرد من غير ما تحرك الكتف.'] }),

  chest_supported_row: X('Chest-Supported Row', 'سحب ضهر وصدرك على الدكة', {
    cues: ['صدرك لازق في المسند طول الوقت.', 'اسحب بالكوع ناحية الوسط، واعصر لوحي الكتف.', 'افرد دراعك للآخر تحت عشان تاخد المدى كامل.'],
    alt: ['tbar_row'] }),
  tbar_row: X('T-Bar Row', 'سحب T-Bar', {
    cues: ['ضهرك مفرود ومايل لقدام حوالي 45°.', 'اسحب ناحية البطن والكوع قريب من جسمك.', 'متستخدمش وسطك تشد الوزن.'] }),
  lat_pulldown: X('Lat Pulldown', 'سحب أمامي', {
    cues: ['امسك أعرض من كتافك بشوية، وصدرك لفوق.', 'اسحب البار لأعلى الصدر بالكوع لتحت.', 'اطلع ببطء لحد ما دراعك يتفرد.'] }),
  seated_cable_row: X('Seated Cable Row', 'سحب أرضي كابل', {
    cues: ['ضهرك مفرود ومتتمرجحش لورا.', 'اسحب ناحية البطن واعصر لوحي الكتف.', 'خلّي كتافك تتمد لقدام في الرجوع.'] }),
  face_pull: X('Face Pull', 'فيس بول', { iso: true,
    cues: ['الحبل في مستوى الوش أو أعلى شوية.', 'اسحب ناحية وشك وافتح إيدك لبره.', 'وقفة ثانية في الآخر.'] }),
  ez_bar_curl: X('EZ-Bar Curl', 'باي بار زجزاج', { iso: true,
    cues: ['الكوع ثابت جنب جسمك.', 'متتمرجحش بضهرك.', 'نزّل للآخر ببطء.'] }),
  hammer_curl: X('Hammer Curl', 'هامر بالدمبل', { iso: true,
    cues: ['الكف مواجه لجسمك طول الحركة.', 'الكوع ثابت.', 'نزول بطيء.'] }),

  back_squat: X('Barbell Back Squat', 'سكوات بالبار', { lower: true,
    cues: ['البار على أعلى الضهر، ونفَس عميق واقفل بطنك قبل كل عدة.', 'انزل والركبة ماشية في اتجاه صوابع رجلك، لحد ما الفخذ يبقى موازي أو أوطى.', 'اطلع بنفس زاوية الضهر ومتخليش الركبة تدخل لجوه.'],
    alt: ['hack_squat'] }),
  hack_squat: X('Hack Squat', 'هاك سكوات', { lower: true,
    cues: ['رجلك في نص المنصة بعرض الكتف.', 'انزل لتحت بعمق وضهرك لازق.', 'ادفع من الكعب ونص القدم.'] }),
  romanian_deadlift: X('Romanian Deadlift', 'رومانيان ديدليفت', { lower: true,
    cues: ['الركبة مثنية شوية وثابتة.', 'زق الوسط لورا لحد ما تحس بشد في الخلفية، والبار لازق في رجلك.', 'ضهرك مفرود طول الوقت، واطلع بزق الوسط لقدام.'] }),
  leg_press: X('Leg Press', 'ليج برس', { lower: true,
    cues: ['ضهرك ووسطك لازقين في المسند، متخليش الوسط يترفع في النزول.', 'انزل لحد ما الركبة تقرب من صدرك.', 'متقفلش الركبة للآخر فوق.'] }),
  lying_leg_curl: X('Lying Leg Curl', 'خلفية نايم', { lower: true, iso: true,
    cues: ['الوسط لازق في الجهاز.', 'اسحب لحد آخر المدى وكمش.', 'نزّل ببطء.'] }),
  standing_calf_raise: X('Standing Calf Raise', 'سمانة واقف', { lower: true, iso: true,
    cues: ['انزل بالكعب لتحت للآخر وخد شد.', 'اطلع على أطراف صوابعك وقف ثانية.', 'من غير تنطيط.'] }),
  cable_crunch: X('Cable Crunch', 'بطن كابل', { iso: true,
    cues: ['اركع والحبل جنب راسك.', 'كوّر ضهرك لتحت بعضلات البطن، مش بإيدك.', 'الوسط ثابت ومش بيقعد على الكعب.'] }),

  overhead_press: X('Overhead Press', 'ضغط كتف بالبار واقف', {
    cues: ['اقفل بطنك ومقعدتك ومتقوّسش ضهرك.', 'البار يطلع قريب من وشك، وراسك تدخل تحته فوق.', 'الكوع تحت البار شوية لقدام.'],
    alt: ['machine_shoulder_press'] }),
  machine_shoulder_press: X('Machine Shoulder Press', 'كتف أمامي على الجهاز', {
    cues: ['ظبط الكرسي عشان المسكة تبقى في مستوى الكتف.', 'ادفع لفوق من غير ما تقفل الكوع.', 'رجوع بطيء.'] }),
  incline_barbell_press: X('Incline Barbell Press', 'بنش مايل بالبار', {
    cues: ['الدكة 30°، ولوحي الكتف مقفولين.', 'نزّل البار على أعلى الصدر.', 'ادفع لفوق في خط مستقيم.'],
    alt: ['smith_incline_press'] }),
  smith_incline_press: X('Smith Incline Press', 'بنش مايل على السميث', {
    cues: ['حط الدكة بحيث البار ينزل على أعلى الصدر.', 'تحكم في النزول.', 'ادفع من غير ما ترفع وسطك.'] }),
  machine_chest_press: X('Machine Chest Press', 'تشست برس على الجهاز', {
    cues: ['المسكة في مستوى نص الصدر.', 'ادفع وانت ضاغط صدرك.', 'ارجع لحد ما تحس بشد في الصدر.'] }),
  pec_deck: X('Pec Deck', 'فراشة جهاز', { iso: true,
    cues: ['الكوع مثني سنة وثابت.', 'قفّل وانت حاسس إنك بتعصر الصدر.', 'افتح لحد شد مريح من غير ما تشد الكتف.'],
    alt: ['cable_fly'] }),
  cable_fly: X('Cable Fly', 'تجميع كابل', { iso: true,
    cues: ['خطوة لقدام، والكوع مثني سنة.', 'هات إيدك قدام صدرك في قوس.', 'رجوع بطيء.'] }),
  skull_crusher: X('EZ-Bar Skull Crusher', 'ترايسبس نايم بالبار', { iso: true,
    cues: ['الدراع مايل لورا شوية، مش عمودي.', 'نزّل البار ورا راسك بالكوع بس.', 'افرد من غير ما الكوع يفتح لبره.'] }),

  pull_up: X('Pull-up', 'عقلة', {
    cues: ['ابدأ من تعليق كامل، وصدرك لفوق.', 'اسحب لحد ما دقنك تعدي البار.', 'لو مش قادر تعمل 6، استخدم جهاز العقلة المساعدة أو السحب الأمامي.'],
    alt: ['assisted_pull_up', 'lat_pulldown'] }),
  assisted_pull_up: X('Assisted Pull-up', 'عقلة بالجهاز المساعد', {
    cues: ['الوزن المساعد بيقل كل ما تقوى.', 'نفس حركة العقلة: صدر لفوق وكوع لتحت.', 'نزول بطيء.'] }),
  one_arm_db_row: X('One-Arm Dumbbell Row', 'سحب دمبل بإيد واحدة', {
    cues: ['إيد ورجل على الدكة، وضهرك مفرود.', 'اسحب الدمبل ناحية الوسط مش الصدر.', 'افرد للآخر تحت.'] }),
  straight_arm_pulldown: X('Straight-Arm Pulldown', 'سحب بدراع مفرود', { iso: true,
    cues: ['الدراع شبه مفرود طول الحركة.', 'زق البار لحد رجلك من الكتف.', 'رجوع بطيء لفوق.'] }),
  reverse_pec_deck: X('Reverse Pec Deck', 'خلفي كتف على الفراشة', { iso: true,
    cues: ['صدرك على المسند.', 'افتح لبره بالكتف الخلفي مش بالضهر.', 'وزن خفيف ومدى كامل.'] }),
  incline_db_curl: X('Incline Dumbbell Curl', 'باي دمبل على دكة مايلة', { iso: true,
    cues: ['الدراع مدلدل لورا جسمك.', 'ارفع من غير ما الكوع يتحرك لقدام.', 'نزّل للآخر.'] }),
  cable_curl: X('Cable Curl', 'باي كابل', { iso: true,
    cues: ['الكوع ثابت جنبك.', 'اعصر فوق ثانية.', 'نزول بطيء.'] }),

  trap_bar_deadlift: X('Trap Bar Deadlift', 'ديدليفت بالبار السداسي', { lower: true,
    cues: ['اقف في نص البار، واقفل بطنك قبل الشد.', 'ادفع الأرض برجلك والضهر مفرود.', 'اقف مفرود فوق من غير ما تقوّس لورا.'],
    alt: ['deadlift'] }),
  deadlift: X('Conventional Deadlift', 'ديدليفت عادي', { lower: true,
    cues: ['البار فوق نص القدم، والقصبة قريبة منه.', 'افرد ضهرك وشد البار قبل ما ترفع.', 'البار لازق في رجلك طالع ونازل.'] }),
  bulgarian_split_squat: X('Bulgarian Split Squat', 'بلغاري سكوات', { lower: true,
    cues: ['رجل ورا على الدكة، والقدام بعيدة كفاية.', 'انزل عمودي لحد ما الركبة اللي ورا تقرب من الأرض.', 'ادفع من كعب الرجل اللي قدام.'],
    alt: ['walking_lunge'] }),
  walking_lunge: X('Walking Lunge', 'لانجز ماشي بالدمبل', { lower: true,
    cues: ['خطوة طويلة ومتزنة.', 'الركبة اللي ورا تقرب من الأرض.', 'جسمك مفرود.'] }),
  leg_extension: X('Leg Extension', 'رفرفة أمامي', { lower: true, iso: true,
    cues: ['ظبط المسند على نهاية الركبة.', 'افرد للآخر واعصر ثانية.', 'نزول بطيء.'] }),
  seated_leg_curl: X('Seated Leg Curl', 'خلفية قاعد', { lower: true, iso: true,
    cues: ['ميّل لقدام شوية عشان شد أكتر.', 'اسحب للآخر.', 'رجوع بطيء.'] }),
  hip_thrust: X('Barbell Hip Thrust', 'هيب ثرست بالبار', { lower: true,
    cues: ['لوحي الكتف على الدكة، والبار على الحوض بمخدة.', 'ادفع لفوق لحد ما جسمك يبقى مفرود، واعصر المقعدة.', 'دقنك لتحت ومتقوّسش ضهرك.'] }),
  seated_calf_raise: X('Seated Calf Raise', 'سمانة قاعد', { lower: true, iso: true,
    cues: ['انزل للآخر وخد شد.', 'اطلع للآخر وقف ثانية.', 'من غير تنطيط.'] }),
  hanging_knee_raise: X('Hanging Knee Raise', 'رفع ركب وانت متعلق', { iso: true,
    cues: ['متعلق من غير مرجحة.', 'ارفع ركبك وكوّر الحوض لفوق.', 'نزول بطيء.'] }),
};

export const EXERCISES = Object.fromEntries(
  Object.entries(RAW).map(([k, v]) => [k, { ...v, video: VIDEOS[k]?.primary ?? null, backup: VIDEOS[k]?.backup ?? null }]),
);

const E = (key, reps) => ({ key, reps });

export const SESSIONS = {
  pushA: { name: 'Push A', ar: 'دفع A: التركيز على الصدر', exercises: [
    E('bench_press', '6–8'), E('incline_db_press', '8–12'), E('seated_db_shoulder_press', '8–12'),
    E('lateral_raise', '12–20'), E('triceps_pushdown', '10–15'), E('overhead_triceps_extension', '10–15')] },
  pullA: { name: 'Pull A', ar: 'سحب A: سُمك الضهر', exercises: [
    E('chest_supported_row', '6–10'), E('lat_pulldown', '8–12'), E('seated_cable_row', '10–12'),
    E('face_pull', '12–20'), E('ez_bar_curl', '8–12'), E('hammer_curl', '10–15')] },
  legsA: { name: 'Legs A', ar: 'رجل A: التركيز على الأمامية', exercises: [
    E('back_squat', '6–8'), E('romanian_deadlift', '8–10'), E('leg_press', '10–15'),
    E('lying_leg_curl', '10–15'), E('standing_calf_raise', '10–15'), E('cable_crunch', '10–15')] },
  pushB: { name: 'Push B', ar: 'دفع B: الكتف وأعلى الصدر', exercises: [
    E('overhead_press', '6–10'), E('incline_barbell_press', '8–10'), E('machine_chest_press', '10–12'),
    E('pec_deck', '12–15'), E('lateral_raise', '15–20'), E('skull_crusher', '10–12')] },
  pullB: { name: 'Pull B', ar: 'سحب B: عرض الضهر', exercises: [
    E('pull_up', '6–10'), E('one_arm_db_row', '8–12'), E('straight_arm_pulldown', '12–15'),
    E('reverse_pec_deck', '15–20'), E('incline_db_curl', '10–12'), E('cable_curl', '12–15')] },
  legsB: { name: 'Legs B', ar: 'رجل B: التركيز على الخلفية', exercises: [
    E('trap_bar_deadlift', '5–8'), E('bulgarian_split_squat', '8–12 لكل رجل'), E('leg_extension', '12–15'),
    E('seated_leg_curl', '10–15'), E('hip_thrust', '8–12'), E('seated_calf_raise', '12–20'), E('hanging_knee_raise', '10–15')] },
};

// Intro days before the program starts: one easy full-body session, mostly machines.
SESSIONS.fullBody = { name: 'Full Body', ar: 'فول بادي تمهيدي', exercises: [
  E('leg_press', '10–12'), E('machine_chest_press', '10–12'), E('lat_pulldown', '10–12'), E('seated_cable_row', '10–12'),
  E('lying_leg_curl', '10–15'), E('lateral_raise', '12–15'), E('cable_crunch', '10–15')] };

export const SESSION_NAMES = Object.fromEntries(Object.entries(SESSIONS).map(([k, s]) => [k, s.name]));
