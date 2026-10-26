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

test("default 40-year plan splits income equally with a 480-month corpus", () => {
  const result = calculatePlan();
  close(result.monthlySpending, 10000);
  close(result.retirementAssets, 4800000);
  close(result.targetAssets / result.monthlySpending, 480);
  assert.equal(result.monthlySaving, 10000);
  assert.equal(result.savingsRate, 0.5);
  assert.equal(result.retirementAge, 62);
  assert.equal(result.growthIncome, 0);
  assert.equal(result.trajectory.length, 41);
  assert.deepEqual(result.trajectory[0], { age: 22, year: 0, assets: 0, contributions: 0 });
  assert.equal(result.trajectory.at(-1).assets, result.retirementAssets);
});

test("closed form agrees with month-end recurrence for positive and negative returns", () => {
  for (const workReturn of [-2, 0, 3.5, 8]) {
    const inputs = { ...DEFAULTS, workReturn, initialAssets: 345678, workYears: 27 };
    const result = calculatePlan(inputs);
    const q = Math.expm1(Math.log1p(workReturn / 100) / 12);
    let assets = inputs.initialAssets;
    for (let month = 1; month <= inputs.workYears * 12; month++) {
      assets = assets * (1 + q) + result.monthlySaving;
      if (month % 12 === 0) close(result.trajectory[month / 12].assets, assets);
    }
    close(result.retirementAssets, assets);
    close(result.retirementAssets, result.targetAssets);
    assert.ok(Math.abs(result.growthIncome - (assets - result.totalContributions)) < 1e-6);
    assert.equal(Math.sign(result.growthIncome), Math.sign(workReturn));
  }
});

test("near-zero work returns remain numerically stable", () => {
  const reference = plan({ initialAssets: 100000 });
  for (const workReturn of [-1e-12, 1e-12]) {
    const result = plan({ initialAssets: 100000, workReturn });
    close(result.monthlySpending, reference.monthlySpending);
    close(result.retirementAssets, reference.retirementAssets);
  }
});

test("tiny positive retirement returns retain a positive sustainable spend", () => {
  const result = plan({ retirementReturn: 1e-307 });
  assert.ok(result.monthlySpending > 0);
  assert.equal(result.zeroReturn, false);
  close(result.retirementAssets, result.targetAssets);
});

test("immediate retirement depends on initial assets and retirement return", () => {
  const result = plan({ workYears: 0, initialAssets: 1000000 });
  close(result.monthlySpending, 1000000 * 0.025 / 12);
  assert.equal(result.retirementAssets, 1000000);
  assert.equal(result.totalContributions, 1000000);
  assert.equal(result.growthIncome, 0);
  assert.equal(result.retirementAge, DEFAULTS.currentAge);
  assert.equal(result.trajectory.length, 1);
  assert.equal(plan({ workYears: 0 }).monthlySpending, 0);
});

test("zero retirement return exposes no finite positive-spending target", () => {
  const result = plan({ retirementReturn: 0, workReturn: 4, initialAssets: 100000 });
  assert.equal(result.monthlySpending, 0);
  assert.equal(result.targetAssets, null);
  assert.equal(result.zeroReturn, true);
  assert.equal(result.monthlySaving, DEFAULTS.monthlyIncome);
  assert.ok(result.retirementAssets > result.totalContributions);
  assert.equal(plan({ workYears: 0, retirementReturn: 0 }).retirementAssets, 0);
});

test("spending increases with income, initial assets, work duration and returns", () => {
  const base = plan().monthlySpending;
  for (const changes of [
    { monthlyIncome: 21000 }, { initialAssets: 100000 },
    { workYears: 41 }, { workReturn: 1 }, { retirementReturn: 3 },
  ]) assert.ok(plan(changes).monthlySpending > base);
  close(plan({ currentAge: 40 }).monthlySpending, base);
});

test("high initial assets can fund spending above income without clamping", () => {
  const result = plan({ monthlyIncome: 3000, initialAssets: 10000000, workYears: 1, retirementReturn: 5 });
  assert.ok(result.monthlySpending > 3000);
  assert.ok(result.monthlySaving < 0);
  close(result.retirementAssets, result.targetAssets);
});

test("extreme supported plans have finite balances and trajectories", () => {
  for (const workReturn of [-2, 0, 8]) {
    for (const retirementReturn of [0, 1e-12, 5]) {
      const result = plan({ monthlyIncome: 100000, initialAssets: 10000000,
        workYears: 50, currentAge: 60, workReturn, retirementReturn });
      for (const [key, value] of Object.entries(result)) {
        if (typeof value === "number") assert.ok(Number.isFinite(value), key);
      }
      for (const row of result.trajectory) {
        for (const value of Object.values(row)) assert.ok(Number.isFinite(value));
        assert.ok(row.assets >= 0);
      }
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
});
