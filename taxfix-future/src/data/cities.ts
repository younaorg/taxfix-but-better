// Germany has NO city-level income tax — cities differ in rent and cost of living only.
// Do not add a fake city tax multiplier here or anywhere else.
export interface CityInfo {
  name: string;
  medianRent1BR: number; // EUR/month
  rentBand: [number, number]; // EUR/month, for the grid search
}

export const CITIES: CityInfo[] = [
  { name: "Berlin", medianRent1BR: 1_250, rentBand: [950, 1_650] },
  { name: "Munich", medianRent1BR: 1_650, rentBand: [1_300, 2_100] },
  { name: "Hamburg", medianRent1BR: 1_350, rentBand: [1_000, 1_750] },
  { name: "Cologne", medianRent1BR: 1_150, rentBand: [850, 1_500] },
  { name: "Frankfurt", medianRent1BR: 1_450, rentBand: [1_100, 1_900] },
  { name: "Stuttgart", medianRent1BR: 1_300, rentBand: [1_000, 1_700] },
  { name: "Leipzig", medianRent1BR: 850, rentBand: [650, 1_100] },
];

export function cityByName(name: string): CityInfo | undefined {
  return CITIES.find((c) => c.name.toLowerCase() === name.toLowerCase());
}
