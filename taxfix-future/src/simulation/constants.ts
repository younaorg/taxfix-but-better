// 2026 German tax & social insurance constants — verified, hardcode exactly.
// Einkommensteuer §32a EStG, tax year 2026.
export const GRUNDFREIBETRAG = 12_348;

// Social insurance 2026 — employee share, each branch capped at its OWN ceiling.
export const BBG_RV_AV = 101_400; // pension + unemployment, annual ceiling
export const BBG_KV_PV = 69_750; // health + long-term care, annual ceiling

export const RV_EE = 0.186 / 2; // 9.30%
export const AV_EE = 0.026 / 2; // 1.30%
export const KV_EE = (0.146 + 0.029) / 2; // 8.75% (incl. 2.9% avg Zusatzbeitrag)
export const PV_EE_CHILDLESS = 0.024; // 1.8% + 0.6% Kinderlosenzuschlag (age 23+)
export const PV_EE_PARENT = 0.018;

export const SOLI_RATE = 0.055;
export const SOLI_FREIGRENZE_SINGLE = 20_350; // of assessed income tax

export const WERBUNGSKOSTEN_PAUSCHBETRAG = 1_230;
export const SONDERAUSGABEN_PAUSCHBETRAG = 36;

// Church tax (Kirchensteuer) — only relevant if the user is a member. Not modelled in the
// MVP demo path (Alex is not a church member); rate would be 8% (Bayern/BW) or 9% elsewhere.
export const KIRCHENSTEUER_RATE_DEFAULT = 0.09;

// Germany has NO municipal/city-level income tax. Moving cities changes rent and cost of
// living only — never add a fake city tax multiplier to income tax.

// Entfernungspauschale (commuter allowance), 2026 rates — per one-way km, per work day.
export const PENDLERPAUSCHALE_RATE_FIRST_20KM = 0.3;
export const PENDLERPAUSCHALE_RATE_BEYOND_20KM = 0.38;
export const DEFAULT_WORK_DAYS_PER_YEAR = 220;
