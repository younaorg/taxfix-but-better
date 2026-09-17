import {
  AV_EE,
  BBG_KV_PV,
  BBG_RV_AV,
  GRUNDFREIBETRAG,
  KV_EE,
  PV_EE_CHILDLESS,
  PV_EE_PARENT,
  RV_EE,
  SOLI_FREIGRENZE_SINGLE,
  SOLI_RATE,
  SONDERAUSGABEN_PAUSCHBETRAG,
  WERBUNGSKOSTEN_PAUSCHBETRAG,
} from "./constants";

/** Income tax per §32a EStG 2026, five zones. Floored to full euros. */
export function incomeTax(zvE: number): number {
  let tax: number;
  if (zvE <= GRUNDFREIBETRAG) {
    tax = 0;
  } else if (zvE <= 17_799) {
    const y = (zvE - 12_348) / 10_000;
    tax = (914.51 * y + 1_400) * y;
  } else if (zvE <= 69_878) {
    const z = (zvE - 17_799) / 10_000;
    tax = (173.1 * z + 2_397) * z + 1_034.87;
  } else if (zvE <= 277_825) {
    tax = 0.42 * zvE - 11_135.63;
  } else {
    tax = 0.45 * zvE - 19_470.38;
  }
  return Math.floor(Math.max(0, tax));
}

export interface SocialContributions {
  rv: number;
  av: number;
  kv: number;
  pv: number;
  total: number;
}

/** Employee-share social contributions. Each branch capped at its own ceiling. */
export function socialContributions(gross: number, children: number): SocialContributions {
  const rvBase = Math.min(gross, BBG_RV_AV);
  const avBase = Math.min(gross, BBG_RV_AV);
  const kvBase = Math.min(gross, BBG_KV_PV);
  const pvBase = Math.min(gross, BBG_KV_PV);

  const rv = rvBase * RV_EE;
  const av = avBase * AV_EE;
  const kv = kvBase * KV_EE;
  const pv = pvBase * (children > 0 ? PV_EE_PARENT : PV_EE_CHILDLESS);
  const total = rv + av + kv + pv;

  return { rv, av, kv, pv, total };
}

/**
 * zvE = gross − (RV + KV + PV employee shares) − Werbungskosten − Sonderausgaben.
 * AV is not deductible. Simplification of the real Vorsorgepauschale — surface as an assumption.
 * Werbungskosten is the GREATER of the flat Pauschbetrag or itemized deductions (commuter
 * allowance, work equipment) — real German tax law (Günstigerprüfung), not a simplification.
 */
export function taxableIncome(
  gross: number,
  children: number,
  itemizedWerbungskosten = 0
): number {
  const sv = socialContributions(gross, children);
  const deductible = sv.rv + sv.kv + sv.pv;
  const werbungskosten = Math.max(WERBUNGSKOSTEN_PAUSCHBETRAG, itemizedWerbungskosten);
  return Math.max(0, gross - deductible - werbungskosten - SONDERAUSGABEN_PAUSCHBETRAG);
}

/** Solidaritätszuschlag: 0 below the Freigrenze, else min(0.119*(tax-freigrenze), 0.055*tax). */
export function soli(tax: number): number {
  if (tax <= SOLI_FREIGRENZE_SINGLE) return 0;
  return Math.min(0.119 * (tax - SOLI_FREIGRENZE_SINGLE), SOLI_RATE * tax);
}
