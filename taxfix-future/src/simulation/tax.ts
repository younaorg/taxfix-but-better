import {
  GRUNDFREIBETRAG,
  BBG_RV_AV,
  BBG_KV_PV,
  RV_EE,
  AV_EE,
  KV_EE,
  PV_EE_CHILDLESS,
  PV_EE_PARENT,
  SOLI_RATE,
  SOLI_FREIGRENZE_SINGLE,
  WERBUNGSKOSTEN,
  SONDERAUSGABEN,
} from "./constants";

export interface SocialContributions {
  rv: number;
  av: number;
  kv: number;
  pv: number;
  total: number;
}

// Employee share only. Each branch is capped at its own contribution ceiling.
export function socialContributions(gross: number, children: number): SocialContributions {
  const rvBase = Math.min(gross, BBG_RV_AV);
  const kvBase = Math.min(gross, BBG_KV_PV);
  const pvRate = children > 0 ? PV_EE_PARENT : PV_EE_CHILDLESS;

  const rv = rvBase * RV_EE;
  const av = rvBase * AV_EE;
  const kv = kvBase * KV_EE;
  const pv = kvBase * pvRate;

  return { rv, av, kv, pv, total: rv + av + kv + pv };
}

// Simplified Vorsorgepauschale: av is not deductible. Real German law is more granular.
export function taxableIncome(gross: number, children: number): number {
  const { rv, kv, pv } = socialContributions(gross, children);
  return gross - (rv + kv + pv) - WERBUNGSKOSTEN - SONDERAUSGABEN;
}

// §32a EStG, tax year 2026. Floored to full euros, as the German tariff requires.
export function incomeTax(zvE: number): number {
  if (zvE <= GRUNDFREIBETRAG) return 0;

  let tax: number;
  if (zvE <= 17_799) {
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
  return Math.floor(Math.max(tax, 0));
}

// 0 below the Freigrenze; above it, the Milderungszone caps soli at 11.9% of the excess.
export function soli(tax: number): number {
  if (tax <= SOLI_FREIGRENZE_SINGLE) return 0;
  return Math.min(0.119 * (tax - SOLI_FREIGRENZE_SINGLE), SOLI_RATE * tax);
}
