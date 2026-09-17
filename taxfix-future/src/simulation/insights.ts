import { UserProfile } from "@/types/profile";
import {
  DEFAULT_WORK_DAYS_PER_YEAR,
  PENDLERPAUSCHALE_RATE_BEYOND_20KM,
  PENDLERPAUSCHALE_RATE_FIRST_20KM,
} from "./constants";
import { incomeTax, taxableIncome } from "./tax";

/** Entfernungspauschale: first 20km at one rate, the rest at a higher rate, per work day. */
export function commuterAllowanceDeduction(
  oneWayKm: number,
  workDaysPerYear = DEFAULT_WORK_DAYS_PER_YEAR
): number {
  const first20 = Math.min(oneWayKm, 20);
  const rest = Math.max(0, oneWayKm - 20);
  const perDay = first20 * PENDLERPAUSCHALE_RATE_FIRST_20KM + rest * PENDLERPAUSCHALE_RATE_BEYOND_20KM;
  return Math.round(perDay * workDaysPerYear);
}

/**
 * Marginal income tax rate at a given taxable income — a small forward difference on the
 * exact bracket formula, not a lookup table, so it stays correct across zone boundaries.
 */
export function marginalRate(zvE: number): number {
  const step = 100;
  const delta = incomeTax(zvE + step) - incomeTax(zvE);
  return delta / step;
}

export interface DeductionTiming {
  amount: number;
  taxSaved: number;
  effectiveRatePct: number; // "the state co-sponsors X%"
}

/**
 * Tax saved by itemizing `amount` as a Werbungskosten/business deduction in the current
 * tax year, computed exactly (income tax with vs. without the deduction) rather than a
 * flat marginal-rate multiply, so it's correct even when the deduction crosses a zone.
 */
export function deductionTiming(profile: UserProfile, amount: number): DeductionTiming {
  const gross = profile.grossSalary * (profile.workingHoursPct / 100) + profile.sideIncome;
  const zvEWithout = taxableIncome(gross, profile.children);
  const zvEWith = Math.max(0, zvEWithout - amount);

  const taxWithout = incomeTax(zvEWithout);
  const taxWith = incomeTax(zvEWith);
  const taxSaved = taxWithout - taxWith;

  return {
    amount,
    taxSaved,
    effectiveRatePct: Math.round((taxSaved / amount) * 100),
  };
}
