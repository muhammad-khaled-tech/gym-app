// Body-fat estimates from tape measurements (men). All lengths in cm, weight in kg.

/** US Navy (Hodgdon & Beckett 1984), metric form. waist = at the navel. */
export function navyMale({ waist, neck, height }) {
  return 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(height)) - 450;
}

/** Relative Fat Mass (Woolcott & Bergman 2018). */
export function rfmMale({ height, waist }) {
  return 64 - 20 * (height / waist);
}

/** US Army 2023 one-site tape (weight in lb, abdomen in inches). */
export function armyMale({ weightKg, waist }) {
  return -26.97 - 0.12 * (weightKg * 2.20462) + 1.99 * (waist / 2.54);
}

/** Working estimate = mean(Navy, RFM); Army is reported as a cross-check. */
export function estimateBodyFat({ weightKg, height, waist, neck }) {
  const navy = navyMale({ waist, neck, height });
  const rfm = rfmMale({ height, waist });
  const army = armyMale({ weightKg, waist });
  const bf = (navy + rfm) / 2;
  const lbm = weightKg * (1 - bf / 100);
  return { navy, rfm, army, bf, lbm, fatMass: weightKg - lbm };
}

export const waistToHeight = (waist, height) => waist / height;
export const waistToHip = (waist, hip) => waist / hip;
