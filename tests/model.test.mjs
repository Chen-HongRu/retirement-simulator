import assert from "node:assert/strict";
import test from "node:test";
import { calculatePlan, DEFAULTS, LIMITS } from "../dist/model.js";

function close(actual, expected, tolerance = 1e-10) {
  assert.ok(Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)),
    `Expected ${actual} to be close to ${expected}`);
}

function plan(changes = {}) {
  return calculatePlan({ ...DEFAULTS, ...changes });
}

test("default shared-rate plan funds the same real spending throughout life", () => {
  const result = calculatePlan();
  assert.equal(DEFAULTS.annualReturn, 2.5);
  assert.deepEqual(LIMITS.annualReturn, { min: 0, max: 5, step: 0.1 });
  assert.equal("workReturn" in DEFAULTS, false);
  assert.equal("retirementReturn" in DEFAULTS, false);
  close(result.monthlySpending, 12604.331927586649);
  close(result.retirementAssets, 6050079.325241588);
  close(result.monthlySaving, 7395.668072413351);
  close(result.monthlySaving + result.monthlySpending, DEFAULTS.monthlyIncome);
  close(result.savingsRate, result.monthlySaving / DEFAULTS.monthlyIncome);
  close(result.targetAssets / result.monthlySpending, 480);
  assert.equal(result.retirementAge, 62);
  assert.ok(result.growthIncome > 0);
  assert.equal(result.trajectory.length, 41);
  assert.deepEqual(result.trajectory[0], { age: 22, year: 0, assets: 0, contributions: 0 });
  assert.equal(result.trajectory.at(-1).assets, result.retirementAssets);
});

test("shared-rate closed form agrees with independent month-end cash flow", () => {
  for (const annualReturn of [0, 0.1, 2.5, 5]) {
    const inputs = { ...DEFAULTS, annualReturn, initialAssets: 345678, workYears: 27 };
    const result = calculatePlan(inputs);
    const monthlyGrowth = (1 + annualReturn / 100) ** (1 / 12);
    let assets = inputs.initialAssets;
    for (let month = 1; month <= inputs.workYears * 12; month++) {
      // Salary pays this same living budget; the balance is invested at month end.
      assets = assets * monthlyGrowth + inputs.monthlyIncome - result.monthlySpending;
      if (month % 12 === 0) close(result.trajectory[month / 12].assets, assets);
    }
    close(result.retirementAssets, assets);
    close(result.totalContributions, inputs.initialAssets + result.monthlySaving * 12 * inputs.workYears);
    close(result.growthIncome, assets - result.totalContributions, 1e-8);
    close(result.monthlySaving + result.monthlySpending, inputs.monthlyIncome);
    if (annualReturn > 0) {
      close(result.retirementAssets, result.targetAssets);
      for (let year = 0; year < 5; year++) {
        assets = assets * (1 + annualReturn / 100) - 12 * result.monthlySpending;
        close(assets, result.retirementAssets);
      }
    }
  }
});

test("near-zero shared returns approach the zero-rate balance stably", () => {
  const reference = plan({ annualReturn: 0, initialAssets: 100000 });
  for (const annualReturn of [1e-12, 1e-9]) {
    const result = plan({ initialAssets: 100000, annualReturn });
    close(result.retirementAssets, reference.retirementAssets, 1e-9);
    close(result.monthlySpending, annualReturn / 100 * reference.retirementAssets / 12);
    assert.ok(result.monthlySpending > 0);
    assert.equal(result.zeroReturn, false);
    close(result.retirementAssets, result.targetAssets);
  }
});

test("tiny positive shared return retains a positive sustainable spend", () => {
  const result = plan({ annualReturn: 1e-307 });
  assert.ok(result.monthlySpending > 0);
  assert.equal(result.zeroReturn, false);
  close(result.retirementAssets, result.targetAssets);
});

test("immediate retirement spends initial-asset income with no accumulation", () => {
  const result = plan({ workYears: 0, initialAssets: 1000000 });
  close(result.monthlySpending, 1000000 * 0.025 / 12);
  assert.equal(result.retirementAssets, 1000000);
  assert.equal(result.totalContributions, 1000000);
  assert.equal(result.growthIncome, 0);
  assert.equal(result.retirementAge, DEFAULTS.currentAge);
  assert.equal(result.trajectory.length, 1);
  assert.equal(plan({ workYears: 0 }).monthlySpending, 0);
});

test("zero shared return permits no perpetual spending while preserving principal", () => {
  const result = plan({ annualReturn: 0, initialAssets: 100000 });
  assert.equal(result.monthlySpending, 0);
  assert.equal(result.targetAssets, null);
  assert.equal(result.zeroReturn, true);
  assert.equal(result.monthlySaving, DEFAULTS.monthlyIncome);
  assert.equal(result.retirementAssets, 100000 + DEFAULTS.monthlyIncome * 12 * DEFAULTS.workYears);
  assert.equal(result.growthIncome, 0);
  assert.equal(plan({ workYears: 0, annualReturn: 0 }).retirementAssets, 0);
});

test("spending increases with income, initial assets, work duration and shared return", () => {
  const base = plan().monthlySpending;
  for (const changes of [
    { monthlyIncome: 21000 }, { initialAssets: 100000 },
    { workYears: 41 }, { annualReturn: 3 },
  ]) assert.ok(plan(changes).monthlySpending > base);
  close(plan({ currentAge: 40 }).monthlySpending, base);
});

test("high initial assets can fund spending above income without clamping", () => {
  const result = plan({ monthlyIncome: 3000, initialAssets: 10000000, workYears: 1, annualReturn: 5 });
  assert.ok(result.monthlySpending > 3000);
  assert.ok(result.monthlySaving < 0);
  close(result.retirementAssets, result.targetAssets);
});

test("extreme supported plans have finite balances and trajectories", () => {
  for (const annualReturn of [0, 1e-12, 5]) {
    const result = plan({ monthlyIncome: 100000, initialAssets: 10000000,
      workYears: 50, currentAge: 60, annualReturn });
    for (const [key, value] of Object.entries(result)) {
      if (typeof value === "number") assert.ok(Number.isFinite(value), key);
    }
    for (const row of result.trajectory) {
      for (const value of Object.values(row)) assert.ok(Number.isFinite(value));
      assert.ok(row.assets >= 0);
    }
  }
});

test("invalid inputs fail explicitly without coercing strings or nonfinite values", () => {
  for (const key of Object.keys(LIMITS)) {
    for (const value of [NaN, Infinity, -Infinity, "2", null, undefined]) {
      assert.throws(() => plan({ [key]: value }), TypeError);
    }
    assert.throws(() => plan({ [key]: LIMITS[key].min - 1 }), RangeError);
    assert.throws(() => plan({ [key]: LIMITS[key].max + 1 }), RangeError);
  }
  for (const key of ["currentAge", "workYears"]) {
    assert.throws(() => plan({ [key]: LIMITS[key].min + 0.5 }), RangeError);
  }
  for (const input of [null, [], "plan", {}]) assert.throws(() => calculatePlan(input), TypeError);
  const { annualReturn, ...missingRate } = DEFAULTS;
  assert.throws(() => calculatePlan({ ...missingRate, workReturn: annualReturn, retirementReturn: annualReturn }), TypeError);
});
