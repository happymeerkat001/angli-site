import { expect, test } from "vitest";
import type { FlightAirlineIdentity } from "./types";
import {
  amexPayWithPoints,
  earnOnSplitPurchase,
  recommendPurchaseMethod,
} from "./purchase-recommendation";

const united: FlightAirlineIdentity = {
  kind: "single",
  segments: [{
    name: "United",
    iata: "UA",
    iataSource: "airline_code",
    operatingName: null,
    operatorStatus: "reported-marketing",
  }],
};

const mixed: FlightAirlineIdentity = {
  kind: "mixed",
  segments: [
    { name: "United", iata: "UA", iataSource: "airline_code", operatingName: null, operatorStatus: "reported-marketing" },
    { name: null, iata: null, iataSource: null, operatingName: null, operatorStatus: "unknown" },
  ],
};

test("points-covered amounts earn no card points", () => {
  expect(earnOnSplitPurchase({ cashChargedUsd: 100, pointsCoveredUsd: 400, rate: 8 })).toBe(800);
  expect(earnOnSplitPurchase({ cashChargedUsd: 0, pointsCoveredUsd: 500, rate: 8 })).toBe(0);
});

test("rejects invalid cash inputs", () => {
  expect(recommendPurchaseMethod({ cashAmount: Number.NaN, tripType: "round-trip" }).cashPrice).toBeNull();
  expect(recommendPurchaseMethod({ cashAmount: -20, tripType: "round-trip" }).cashPrice).toBeNull();
  expect(recommendPurchaseMethod({ cashAmount: Infinity, tripType: "round-trip" }).cashPrice).toBeNull();
});

test("does not treat the Amex 5,000 minimum as redeeming $50 for a cheaper fare", () => {
  expect(amexPayWithPoints(40)).toMatchObject({ status: "unavailable-under-minimum", points: null });
  expect(amexPayWithPoints(40).text).toMatch(/unavailable under the 5,000-point minimum/);
  expect(amexPayWithPoints(40).text).not.toMatch(/would spend/);
  expect(amexPayWithPoints(80)).toMatchObject({ status: "conditional", points: 8000 });
});

test("keeps award vs portal break-even unknown until fees are known", () => {
  const rec = recommendPurchaseMethod({ cashAmount: 400, tripType: "round-trip", airlineIdentity: united });
  expect(rec.disclosures.some((line) => line.includes("threshold is unknown"))).toBe(true);
  expect(rec.disclosures.some((line) => /fewer than .* plus unknown fees/.test(line))).toBe(false);
});

test("does not assert itinerary-wide transfers for mixed or cached-missing identity", () => {
  expect(recommendPurchaseMethod({ cashAmount: 400, tripType: "round-trip", airlineIdentity: mixed }).transferPaths).toEqual([]);
  expect(recommendPurchaseMethod({ cashAmount: 400, tripType: "round-trip", identityMissingFromCache: true }).transferPaths).toEqual([]);
  expect(recommendPurchaseMethod({ cashAmount: 400, tripType: "round-trip" }).identityNote).toMatch(/missing on this cached card/);
});

test("earn figures are conditional on eligible cash and do not assume travel credit remaining", () => {
  const rec = recommendPurchaseMethod({ cashAmount: 250, tripType: "round-trip", airlineIdentity: united });
  const portal = rec.earn.find((line) => line.channel.includes("Chase Travel"));
  expect(portal?.pointsIfEligibleCash).toBe(2000);
  expect(portal?.note).toMatch(/Conditional 8x/);
  expect(portal?.note).toMatch(/Travel-credit-covered/);
});

test("Aeroplan chart stays unknown for United without calling other-partner numbers a floor", () => {
  const rec = recommendPurchaseMethod({
    cashAmount: 400,
    tripType: "round-trip",
    origin: "DFW",
    destination: "SFO",
    airlineIdentity: united,
    distanceMiles: 800,
  });
  const aeroplan = rec.awards.find((award) => award.programName.includes("Aeroplan"));
  expect(aeroplan?.status).toBe("unknown");
  expect(aeroplan?.note).toMatch(/not a floor/);
});

test("does not assume a 1.5 cents Chase Travel rate or copy Sapphire Preferred transfer ratios", () => {
  const rec = recommendPurchaseMethod({ cashAmount: 400, tripType: "round-trip" });
  const text = rec.disclosures.join(" ");
  expect(text).toMatch(/1\.5 cents-per-point Chase Travel rate is not assumed/);
  expect(text).toMatch(/Sapphire Preferred/);
  expect(text).toMatch(/not a universal Sapphire Reserve airline rate/);
  expect(text).toMatch(/Other transfer ratios are not verified here/);
  expect(text).toMatch(/Points Boost/);
  expect(rec.headline).toMatch(/earn 8x/);
  expect(rec.verifiedComparison).toBe(false);
});
