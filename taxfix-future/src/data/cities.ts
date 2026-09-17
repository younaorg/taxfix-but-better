// Germany has NO city-level income tax. Cities differ in rent and cost of living
// only — do not add a fake per-city tax rate here or anywhere else.
export interface City {
  name: string;
  medianRent1BR: number; // EUR/month
  rentBand: [number, number]; // EUR/month, for the search grid
}

export const CITIES: City[] = [
  { name: "Berlin", medianRent1BR: 1250, rentBand: [950, 1700] },
  { name: "Munich", medianRent1BR: 1650, rentBand: [1300, 2200] },
  { name: "Hamburg", medianRent1BR: 1350, rentBand: [1000, 1850] },
  { name: "Cologne", medianRent1BR: 1150, rentBand: [850, 1550] },
  { name: "Frankfurt", medianRent1BR: 1400, rentBand: [1050, 1900] },
  { name: "Stuttgart", medianRent1BR: 1300, rentBand: [1000, 1750] },
  { name: "Leipzig", medianRent1BR: 850, rentBand: [600, 1150] },
];
