// 2026 German constants — verified. Do not change without re-checking §32a EStG.

export const GRUNDFREIBETRAG = 12_348;

// Social insurance 2026 — employee share, annual contribution ceilings (Beitragsbemessungsgrenze)
export const BBG_RV_AV = 101_400; // pension + unemployment
export const BBG_KV_PV = 69_750; // health + long-term care

export const RV_EE = 0.186 / 2; // 9.30%
export const AV_EE = 0.026 / 2; // 1.30%
export const KV_EE = (0.146 + 0.029) / 2; // 8.75% (incl. 2.9% avg Zusatzbeitrag)
export const PV_EE_CHILDLESS = 0.024; // 1.8% + 0.6% Kinderlosenzuschlag (age 23+)
export const PV_EE_PARENT = 0.018;

export const SOLI_RATE = 0.055;
export const SOLI_FREIGRENZE_SINGLE = 20_350; // of assessed income tax

export const WERBUNGSKOSTEN = 1_230;
export const SONDERAUSGABEN = 36;
