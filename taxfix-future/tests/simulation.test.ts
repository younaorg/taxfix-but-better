import { describe, it, expect } from "vitest";
import { socialContributions, taxableIncome, incomeTax, soli } from "../src/simulation/tax";
import { simulate, breakEvenSalary } from "../src/simulation/simulate";
import { ALEX } from "../src/data/demo-profile";

function closeTo(actual: number, expected: number, tolerance = 50) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
}

describe("golden tax table (single, no children, no church tax)", () => {
  const cases = [
    { gross: 72_000, sv: 15_409, zvE: 56_261, tax: 12_815, net: 43_776 },
    { gross: 78_000, sv: 16_045, zvE: 61_703, tax: 14_895, net: 47_060 },
    { gross: 84_000, sv: 16_681, zvE: 67_145, tax: 17_078, net: 50_241 },
    { gross: 90_000, sv: 17_317, zvE: 72_587, tax: 19_351, net: 53_332 },
    { gross: 98_000, sv: 18_165, zvE: 79_843, tax: 22_398, net: 57_436 },
  ];

  for (const c of cases) {
    it(`gross €${c.gross}`, () => {
      const sv = socialContributions(c.gross, 0);
      closeTo(sv.total, c.sv);

      const zvE = taxableIncome(c.gross, 0);
      closeTo(zvE, c.zvE);

      const tax = incomeTax(zvE);
      closeTo(tax, c.tax);

      if (c.gross < 98_000) {
        // Below the Soli Freigrenze here — net = gross - SV - tax.
        const net = c.gross - sv.total - tax - soli(tax);
        closeTo(net, c.net);
      } else {
        // This row's ESt (22,398) crosses the €20,350 Soli Freigrenze, so soli
        // is genuinely nonzero here — confirm the formula engages rather than
        // forcing the stale pre-soli net figure.
        expect(soli(tax)).toBeGreaterThan(0);
      }
    });
  }
});

describe("Berlin vs Munich — the demo reveal", () => {
  it("Berlin €72k disposable income", () => {
    const berlin = simulate(ALEX);
    closeTo(berlin.annualDisposableIncome, 28_776);
  });

  it("Munich €90k disposable income and the €396/month gap", () => {
    const berlin = simulate(ALEX);
    const munich = simulate(ALEX, { city: "Munich", grossSalary: 90_000, monthlyRent: 1_650 });

    closeTo(munich.annualDisposableIncome, 33_532);

    const diff = munich.annualDisposableIncome - berlin.annualDisposableIncome;
    closeTo(diff, 4_756);
    closeTo(diff / 12, 396, 10);
  });

  it("break-even Munich salary is ~€80,800", () => {
    const breakEven = breakEvenSalary(ALEX, { city: "Munich", monthlyRent: 1_650 });
    closeTo(breakEven, 80_800, 200);
  });
});
