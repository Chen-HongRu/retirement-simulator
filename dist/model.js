// All cash flows and balances are CNY in today's purchasing power.
export const DEFAULTS = Object.freeze({
  monthlyIncome: 20000,
  workYears: 40,
  currentAge: 22,
  initialAssets: 0,
  annualReturn: 2.5,
});

export const LIMITS = Object.freeze({
  monthlyIncome: Object.freeze({ min: 3000, max: 100000, step: 1000 }),
  workYears: Object.freeze({ min: 0, max: 50, step: 1 }),
  currentAge: Object.freeze({ min: 18, max: 60, step: 1 }),
  initialAssets: Object.freeze({ min: 0, max: 10000000, step: 10000 }),
  annualReturn: Object.freeze({ min: 0, max: 5, step: 0.1 }),
});

function validate(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("Plan inputs must be an object.");
  }
  for (const [key, { min, max }] of Object.entries(LIMITS)) {
    const value = input[key];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new TypeError(`${key} must be a finite number.`);
    }
    if (value < min || value > max) {
      throw new RangeError(`${key} must be between ${min} and ${max}.`);
    }
    if ((key === "workYears" || key === "currentAge") && !Number.isInteger(value)) {
      throw new RangeError(`${key} must be an integer.`);
    }
  }
}

/**
 * Solve a constant real monthly spending amount, including during employment.
 * One real annual effective rate applies before and after retirement.
 * Work contributions arrive at month end.
 * Retirement uses the simplified annual convention: corpus = 12 * spending / r.
 * savingsRate is a fraction, and contributions include the initial assets.
 */
export function calculatePlan(input = DEFAULTS) {
  validate(input);
  const {
    monthlyIncome,
    workYears,
    currentAge,
    initialAssets,
    annualReturn,
  } = input;
  const months = workYears * 12;
  const rate = annualReturn / 100;
  const monthlyLogGrowth = Math.log1p(rate) / 12;
  const monthlyReturn = Math.expm1(monthlyLogGrowth);
  const accumulation = (count) => ({
    growth: Math.exp(monthlyLogGrowth * count),
    annuity: monthlyReturn === 0
      ? count
      : Math.expm1(monthlyLogGrowth * count) / monthlyReturn,
  });
  const { growth, annuity } = accumulation(months);
  const zeroReturn = rate === 0;
  const monthlySpending = zeroReturn
    ? 0
    : rate * (initialAssets * growth + monthlyIncome * annuity)
      / (rate * annuity + 12);
  const monthlySaving = monthlyIncome - monthlySpending;
  const retirementAssets = initialAssets * growth + monthlySaving * annuity;
  const totalContributions = initialAssets + monthlySaving * months;
  const trajectory = Array.from({ length: workYears + 1 }, (_, year) => {
    const { growth: yearGrowth, annuity: yearAnnuity } = accumulation(year * 12);
    return {
      age: currentAge + year,
      year,
      assets: initialAssets * yearGrowth + monthlySaving * yearAnnuity,
      contributions: initialAssets + monthlySaving * year * 12,
    };
  });

  return {
    monthlySpending,
    retirementAssets,
    targetAssets: zeroReturn ? null : 12 * monthlySpending / rate,
    retirementAge: currentAge + workYears,
    monthlySaving,
    savingsRate: monthlySaving / monthlyIncome,
    growthIncome: retirementAssets - totalContributions,
    totalContributions,
    trajectory,
    zeroReturn,
  };
}
