import { partnerHubAirports } from "./config";
import type { AnywhereFlightOption, PointsFlightOption, PointsProgram } from "./types";

export const CHASE_CENTS_PER_POINT = 1.5;
export const AMEX_CENTS_PER_POINT = 1;
export const PARTNER_RANK_FACTOR = 0.875;

const partnerAirports = new Set<string>(partnerHubAirports);

export function pointsForCash(amount: number, centsPerPoint: number) {
  return Math.round(amount * 100 / centsPerPoint);
}

export function choosePointsProgram(amount: number): { program: PointsProgram; points: number } {
  const chase = pointsForCash(amount, CHASE_CENTS_PER_POINT);
  const amex = pointsForCash(amount, AMEX_CENTS_PER_POINT);
  return chase <= amex ? { program: "Chase", points: chase } : { program: "Amex", points: amex };
}

export function isPartnerHub(airportCode: string) {
  return partnerAirports.has(airportCode);
}

function toPointsOption(option: AnywhereFlightOption): PointsFlightOption {
  return { ...option, ...choosePointsProgram(option.amount) };
}

function rankScore(option: PointsFlightOption) {
  return isPartnerHub(option.airportCode) ? option.points * PARTNER_RANK_FACTOR : option.points;
}

export function selectTopPointsFlights(
  pile: AnywhereFlightOption[],
  cashAirportCodes: Iterable<string>,
  limit = 5,
): PointsFlightOption[] {
  const cashAirports = new Set(cashAirportCodes);
  const ranked = pile.map(toPointsOption).sort((a, b) => rankScore(a) - rankScore(b) || a.amount - b.amount);
  const unique = ranked.filter((option, index) => ranked.findIndex((candidate) => candidate.airportCode === option.airportCode) === index);
  const preferred = unique.filter((option) => !cashAirports.has(option.airportCode));
  const overlap = unique.filter((option) => cashAirports.has(option.airportCode));
  return [...preferred, ...overlap].slice(0, limit);
}
