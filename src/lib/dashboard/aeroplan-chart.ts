export type AeroplanZone = "North America" | "Atlantic" | "Pacific" | "South America";
export type AeroplanCabin = "economy";
export type AeroplanOperatorClass = "air-canada-or-select-dynamic" | "other-partner-fixed";

export const AEROPLAN_CHART_URL = "https://www.aircanada.com/content/dam/aircanada/loyalty-content/documents/flight-rewards-chart-june2026-en.pdf";
export const AEROPLAN_REDEEM_SOURCE = "https://www.aircanada.com/ca/en/aco/home/aeroplan/redeem/air-canada.html";
export const AEROPLAN_FEE_SOURCE = "https://www.aircanada.com/us/en/aco/home/aeroplan/legal/aeroplan-flight-reward-policy.html";
export const AEROPLAN_CHART_REVIEWED_AT = "2026-09-11";

export const AEROPLAN_SELECT_DYNAMIC_IATA = ["AC", "UA", "EK", "FZ", "EY"] as const;

export const AEROPLAN_OTHER_PARTNER_FIXED_IATA = [
  "A3", "AI", "AV", "BR", "CA", "CM", "ET", "LH", "LO", "LX",
  "MS", "NH", "NZ", "OS", "OU", "SA", "SN", "SQ", "TG", "TK", "TP", "ZH",
] as const;

type Band = { maxMiles: number | null; otherPartnerEconomy: number };

const WITHIN_NORTH_AMERICA: Band[] = [
  { maxMiles: 500, otherPartnerEconomy: 6000 },
  { maxMiles: 1500, otherPartnerEconomy: 10000 },
  { maxMiles: 2750, otherPartnerEconomy: 12500 },
  { maxMiles: null, otherPartnerEconomy: 22500 },
];

const NORTH_AMERICA_ATLANTIC: Band[] = [
  { maxMiles: 4000, otherPartnerEconomy: 32500 },
  { maxMiles: 6000, otherPartnerEconomy: 42500 },
  { maxMiles: 8000, otherPartnerEconomy: 60000 },
  { maxMiles: null, otherPartnerEconomy: 75000 },
];

const NORTH_AMERICA_PACIFIC: Band[] = [
  { maxMiles: 5000, otherPartnerEconomy: 32500 },
  { maxMiles: 7500, otherPartnerEconomy: 50000 },
  { maxMiles: 11000, otherPartnerEconomy: 65000 },
  { maxMiles: null, otherPartnerEconomy: 70000 },
];

const NORTH_AMERICA_SOUTH_AMERICA: Band[] = [
  { maxMiles: 2500, otherPartnerEconomy: 20000 },
];

export type AeroplanEstimateInput = {
  originZone?: AeroplanZone | null;
  destinationZone?: AeroplanZone | null;
  distanceMiles?: number | null;
  cabin?: AeroplanCabin;
  operator?: AeroplanOperatorClass | null;
  operatingIata?: string | null;
};

export type AeroplanEstimate =
  | {
    status: "conditional";
    oneWayPoints: number;
    fees: "unknown";
    operator: "other-partner-fixed";
    zonePair: string;
    note: string;
    researchUrl: string;
  }
  | {
    status: "unknown";
    reason: string;
    researchUrl: string;
  };

function zonePair(a: AeroplanZone, b: AeroplanZone) {
  if (a === b) return `${a} within`;
  return [a, b].sort().join(" / ");
}

function bandsFor(origin: AeroplanZone, destination: AeroplanZone): Band[] | null {
  if (origin === "North America" && destination === "North America") return WITHIN_NORTH_AMERICA;
  if (origin === "North America" && destination === "Atlantic") return NORTH_AMERICA_ATLANTIC;
  if (destination === "North America" && origin === "Atlantic") return NORTH_AMERICA_ATLANTIC;
  if (origin === "North America" && destination === "Pacific") return NORTH_AMERICA_PACIFIC;
  if (destination === "North America" && origin === "Pacific") return NORTH_AMERICA_PACIFIC;
  if (origin === "North America" && destination === "South America") return NORTH_AMERICA_SOUTH_AMERICA;
  if (destination === "North America" && origin === "South America") return NORTH_AMERICA_SOUTH_AMERICA;
  return null;
}

function pointsForDistance(bands: Band[], distanceMiles: number) {
  const band = bands.find((entry) => entry.maxMiles === null || distanceMiles <= entry.maxMiles);
  return band?.otherPartnerEconomy ?? null;
}

export function classifyAeroplanOperator(operatingIata: string | null | undefined): AeroplanOperatorClass | null {
  if (!operatingIata) return null;
  const code = operatingIata.toUpperCase();
  if ((AEROPLAN_SELECT_DYNAMIC_IATA as readonly string[]).includes(code)) return "air-canada-or-select-dynamic";
  if ((AEROPLAN_OTHER_PARTNER_FIXED_IATA as readonly string[]).includes(code)) return "other-partner-fixed";
  return null;
}

export function estimateAeroplanAward(input: AeroplanEstimateInput): AeroplanEstimate {
  const cabin = input.cabin ?? "economy";
  if (cabin !== "economy") {
    return { status: "unknown", reason: "Only published economy other-partner amounts are encoded.", researchUrl: AEROPLAN_CHART_URL };
  }

  const operator = input.operator ?? classifyAeroplanOperator(input.operatingIata);
  if (!operator) {
    return { status: "unknown", reason: "Operator is missing, unverified, or not a confirmed Aeroplan partner, so the chart is not applied.", researchUrl: AEROPLAN_CHART_URL };
  }
  if (operator === "air-canada-or-select-dynamic") {
    return { status: "unknown", reason: "Air Canada and select partners (including United) use starting-at/dynamic amounts. Other-partner figures are not a floor for those carriers.", researchUrl: AEROPLAN_CHART_URL };
  }

  if (!input.originZone || !input.destinationZone) {
    return { status: "unknown", reason: "Origin and destination Aeroplan zones are required.", researchUrl: AEROPLAN_CHART_URL };
  }
  if (input.distanceMiles == null || !Number.isFinite(input.distanceMiles) || input.distanceMiles <= 0) {
    return { status: "unknown", reason: "Flown distance is required by the published chart and is not in this fare payload.", researchUrl: AEROPLAN_CHART_URL };
  }

  const bands = bandsFor(input.originZone, input.destinationZone);
  if (!bands) {
    return { status: "unknown", reason: "This zone pair is not encoded from the June 2026 chart.", researchUrl: AEROPLAN_CHART_URL };
  }

  const oneWayPoints = pointsForDistance(bands, input.distanceMiles);
  if (oneWayPoints === null) {
    return { status: "unknown", reason: "Distance did not match a published economy band.", researchUrl: AEROPLAN_CHART_URL };
  }

  return {
    status: "conditional",
    oneWayPoints,
    fees: "unknown",
    operator: "other-partner-fixed",
    zonePair: zonePair(input.originZone, input.destinationZone),
    note: "Published other-partner economy amount if saver inventory exists. Taxes, the CAD39 partner booking fee, and seats are not confirmed.",
    researchUrl: AEROPLAN_CHART_URL,
  };
}

export const AEROPLAN_AIRPORT_ZONES: Record<string, AeroplanZone> = {
  DFW: "North America",
  DAL: "North America",
  SJC: "North America",
  SFO: "North America",
  SAN: "North America",
  CRK: "Pacific",
  XIY: "Pacific",
  XUZ: "Pacific",
};
