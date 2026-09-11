import { reportedIataForLookup } from "./airline-identity";
import { AEROPLAN_AIRPORT_ZONES, estimateAeroplanAward } from "./aeroplan-chart";
import type { FlightAirlineIdentity } from "./types";
import {
  AMEX_EXCISE_CAP_USD,
  AMEX_EXCISE_PER_POINT_USD,
  AMEX_TRAVEL_URL,
  CHASE_TRAVEL_URL,
  amexUsAirlineTransferFeeUsd,
  pointsNeededForMiles,
  transferPathsForReportedCarrier,
  type TransferPath,
} from "./rewards-partners";

export const CSR_DIRECT_EARN = 4;
export const CSR_CHASE_TRAVEL_EARN = 8;
export const CHASE_TRAVEL_REDEMPTION_CENTS = 1;
export const CHASE_POINTS_BOOST_MAX_CENTS = 2;
export const BBP_ELIGIBLE_EARN = 2;
export const BBP_AFTER_CAP_EARN = 1;
export const AMEX_TRAVEL_FLIGHT_REDEMPTION_CENTS = 1;
export const AMEX_PAY_WITH_POINTS_MINIMUM = 5000;
export const CSR_ANNUAL_TRAVEL_CREDIT_USD = 300;

export const FALLBACK_HEADLINE = "Estimated: pay through Chase Travel if the same fare and conditions are available—earn 8x; otherwise book direct for 4x.";

export type CashAmount = number | null | undefined;

export type PurchaseRecommendationInput = {
  cashAmount: CashAmount;
  tripType: "one-way" | "round-trip";
  origin?: string | null;
  destination?: string | null;
  airlineIdentity?: FlightAirlineIdentity;
  identityMissingFromCache?: boolean;
  distanceMiles?: number | null;
};

export type EarnLine = {
  channel: string;
  pointsIfEligibleCash: number | null;
  unit: "Chase" | "Amex";
  note: string;
};

export type AwardLine = {
  programName: string;
  issuer: "Chase" | "Amex";
  status: "conditional" | "unknown";
  points: number | null;
  fees: "unknown";
  note: string;
  researchUrl: string;
};

export type PayWithPointsNote = {
  status: "unavailable-under-minimum" | "conditional" | "unknown";
  points: number | null;
  text: string;
};

export type PurchaseRecommendation = {
  kind: "policy-fallback";
  headline: string;
  verifiedComparison: false;
  cashPrice: number | null;
  pointsSpent: "none-for-cash" | "unknown";
  fees: "unknown";
  earn: EarnLine[];
  transferPaths: TransferPath[];
  awards: AwardLine[];
  payWithPoints: PayWithPointsNote;
  identityNote: string;
  portalLinks: { chaseTravel: string; amexTravel: string };
  disclosures: string[];
};

function isValidAmount(value: CashAmount): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export function chasePointsEarned(cashChargedUsd: number, rate: number) {
  if (!isValidAmount(cashChargedUsd) || !Number.isFinite(rate) || rate < 0) return null;
  return Math.floor(cashChargedUsd * rate);
}

export function earnOnSplitPurchase(args: {
  cashChargedUsd: number;
  pointsCoveredUsd: number;
  rate: number;
}) {
  if (!isValidAmount(args.cashChargedUsd) || !isValidAmount(args.pointsCoveredUsd) || args.rate < 0) return null;
  return chasePointsEarned(args.cashChargedUsd, args.rate);
}

export function portalPointsAtPublishedCentRate(cashUsd: number, centsPerPoint: number) {
  if (!isValidAmount(cashUsd) || centsPerPoint <= 0) return null;
  return Math.ceil(cashUsd * 100 / centsPerPoint);
}

export function amexPayWithPoints(cashUsd: number | null): PayWithPointsNote {
  if (cashUsd === null) {
    return { status: "unknown", points: null, text: "Amex Travel Pay with Points spend is unknown without a cash price." };
  }
  const farePoints = portalPointsAtPublishedCentRate(cashUsd, AMEX_TRAVEL_FLIGHT_REDEMPTION_CENTS);
  if (farePoints === null) {
    return { status: "unknown", points: null, text: "Amex Travel Pay with Points spend is unknown." };
  }
  if (farePoints < AMEX_PAY_WITH_POINTS_MINIMUM) {
    return {
      status: "unavailable-under-minimum",
      points: null,
      text: `Full Pay with Points is unavailable under the 5,000-point minimum for this $${cashUsd.toLocaleString()} cash fare. That is not an instruction to redeem 5,000 points against a cheaper ticket.`,
    };
  }
  return {
    status: "conditional",
    points: farePoints,
    text: `If this fare is offered on Amex Travel, Pay with Points would spend ${farePoints.toLocaleString()} Amex points at the published 1¢ flight rate (5,000-point minimum is met). Points-covered amounts earn no card points.`,
  };
}

function identityNote(input: PurchaseRecommendationInput) {
  if (input.identityMissingFromCache || input.airlineIdentity === undefined) {
    return "Airline identity is missing on this cached card. The estimate does not assume a carrier until the fare is refreshed.";
  }
  if (input.airlineIdentity.kind === "unknown") {
    return "The fare response did not include a usable operating/marketing carrier.";
  }
  if (input.airlineIdentity.kind === "mixed") {
    return "Carrier identity is mixed or incomplete. Marketing codes do not prove the operator, and no itinerary-wide transfer path is asserted.";
  }
  const segment = input.airlineIdentity.segments.find((entry) => entry.iata || entry.name);
  const label = [segment?.name, segment?.iata].filter(Boolean).join(" ");
  const operator = segment?.operatorStatus === "verified-operating"
    ? "reported as the operating carrier"
    : segment?.operatorStatus === "codeshare-unverified"
      ? "reported as marketing with codeshare/operator evidence that is not a verified operator match"
      : "reported marketing carrier, not a verified operator";
  return `${label || "Named carrier"} is ${operator}. Verify operator and award/portal inventory before booking.`;
}

function transferPathsForInput(input: PurchaseRecommendationInput): TransferPath[] {
  if (input.airlineIdentity === undefined) return [];
  const iata = reportedIataForLookup(input.airlineIdentity);
  if (!iata) return [];
  return transferPathsForReportedCarrier(iata, input.airlineIdentity.kind === "single");
}

function awardLines(input: PurchaseRecommendationInput, paths: TransferPath[]): AwardLine[] {
  const iata = reportedIataForLookup(input.airlineIdentity);
  return paths.map((path) => {
    if (path.partner.awardChart !== "aeroplan-june-2026") {
      return {
        programName: path.partner.programName,
        issuer: path.partner.issuer,
        status: "unknown" as const,
        points: null,
        fees: "unknown" as const,
        note: "No applicable published chart for this itinerary; award cost is unknown. This is a possible partner path for the reported carrier, not confirmed inventory.",
        researchUrl: path.partner.researchUrl,
      };
    }

    const estimate = estimateAeroplanAward({
      originZone: input.origin ? AEROPLAN_AIRPORT_ZONES[input.origin] : undefined,
      destinationZone: input.destination ? AEROPLAN_AIRPORT_ZONES[input.destination] : undefined,
      distanceMiles: input.distanceMiles,
      operatingIata: iata,
    });

    if (estimate.status === "unknown") {
      return {
        programName: path.partner.programName,
        issuer: path.partner.issuer,
        status: "unknown" as const,
        points: null,
        fees: "unknown" as const,
        note: estimate.reason,
        researchUrl: estimate.researchUrl,
      };
    }

    const roundTripPoints = input.tripType === "round-trip" ? estimate.oneWayPoints * 2 : estimate.oneWayPoints;
    return {
      programName: path.partner.programName,
      issuer: path.partner.issuer,
      status: "conditional" as const,
      points: roundTripPoints,
      fees: "unknown" as const,
      note: `${estimate.note} ${input.tripType === "round-trip" ? "Round-trip shown as two published one-ways if both exist." : "One-way chart amount."}`,
      researchUrl: estimate.researchUrl,
    };
  });
}

export function recommendPurchaseMethod(input: PurchaseRecommendationInput): PurchaseRecommendation {
  const cashPrice = isValidAmount(input.cashAmount) ? input.cashAmount : null;
  const transferPaths = transferPathsForInput(input);
  const chaseDirect = cashPrice === null ? null : chasePointsEarned(cashPrice, CSR_DIRECT_EARN);
  const chasePortal = cashPrice === null ? null : chasePointsEarned(cashPrice, CSR_CHASE_TRAVEL_EARN);
  const amex2x = cashPrice === null ? null : chasePointsEarned(cashPrice, BBP_ELIGIBLE_EARN);
  const amex1x = cashPrice === null ? null : chasePointsEarned(cashPrice, BBP_AFTER_CAP_EARN);
  const payWithPoints = amexPayWithPoints(cashPrice);

  const earn: EarnLine[] = [
    {
      channel: "Sapphire Reserve, airline direct",
      pointsIfEligibleCash: chaseDirect,
      unit: "Chase",
      note: "Conditional 4x only on eligible cash charged to the card. Purchases covered by the $300 annual travel credit earn 0; remaining credit is unknown. Points-covered amounts earn 0.",
    },
    {
      channel: "Sapphire Reserve, Chase Travel",
      pointsIfEligibleCash: chasePortal,
      unit: "Chase",
      note: "Conditional 8x only if this fare and conditions are actually offered in Chase Travel and the cash portion is eligible. Portal inventory is not verified. Travel-credit-covered and points-covered amounts earn 0.",
    },
    {
      channel: "Blue Business Plus, eligible purchase",
      pointsIfEligibleCash: amex2x,
      unit: "Amex",
      note: "Conditional 2x on the first $50,000 eligible purchases per calendar year, then 1x. Cap usage is unknown. Not stacked with Amex Travel 2x.",
    },
    {
      channel: "Blue Business Plus after $50k cap",
      pointsIfEligibleCash: amex1x,
      unit: "Amex",
      note: "Conditional 1x after the annual eligible-purchase cap, only on eligible cash charged.",
    },
    {
      channel: "Blue Business Plus, Amex Travel",
      pointsIfEligibleCash: amex2x,
      unit: "Amex",
      note: "Conditional 2x on eligible Amex Travel purchases under separate terms; does not count toward the $50,000 cap and does not stack. Portal inventory is not verified. Points-covered amounts earn 0.",
    },
    {
      channel: "Pay with points, cash remainder",
      pointsIfEligibleCash: 0,
      unit: "Chase",
      note: "Redeemed/points-covered portions earn no card points. Only remaining eligible cash can earn.",
    },
  ];

  const awards = awardLines(input, transferPaths);
  const amexFeeLines = transferPaths
    .filter((path) => path.partner.transferFee.kind === "amex-us-airline-excise")
    .map((path) => {
      const miles = awards.find((award) => award.programName === path.partner.programName)?.points;
      const points = miles === null || miles === undefined
        ? null
        : pointsNeededForMiles(miles, path.partner.transferRatio, path.partner.increment);
      if (points === null) {
        return `${path.partner.programName}: US airline excise is $0.0006 per transferred point, cap $99, but transferred points are unknown without a quote and ratio.`;
      }
      const fee = amexUsAirlineTransferFeeUsd(points);
      return `${path.partner.programName} US airline excise offset would be $${fee?.toFixed(2)} at ${points.toLocaleString()} transferred points.`;
    });

  const disclosures = [
    "This is a disclosed preserve-points / cash-earning fallback, not a verified comparison and not a claim that a portal carries this exact flight.",
    "Chase Travel standard redemption is 1 cent per point. Points Boost up to 2 cents applies only to specific offers; this fare is not assumed to have one. A 1.5 cents-per-point Chase Travel rate is not assumed.",
    "Amex Travel flights redeem at 1 cent per point with a 5,000-point minimum. Business Platinum rebate and Platinum 5x are not assumed.",
    "Chase Ultimate Rewards → Aeroplan is 1,000 UR = 1,000 Aeroplan, in 1,000-point increments, on Air Canada's US conversion page. That is not a universal Sapphire Reserve airline rate. Other Chase airline ratios remain unknown; Sapphire Preferred is not used as proof.",
    "Amex US Membership Rewards → Aeroplan is 1,000 MR = 1,000 Aeroplan, minimum and increment 1,000, on Air Canada's US conversion page. Other transfer ratios are not verified here and are excluded from numerical estimates.",
    "Transfer ratio is not a redemption value. Award charts are not confirmed seats. Unknown fees and prices stay unknown, never $0.",
    "Award vs Chase Travel at the published 1¢ rate is (cash alternative − award taxes/fees) × 100 Chase points. Award taxes/fees are unknown, so that threshold is unknown.",
    payWithPoints.text,
    `Amex US airline transfers: $${AMEX_EXCISE_PER_POINT_USD} per point, cap $${AMEX_EXCISE_CAP_USD}.`,
    ...amexFeeLines,
  ];

  return {
    kind: "policy-fallback",
    headline: FALLBACK_HEADLINE,
    verifiedComparison: false,
    cashPrice,
    pointsSpent: "none-for-cash",
    fees: "unknown",
    earn,
    transferPaths,
    awards,
    payWithPoints,
    identityNote: identityNote(input),
    portalLinks: { chaseTravel: CHASE_TRAVEL_URL, amexTravel: AMEX_TRAVEL_URL },
    disclosures,
  };
}
