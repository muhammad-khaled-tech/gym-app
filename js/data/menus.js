// 7-day menu templates, index = JS weekday (0 = Sunday ... 6 = Saturday).
// Base grams are built around ~2,200 kcal / ~185 g protein; scaleDay() adapts them to the live targets.
// Item tuple: [foodId, grams, role]  role: 'protein' (scaled to protein), 'carb' (scaled to kcal), 'fixed'.

export const MEAL_NAMES = {
  breakfast: 'الفطار',
  lunch: 'الغدا',
  snack: 'سناك (قبل أو بعد التمرين)',
  dinner: 'العشا',
  night: 'قبل النوم',
  tea: 'الشاي (بستيفيا، طول اليوم)',
};

const TEA = { key: 'tea', items: [['milk_1', 60, 'fixed'], ['stevia', 3, 'fixed']] };
const MILK = { key: 'night', items: [['milk_1', 250, 'fixed']] };
const FUL_BREAKFAST = {
  key: 'breakfast',
  items: [['ful', 200, 'carb'], ['egg', 100, 'protein'], ['egg_white', 66, 'protein'], ['baladi', 45, 'carb'], ['salad', 150, 'fixed'], ['olive_oil', 4.5, 'fixed']],
};

export const MENUS = [
  { // 0 Sunday — Pull A
    name: 'الحد',
    note: 'شوفان باللبن وبيض الصبح، وبلطي مشوي على الغدا، وشوربة عدس بالتونة بالليل.',
    meals: [
      { key: 'breakfast', items: [['oats', 60, 'carb'], ['milk_1', 250, 'fixed'], ['egg', 100, 'protein'], ['egg_white', 66, 'protein'], ['banana', 118, 'fixed']] },
      { key: 'lunch', items: [['tilapia', 250, 'protein'], ['rice', 150, 'carb'], ['salad', 200, 'fixed'], ['olive_oil', 9, 'fixed']] },
      { key: 'snack', items: [['egg', 100, 'protein'], ['egg_white', 66, 'protein'], ['baladi', 45, 'carb'], ['cucumber', 100, 'fixed']] },
      { key: 'dinner', items: [['lentil_soup', 300, 'fixed'], ['tuna_water', 85, 'protein'], ['baladi', 45, 'carb'], ['salad', 150, 'fixed']] },
      TEA,
    ],
  },
  { // 1 Monday — Legs A
    name: 'الإتنين',
    note: 'بامية باللحمة على الغدا (حلة فيها معلقتين زيت بس).',
    meals: [
      FUL_BREAKFAST,
      { key: 'lunch', items: [['bamya_meat', 350, 'protein'], ['rice', 120, 'carb'], ['salad', 150, 'fixed']] },
      { key: 'snack', items: [['qareesh', 200, 'protein'], ['guava', 125, 'fixed']] },
      { key: 'dinner', items: [['chicken_breast', 200, 'protein'], ['baladi', 90, 'carb'], ['salad', 150, 'fixed'], ['olive_oil', 4.5, 'fixed']] },
      MILK, TEA,
    ],
  },
  { // 2 Tuesday — Push B
    name: 'التلات',
    note: 'أومليت الصبح، وكفتة بالمكرونة على الغدا، وكبدة فراخ بالليل.',
    meals: [
      { key: 'breakfast', items: [['egg', 150, 'protein'], ['egg_white', 99, 'protein'], ['olive_oil', 4.5, 'fixed'], ['baladi', 45, 'carb'], ['tomato', 120, 'fixed'], ['cucumber', 100, 'fixed']] },
      { key: 'lunch', items: [['kofta95', 180, 'protein'], ['pasta', 180, 'carb'], ['salad', 150, 'fixed']] },
      { key: 'snack', items: [['qareesh', 200, 'protein'], ['apple', 182, 'fixed']] },
      { key: 'dinner', items: [['chicken_liver', 150, 'protein'], ['baladi', 90, 'carb'], ['salad', 150, 'fixed'], ['olive_oil', 4.5, 'fixed']] },
      MILK, TEA,
    ],
  },
  { // 3 Wednesday — Pull B
    name: 'الأربع',
    note: 'شوفان وبيض الصبح، ولحمة صافية ببطاطس وفاصوليا على الغدا، وتونة بالليل.',
    meals: [
      { key: 'breakfast', items: [['oats', 60, 'carb'], ['milk_1', 250, 'fixed'], ['egg', 100, 'protein'], ['egg_white', 66, 'protein'], ['dates', 21, 'fixed']] },
      { key: 'lunch', items: [['beef_lean', 180, 'protein'], ['potato', 300, 'carb'], ['green_beans', 200, 'fixed'], ['olive_oil', 9, 'fixed']] },
      { key: 'snack', items: [['egg', 100, 'protein'], ['baladi', 45, 'carb'], ['cucumber', 100, 'fixed']] },
      { key: 'dinner', items: [['tuna_water', 170, 'protein'], ['baladi', 90, 'carb'], ['salad', 150, 'fixed'], ['olive_oil', 4.5, 'fixed']] },
      MILK, TEA,
    ],
  },
  { // 4 Thursday — Legs B
    name: 'الخميس',
    note: 'ورك فراخ برز وبسلة على الغدا، وبلطي ببطاطا بالليل.',
    meals: [
      FUL_BREAKFAST,
      { key: 'lunch', items: [['chicken_thigh', 200, 'protein'], ['rice', 150, 'carb'], ['peas_carrots', 200, 'fixed']] },
      { key: 'snack', items: [['tuna_water', 85, 'protein'], ['cucumber', 100, 'fixed'], ['banana', 118, 'fixed']] },
      { key: 'dinner', items: [['tilapia', 200, 'protein'], ['sweet_potato', 200, 'carb'], ['salad', 150, 'fixed'], ['olive_oil', 4.5, 'fixed']] },
      MILK, TEA,
    ],
  },
  { // 5 Friday — rest
    name: 'الجمعة',
    note: 'يوم الراحة: فطار فول، وفرخة مشوية بالملوخية، وكفتة بالطحينة بالليل.',
    meals: [
      FUL_BREAKFAST,
      { key: 'lunch', items: [['chicken_quarter', 200, 'protein'], ['rice', 150, 'carb'], ['molokhia', 300, 'fixed'], ['salad', 150, 'fixed']] },
      { key: 'snack', items: [['qareesh', 200, 'protein'], ['orange', 131, 'fixed']] },
      { key: 'dinner', items: [['kofta95', 150, 'protein'], ['baladi', 90, 'carb'], ['tahini', 15, 'fixed'], ['salad', 150, 'fixed']] },
      MILK, TEA,
    ],
  },
  { // 6 Saturday — Push A
    name: 'السبت',
    note: 'فول وبيض الصبح، وفراخ برز وملوخية على الغدا، وقريش بالليل.',
    meals: [
      FUL_BREAKFAST,
      { key: 'lunch', items: [['chicken_breast', 200, 'protein'], ['rice', 120, 'carb'], ['molokhia', 300, 'fixed'], ['salad', 150, 'fixed']] },
      { key: 'snack', items: [['egg', 100, 'protein'], ['milk_1', 250, 'fixed'], ['banana', 118, 'fixed']] },
      { key: 'dinner', items: [['qareesh', 250, 'protein'], ['baladi', 90, 'carb'], ['tomato', 120, 'fixed'], ['cucumber', 100, 'fixed'], ['olive_oil', 4.5, 'fixed']] },
      MILK, TEA,
    ],
  },
];
