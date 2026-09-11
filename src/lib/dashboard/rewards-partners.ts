import {
  AEROPLAN_OTHER_PARTNER_FIXED_IATA,
} from "./aeroplan-chart";

export const PARTNER_MAP_REVIEWED_AT = "2026-09-11";

export type Issuer = "Chase" | "Amex";

export type TransferRatio =
  | { fromPoints: number; toMiles: number; sourceUrl: string }
  | { fromPoints: null; toMiles: null; sourceUrl: string; note: string };

export type TransferFee =
  | { kind: "none-published"; note: string }
  | { kind: "amex-us-airline-excise"; perPointUsd: number; capUsd: number; sourceUrl: string };

export type AwardChartKind = "none-published" | "aeroplan-june-2026" | "dynamic-or-unpublished";

export type BookableAirline = {
  iata: string;
  relationship: "own-metal" | "published-partner";
  sourceUrl: string;
  reviewedAt: string;
};

export type TransferPartner = {
  id: string;
  issuer: Issuer;
  programName: string;
  bookableAirlines: BookableAirline[];
  transferRatio: TransferRatio;
  increment: number | null;
  incrementSourceUrl: string | null;
  transferFee: TransferFee;
  awardChart: AwardChartKind;
  researchUrl: string;
  transferSourceUrl: string;
  reviewedAt: string;
};

const CHASE_TRANSFER_SOURCE = "https://www.chase.com/personal/credit-cards/education/basics/how-to-transfer-chase-ultimate-rewards-points";
const AMEX_PARTNER_SOURCE = "https://www.americanexpress.com/us/rewards/membership-rewards/redeem/airline-partners/airline.html?a=delta";
const AMEX_TERMS_SOURCE = "https://www.americanexpress.com/content/dam/amex/us/rewards/membership-rewards/mr-terms-conditions-april-2026.pdf";
const AEROPLAN_CHART = "https://www.aircanada.com/content/dam/aircanada/loyalty-content/documents/flight-rewards-chart-june2026-en.pdf";
const AEROPLAN_REDEEM = "https://www.aircanada.com/ca/en/aco/home/aeroplan/redeem/air-canada.html";
const AEROPLAN_CONVERSION_SOURCE = "https://www.aircanada.com/us/en/aco/home/aeroplan/your-aeroplan/conversion-programs.html";
const BA_PARTNERS = "https://www.britishairways.com/content/information/partners-and-alliances";
const UNITED_MILEAGEPLUS = "https://www.united.com/en/us/fly/mileageplus.html";

export const CHASE_TRAVEL_URL = "https://www.chasetravel.com";
export const AMEX_TRAVEL_URL = "https://www.americanexpress.com/en-us/travel";

export const AMEX_EXCISE_PER_POINT_USD = 0.0006;
export const AMEX_EXCISE_CAP_USD = 99;

export const AMEX_US_AIRLINE_EXCISE: TransferFee = {
  kind: "amex-us-airline-excise",
  perPointUsd: AMEX_EXCISE_PER_POINT_USD,
  capUsd: AMEX_EXCISE_CAP_USD,
  sourceUrl: AMEX_TERMS_SOURCE,
};

const CHASE_FEE: TransferFee = {
  kind: "none-published",
  note: "Chase may disclose a transfer fee before you confirm; no published per-point airline transfer fee.",
};

const chaseUnknownRatio: TransferRatio = {
  fromPoints: null,
  toMiles: null,
  sourceUrl: CHASE_TRANSFER_SOURCE,
  note: "Chase lists Sapphire Reserve as transfer-eligible and publishes 1,000-point increments, but the cited issuer pages do not state a Sapphire Reserve airline transfer ratio. Sapphire Preferred 1:1 is not used as proof. The Air Canada conversion-page 1:1 applies only to Aeroplan, not to other Chase airline programs.",
};

const amexUnknownRatio: TransferRatio = {
  fromPoints: null,
  toMiles: null,
  sourceUrl: AMEX_TERMS_SOURCE,
  note: "Amex says the transfer rate varies by partner. Confirm in the Membership Rewards transfer UI. Only US Membership Rewards → Aeroplan has a published 1:1 on Air Canada's conversion page; other Amex airline ratios are not encoded.",
};

/** US Ultimate Rewards → Aeroplan only. Not a universal Chase airline rate. */
const chaseAeroplanRatio: TransferRatio = {
  fromPoints: 1,
  toMiles: 1,
  sourceUrl: AEROPLAN_CONVERSION_SOURCE,
};

/** US Membership Rewards → Aeroplan only. Not a universal Amex airline rate. */
const amexAeroplanRatio: TransferRatio = {
  fromPoints: 1,
  toMiles: 1,
  sourceUrl: AEROPLAN_CONVERSION_SOURCE,
};

function own(iata: string, sourceUrl: string): BookableAirline {
  return { iata, relationship: "own-metal", sourceUrl, reviewedAt: PARTNER_MAP_REVIEWED_AT };
}

function partner(iata: string, sourceUrl: string): BookableAirline {
  return { iata, relationship: "published-partner", sourceUrl, reviewedAt: PARTNER_MAP_REVIEWED_AT };
}

function aeroplanBookable(): BookableAirline[] {
  return [
    own("AC", AEROPLAN_REDEEM),
    partner("UA", AEROPLAN_CHART),
    partner("EK", AEROPLAN_CHART),
    partner("FZ", AEROPLAN_CHART),
    partner("EY", AEROPLAN_CHART),
    ...AEROPLAN_OTHER_PARTNER_FIXED_IATA.map((iata) => partner(iata, AEROPLAN_REDEEM)),
  ];
}

export const TRANSFER_PARTNERS: TransferPartner[] = [
  {
    id: "chase-united",
    issuer: "Chase",
    programName: "United MileagePlus",
    bookableAirlines: [own("UA", UNITED_MILEAGEPLUS)],
    transferRatio: chaseUnknownRatio,
    increment: 1000,
    incrementSourceUrl: CHASE_TRANSFER_SOURCE,
    transferFee: CHASE_FEE,
    awardChart: "dynamic-or-unpublished",
    researchUrl: UNITED_MILEAGEPLUS,
    transferSourceUrl: CHASE_TRANSFER_SOURCE,
    reviewedAt: PARTNER_MAP_REVIEWED_AT,
  },
  {
    id: "chase-aeroplan",
    issuer: "Chase",
    programName: "Air Canada Aeroplan",
    bookableAirlines: aeroplanBookable(),
    transferRatio: chaseAeroplanRatio,
    increment: 1000,
    incrementSourceUrl: AEROPLAN_CONVERSION_SOURCE,
    transferFee: CHASE_FEE,
    awardChart: "aeroplan-june-2026",
    researchUrl: AEROPLAN_CHART,
    transferSourceUrl: CHASE_TRANSFER_SOURCE,
    reviewedAt: PARTNER_MAP_REVIEWED_AT,
  },
  {
    id: "chase-flying-blue",
    issuer: "Chase",
    programName: "Air France-KLM Flying Blue",
    bookableAirlines: [
      own("AF", "https://www.flyingblue.com/en/earn-and-use/use/flights"),
      own("KL", "https://www.flyingblue.com/en/earn-and-use/use/flights"),
    ],
    transferRatio: chaseUnknownRatio,
    increment: 1000,
    incrementSourceUrl: CHASE_TRANSFER_SOURCE,
    transferFee: CHASE_FEE,
    awardChart: "dynamic-or-unpublished",
    researchUrl: "https://www.flyingblue.com/en/earn-and-use/use/flights",
    transferSourceUrl: CHASE_TRANSFER_SOURCE,
    reviewedAt: PARTNER_MAP_REVIEWED_AT,
  },
  {
    id: "chase-british-airways",
    issuer: "Chase",
    programName: "British Airways Club",
    bookableAirlines: [
      own("BA", BA_PARTNERS),
      partner("AA", BA_PARTNERS),
    ],
    transferRatio: chaseUnknownRatio,
    increment: 1000,
    incrementSourceUrl: CHASE_TRANSFER_SOURCE,
    transferFee: CHASE_FEE,
    awardChart: "dynamic-or-unpublished",
    researchUrl: BA_PARTNERS,
    transferSourceUrl: CHASE_TRANSFER_SOURCE,
    reviewedAt: PARTNER_MAP_REVIEWED_AT,
  },
  {
    id: "chase-iberia",
    issuer: "Chase",
    programName: "Iberia Club",
    bookableAirlines: [own("IB", CHASE_TRANSFER_SOURCE)],
    transferRatio: chaseUnknownRatio,
    increment: 1000,
    incrementSourceUrl: CHASE_TRANSFER_SOURCE,
    transferFee: CHASE_FEE,
    awardChart: "dynamic-or-unpublished",
    researchUrl: "https://www.iberia.com/us/iberia-club/",
    transferSourceUrl: CHASE_TRANSFER_SOURCE,
    reviewedAt: PARTNER_MAP_REVIEWED_AT,
  },
  {
    id: "chase-aer-lingus",
    issuer: "Chase",
    programName: "Aer Lingus AerClub",
    bookableAirlines: [own("EI", "https://www.aerlingus.com/plan/aerclub/")],
    transferRatio: chaseUnknownRatio,
    increment: 1000,
    incrementSourceUrl: CHASE_TRANSFER_SOURCE,
    transferFee: CHASE_FEE,
    awardChart: "dynamic-or-unpublished",
    researchUrl: "https://www.aerlingus.com/plan/aerclub/",
    transferSourceUrl: CHASE_TRANSFER_SOURCE,
    reviewedAt: PARTNER_MAP_REVIEWED_AT,
  },
  {
    id: "chase-jetblue",
    issuer: "Chase",
    programName: "JetBlue TrueBlue",
    bookableAirlines: [own("B6", "https://trueblue.jetblue.com/")],
    transferRatio: chaseUnknownRatio,
    increment: 1000,
    incrementSourceUrl: CHASE_TRANSFER_SOURCE,
    transferFee: CHASE_FEE,
    awardChart: "dynamic-or-unpublished",
    researchUrl: "https://trueblue.jetblue.com/",
    transferSourceUrl: CHASE_TRANSFER_SOURCE,
    reviewedAt: PARTNER_MAP_REVIEWED_AT,
  },
  {
    id: "chase-southwest",
    issuer: "Chase",
    programName: "Southwest Rapid Rewards",
    bookableAirlines: [own("WN", "https://www.southwest.com/rapid-rewards/")],
    transferRatio: chaseUnknownRatio,
    increment: 1000,
    incrementSourceUrl: CHASE_TRANSFER_SOURCE,
    transferFee: CHASE_FEE,
    awardChart: "dynamic-or-unpublished",
    researchUrl: "https://www.southwest.com/rapid-rewards/",
    transferSourceUrl: CHASE_TRANSFER_SOURCE,
    reviewedAt: PARTNER_MAP_REVIEWED_AT,
  },
  {
    id: "chase-singapore",
    issuer: "Chase",
    programName: "Singapore Airlines KrisFlyer",
    bookableAirlines: [own("SQ", "https://www.singaporeair.com/en_UK/ppsclub-krisflyer/")],
    transferRatio: chaseUnknownRatio,
    increment: 1000,
    incrementSourceUrl: CHASE_TRANSFER_SOURCE,
    transferFee: CHASE_FEE,
    awardChart: "dynamic-or-unpublished",
    researchUrl: "https://www.singaporeair.com/en_UK/ppsclub-krisflyer/",
    transferSourceUrl: CHASE_TRANSFER_SOURCE,
    reviewedAt: PARTNER_MAP_REVIEWED_AT,
  },
  {
    id: "chase-virgin-atlantic",
    issuer: "Chase",
    programName: "Virgin Atlantic Flying Club",
    bookableAirlines: [own("VS", "https://flywith.virginatlantic.com/gb/en/frequent-flyer/spend-miles.html")],
    transferRatio: chaseUnknownRatio,
    increment: 1000,
    incrementSourceUrl: CHASE_TRANSFER_SOURCE,
    transferFee: CHASE_FEE,
    awardChart: "dynamic-or-unpublished",
    researchUrl: "https://flywith.virginatlantic.com/gb/en/frequent-flyer/spend-miles.html",
    transferSourceUrl: CHASE_TRANSFER_SOURCE,
    reviewedAt: PARTNER_MAP_REVIEWED_AT,
  },
  {
    id: "amex-delta",
    issuer: "Amex",
    programName: "Delta SkyMiles",
    bookableAirlines: [own("DL", "https://www.delta.com/us/en/skymiles")],
    transferRatio: amexUnknownRatio,
    increment: null,
    incrementSourceUrl: null,
    transferFee: AMEX_US_AIRLINE_EXCISE,
    awardChart: "dynamic-or-unpublished",
    researchUrl: "https://www.delta.com/us/en/skymiles/how-to-use-miles/airline-partners",
    transferSourceUrl: AMEX_PARTNER_SOURCE,
    reviewedAt: PARTNER_MAP_REVIEWED_AT,
  },
  {
    id: "amex-jetblue",
    issuer: "Amex",
    programName: "JetBlue TrueBlue",
    bookableAirlines: [own("B6", "https://trueblue.jetblue.com/")],
    transferRatio: amexUnknownRatio,
    increment: null,
    incrementSourceUrl: null,
    transferFee: AMEX_US_AIRLINE_EXCISE,
    awardChart: "dynamic-or-unpublished",
    researchUrl: "https://trueblue.jetblue.com/",
    transferSourceUrl: AMEX_PARTNER_SOURCE,
    reviewedAt: PARTNER_MAP_REVIEWED_AT,
  },
  {
    id: "amex-aeroplan",
    issuer: "Amex",
    programName: "Air Canada Aeroplan",
    bookableAirlines: aeroplanBookable(),
    transferRatio: amexAeroplanRatio,
    increment: 1000,
    incrementSourceUrl: AEROPLAN_CONVERSION_SOURCE,
    transferFee: { kind: "none-published", note: "Non-U.S. airline program; Amex US airline excise does not apply." },
    awardChart: "aeroplan-june-2026",
    researchUrl: AEROPLAN_CHART,
    transferSourceUrl: AMEX_PARTNER_SOURCE,
    reviewedAt: PARTNER_MAP_REVIEWED_AT,
  },
  {
    id: "amex-flying-blue",
    issuer: "Amex",
    programName: "Air France-KLM Flying Blue",
    bookableAirlines: [
      own("AF", "https://www.flyingblue.com/en/earn-and-use/use/flights"),
      own("KL", "https://www.flyingblue.com/en/earn-and-use/use/flights"),
    ],
    transferRatio: amexUnknownRatio,
    increment: null,
    incrementSourceUrl: null,
    transferFee: { kind: "none-published", note: "Non-U.S. airline program; Amex US airline excise does not apply." },
    awardChart: "dynamic-or-unpublished",
    researchUrl: "https://www.flyingblue.com/en/earn-and-use/use/flights",
    transferSourceUrl: AMEX_PARTNER_SOURCE,
    reviewedAt: PARTNER_MAP_REVIEWED_AT,
  },
  {
    id: "amex-ana",
    issuer: "Amex",
    programName: "ANA Mileage Club",
    bookableAirlines: [own("NH", AMEX_PARTNER_SOURCE)],
    transferRatio: amexUnknownRatio,
    increment: null,
    incrementSourceUrl: null,
    transferFee: { kind: "none-published", note: "Non-U.S. airline program; Amex US airline excise does not apply." },
    awardChart: "dynamic-or-unpublished",
    researchUrl: "https://www.ana.co.jp/en/us/amc/",
    transferSourceUrl: AMEX_PARTNER_SOURCE,
    reviewedAt: PARTNER_MAP_REVIEWED_AT,
  },
  {
    id: "amex-avianca",
    issuer: "Amex",
    programName: "Avianca LifeMiles",
    bookableAirlines: [own("AV", AMEX_PARTNER_SOURCE)],
    transferRatio: amexUnknownRatio,
    increment: null,
    incrementSourceUrl: null,
    transferFee: { kind: "none-published", note: "Non-U.S. airline program; Amex US airline excise does not apply." },
    awardChart: "dynamic-or-unpublished",
    researchUrl: "https://www.lifemiles.com/",
    transferSourceUrl: AMEX_PARTNER_SOURCE,
    reviewedAt: PARTNER_MAP_REVIEWED_AT,
  },
  {
    id: "amex-british-airways",
    issuer: "Amex",
    programName: "British Airways Club",
    bookableAirlines: [
      own("BA", BA_PARTNERS),
      partner("AA", BA_PARTNERS),
    ],
    transferRatio: amexUnknownRatio,
    increment: null,
    incrementSourceUrl: null,
    transferFee: { kind: "none-published", note: "Non-U.S. airline program; Amex US airline excise does not apply." },
    awardChart: "dynamic-or-unpublished",
    researchUrl: BA_PARTNERS,
    transferSourceUrl: AMEX_PARTNER_SOURCE,
    reviewedAt: PARTNER_MAP_REVIEWED_AT,
  },
  {
    id: "amex-iberia",
    issuer: "Amex",
    programName: "Iberia Club",
    bookableAirlines: [own("IB", AMEX_PARTNER_SOURCE)],
    transferRatio: amexUnknownRatio,
    increment: null,
    incrementSourceUrl: null,
    transferFee: { kind: "none-published", note: "Non-U.S. airline program; Amex US airline excise does not apply." },
    awardChart: "dynamic-or-unpublished",
    researchUrl: "https://www.iberia.com/us/iberia-club/",
    transferSourceUrl: AMEX_PARTNER_SOURCE,
    reviewedAt: PARTNER_MAP_REVIEWED_AT,
  },
  {
    id: "amex-aer-lingus",
    issuer: "Amex",
    programName: "Aer Lingus AerClub",
    bookableAirlines: [own("EI", AMEX_PARTNER_SOURCE)],
    transferRatio: amexUnknownRatio,
    increment: null,
    incrementSourceUrl: null,
    transferFee: { kind: "none-published", note: "Non-U.S. airline program; Amex US airline excise does not apply." },
    awardChart: "dynamic-or-unpublished",
    researchUrl: "https://www.aerlingus.com/plan/aerclub/",
    transferSourceUrl: AMEX_PARTNER_SOURCE,
    reviewedAt: PARTNER_MAP_REVIEWED_AT,
  },
  {
    id: "amex-cathay",
    issuer: "Amex",
    programName: "Cathay Pacific Asia Miles",
    bookableAirlines: [own("CX", AMEX_PARTNER_SOURCE)],
    transferRatio: amexUnknownRatio,
    increment: null,
    incrementSourceUrl: null,
    transferFee: { kind: "none-published", note: "Non-U.S. airline program; Amex US airline excise does not apply." },
    awardChart: "dynamic-or-unpublished",
    researchUrl: "https://www.cathaypacific.com/cx/en_US/membership/asia-miles.html",
    transferSourceUrl: AMEX_PARTNER_SOURCE,
    reviewedAt: PARTNER_MAP_REVIEWED_AT,
  },
  {
    id: "amex-qantas",
    issuer: "Amex",
    programName: "Qantas Frequent Flyer",
    bookableAirlines: [own("QF", AMEX_PARTNER_SOURCE)],
    transferRatio: amexUnknownRatio,
    increment: null,
    incrementSourceUrl: null,
    transferFee: { kind: "none-published", note: "Non-U.S. airline program; Amex US airline excise does not apply." },
    awardChart: "dynamic-or-unpublished",
    researchUrl: "https://www.qantas.com/us/en/frequent-flyer.html",
    transferSourceUrl: AMEX_PARTNER_SOURCE,
    reviewedAt: PARTNER_MAP_REVIEWED_AT,
  },
  {
    id: "amex-singapore",
    issuer: "Amex",
    programName: "Singapore Airlines KrisFlyer",
    bookableAirlines: [own("SQ", AMEX_PARTNER_SOURCE)],
    transferRatio: amexUnknownRatio,
    increment: null,
    incrementSourceUrl: null,
    transferFee: { kind: "none-published", note: "Non-U.S. airline program; Amex US airline excise does not apply." },
    awardChart: "dynamic-or-unpublished",
    researchUrl: "https://www.singaporeair.com/en_UK/ppsclub-krisflyer/",
    transferSourceUrl: AMEX_PARTNER_SOURCE,
    reviewedAt: PARTNER_MAP_REVIEWED_AT,
  },
  {
    id: "amex-virgin-atlantic",
    issuer: "Amex",
    programName: "Virgin Atlantic Flying Club",
    bookableAirlines: [own("VS", AMEX_PARTNER_SOURCE)],
    transferRatio: amexUnknownRatio,
    increment: null,
    incrementSourceUrl: null,
    transferFee: { kind: "none-published", note: "Non-U.S. airline program; Amex US airline excise does not apply." },
    awardChart: "dynamic-or-unpublished",
    researchUrl: "https://flywith.virginatlantic.com/gb/en/frequent-flyer/spend-miles.html",
    transferSourceUrl: AMEX_PARTNER_SOURCE,
    reviewedAt: PARTNER_MAP_REVIEWED_AT,
  },
  {
    id: "amex-emirates",
    issuer: "Amex",
    programName: "Emirates Skywards",
    bookableAirlines: [own("EK", AMEX_PARTNER_SOURCE)],
    transferRatio: amexUnknownRatio,
    increment: null,
    incrementSourceUrl: null,
    transferFee: { kind: "none-published", note: "Non-U.S. airline program; Amex US airline excise does not apply." },
    awardChart: "dynamic-or-unpublished",
    researchUrl: "https://www.emirates.com/us/english/skywards/",
    transferSourceUrl: AMEX_PARTNER_SOURCE,
    reviewedAt: PARTNER_MAP_REVIEWED_AT,
  },
  {
    id: "amex-aeromexico",
    issuer: "Amex",
    programName: "Aeromexico Rewards",
    bookableAirlines: [own("AM", AMEX_PARTNER_SOURCE)],
    transferRatio: amexUnknownRatio,
    increment: null,
    incrementSourceUrl: null,
    transferFee: { kind: "none-published", note: "Non-U.S. airline program; Amex US airline excise does not apply." },
    awardChart: "dynamic-or-unpublished",
    researchUrl: "https://www.aeromexico.com/en-us/aeromexico-rewards",
    transferSourceUrl: AMEX_PARTNER_SOURCE,
    reviewedAt: PARTNER_MAP_REVIEWED_AT,
  },
];

export const EXCLUDED_EXPIRED_PARTNERS = [
  {
    programName: "Etihad Guest",
    ended: "2026-06-30",
    sourceUrl: "https://www.americanexpress.com/us/rewards/membership-rewards/redeem/airline-partners/airline.html?a=etihad",
    note: "Amex US transfers ended 30 June 2026. Not used for recommendations.",
  },
  {
    programName: "HawaiianMiles",
    ended: "2025-06-30",
    sourceUrl: "https://www.americanexpress.com/content/dam/amex/us/rewards/membership-rewards/mr-updates-final-july-2025.pdf",
    note: "Amex US transfers to HawaiianMiles ended 30 June 2025. Not used for recommendations.",
  },
] as const;

export const PARTNER_SOURCES = {
  chaseTransfer: CHASE_TRANSFER_SOURCE,
  amexPartners: AMEX_PARTNER_SOURCE,
  amexTerms: AMEX_TERMS_SOURCE,
  aeroplanChart: AEROPLAN_CHART,
  aeroplanConversion: AEROPLAN_CONVERSION_SOURCE,
  chaseTravel: CHASE_TRAVEL_URL,
  amexTravel: AMEX_TRAVEL_URL,
} as const;

export type TransferPath = {
  partner: TransferPartner;
  reportedCarrier: string;
  relationship: BookableAirline["relationship"];
  bookingSourceUrl: string;
  itineraryWide: boolean;
};

export function bookableIatas(partner: TransferPartner) {
  return partner.bookableAirlines.map((airline) => airline.iata);
}

export function transferPathsForReportedCarrier(iata: string, itineraryWide: boolean): TransferPath[] {
  const code = iata.toUpperCase();
  return TRANSFER_PARTNERS.flatMap((partnerEntry) => {
    const match = partnerEntry.bookableAirlines.find((airline) => airline.iata === code);
    if (!match) return [];
    return [{
      partner: partnerEntry,
      reportedCarrier: code,
      relationship: match.relationship,
      bookingSourceUrl: match.sourceUrl,
      itineraryWide,
    }];
  });
}

export function pointsNeededForMiles(miles: number, ratio: TransferRatio, increment: number | null) {
  if (ratio.fromPoints === null || ratio.toMiles === null || ratio.toMiles <= 0) return null;
  if (!Number.isFinite(miles) || miles < 0) return null;
  const raw = miles * ratio.fromPoints / ratio.toMiles;
  if (increment === null || increment <= 0) return Math.ceil(raw);
  return Math.ceil(raw / increment) * increment;
}

export function amexUsAirlineTransferFeeUsd(points: number) {
  if (!Number.isFinite(points) || points < 0) return null;
  const raw = points * AMEX_EXCISE_PER_POINT_USD;
  return Math.min(AMEX_EXCISE_CAP_USD, Math.round(raw * 100) / 100);
}
