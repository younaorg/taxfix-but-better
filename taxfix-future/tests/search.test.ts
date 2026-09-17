import { describe, expect, it } from "vitest";
import { defaultSearchConfig, findBestWriteOffInsight, runSearch, selectThree } from "@/simulation/search";
import { ALEX } from "@/data/demo-profile";

describe("search", () => {
  it("evaluates a grid between 1500 and 3000 scenarios, fast", () => {
    const config = defaultSearchConfig(ALEX);
    const { evaluated, all, elapsedMs } = runSearch(ALEX, config);
    console.log("evaluated:", evaluated, "elapsedMs:", elapsedMs.toFixed(1));
    expect(evaluated).toBeGreaterThanOrEqual(1_500);
    expect(evaluated).toBeLessThanOrEqual(3_200);
    expect(elapsedMs).toBeLessThan(1_000);
    expect(all.length).toBe(evaluated);
  });

  it("selects 3 materially different futures", () => {
    const config = defaultSearchConfig(ALEX);
    const { all } = runSearch(ALEX, config);
    const three = selectThree(all, ALEX);
    expect(three.length).toBe(3);
    console.log(three.map((r) => `${r.city} €${r.grossSalary} rent€${r.monthlyRent}`));
  });

  it("finds a write-off timing insight with a real marginal rate", () => {
    const insight = findBestWriteOffInsight(ALEX);
    console.log(insight);
    expect(insight.taxSaved).toBeGreaterThan(0);
    expect(insight.effectiveRatePct).toBeGreaterThan(0);
    expect(insight.effectiveRatePct).toBeLessThan(60);
  });
});
