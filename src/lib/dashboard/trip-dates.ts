import type { Holiday, SchoolBreak, TripDatePair } from "./types";

export const MIN_TRIP_NIGHTS = 3;
export const MAX_TRIP_NIGHTS = 7;
export const SEARCH_BATCH_SIZE = 5;
export const TRIP_DATE_POLICY_VERSION = "family-trip-windows-v1";

export function isoToday(now: Date): string {
  return now.toISOString().slice(0, 10);
}

export function parseStrictIsoDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  if (date.toISOString().slice(0, 10) !== value) return null;
  return date;
}

export function isStrictIsoDate(value: string): boolean {
  return parseStrictIsoDate(value) !== null;
}

export function addUtcDays(dateString: string, days: number): string | null {
  const date = parseStrictIsoDate(dateString);
  if (!date) return null;
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function nightsBetween(departureDate: string, returnDate: string): number | null {
  const start = parseStrictIsoDate(departureDate);
  const end = parseStrictIsoDate(returnDate);
  if (!start || !end) return null;
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

export function isDateInWindow(date: string, schoolBreak: Pick<SchoolBreak, "departureDate" | "returnDate">): boolean {
  return date >= schoolBreak.departureDate && date <= schoolBreak.returnDate;
}

export function coveredHolidays(
  trip: Pick<TripDatePair, "departureDate" | "returnDate">,
  schoolBreak: SchoolBreak,
): Holiday[] {
  return schoolBreak.holidays.filter((holiday) => (
    holiday.date >= trip.departureDate && holiday.date <= trip.returnDate
  ));
}

export function satisfiesHolidayRule(
  trip: Pick<TripDatePair, "departureDate" | "returnDate">,
  schoolBreak: SchoolBreak,
): boolean {
  if (schoolBreak.holidayCoverage === "none" || schoolBreak.holidays.length === 0) return true;
  return coveredHolidays(trip, schoolBreak).length > 0;
}

export function tripFitsPolicy(
  trip: Pick<TripDatePair, "departureDate" | "returnDate">,
  schoolBreak: SchoolBreak,
  today?: string,
): boolean {
  if (!isStrictIsoDate(trip.departureDate) || !isStrictIsoDate(trip.returnDate)) return false;
  if (trip.returnDate < trip.departureDate) return false;
  const nights = nightsBetween(trip.departureDate, trip.returnDate);
  if (nights === null || nights < MIN_TRIP_NIGHTS || nights > MAX_TRIP_NIGHTS) return false;
  if (!isDateInWindow(trip.departureDate, schoolBreak) || !isDateInWindow(trip.returnDate, schoolBreak)) return false;
  if (today && trip.departureDate < today) return false;
  return satisfiesHolidayRule(trip, schoolBreak);
}

export function listValidTripPairs(schoolBreak: SchoolBreak, today: string): TripDatePair[] {
  if (!isStrictIsoDate(schoolBreak.departureDate) || !isStrictIsoDate(schoolBreak.returnDate)) return [];
  if (schoolBreak.returnDate < schoolBreak.departureDate) return [];

  const pairs: TripDatePair[] = [];
  let departureDate = schoolBreak.departureDate < today ? today : schoolBreak.departureDate;
  if (!isStrictIsoDate(departureDate)) return [];

  while (departureDate <= schoolBreak.returnDate) {
    for (let nights = MIN_TRIP_NIGHTS; nights <= MAX_TRIP_NIGHTS; nights += 1) {
      const returnDate = addUtcDays(departureDate, nights);
      if (!returnDate) continue;
      const trip = { departureDate, returnDate, nights };
      if (tripFitsPolicy(trip, schoolBreak, today)) pairs.push(trip);
    }
    const next = addUtcDays(departureDate, 1);
    if (!next) break;
    departureDate = next;
  }

  return pairs;
}

function pairKey(pair: Pick<TripDatePair, "departureDate" | "returnDate">): string {
  return `${pair.departureDate}/${pair.returnDate}`;
}

function comparePairs(a: TripDatePair, b: TripDatePair): number {
  return a.nights - b.nights || a.departureDate.localeCompare(b.departureDate) || a.returnDate.localeCompare(b.returnDate);
}

function uniquePairs(pairs: TripDatePair[]): TripDatePair[] {
  const seen = new Set<string>();
  return pairs.filter((pair) => !seen.has(pairKey(pair)) && Boolean(seen.add(pairKey(pair))));
}

function spreadAcrossDurationsAndWindow(pairs: TripDatePair[]): TripDatePair[] {
  const sorted = [...pairs].sort(comparePairs);
  const byNights = new Map<number, TripDatePair[]>();
  for (const pair of sorted) {
    const group = byNights.get(pair.nights) ?? [];
    group.push(pair);
    byNights.set(pair.nights, group);
  }

  const firstPass: TripDatePair[] = [];
  const used = new Set<string>();
  for (let nights = MIN_TRIP_NIGHTS; nights <= MAX_TRIP_NIGHTS; nights += 1) {
    const group = byNights.get(nights) ?? [];
    if (group.length === 0) continue;
    const pick = group[Math.floor((group.length - 1) / 2)] ?? group[0];
    firstPass.push(pick);
    used.add(pairKey(pick));
  }

  return [...firstPass, ...sorted.filter((pair) => !used.has(pairKey(pair)))];
}

function roundRobin(buckets: TripDatePair[][]): TripDatePair[] {
  const out: TripDatePair[] = [];
  const seen = new Set<string>();
  const max = Math.max(0, ...buckets.map((bucket) => bucket.length));
  for (let index = 0; index < max; index += 1) {
    for (const bucket of buckets) {
      const pair = bucket[index];
      if (!pair) continue;
      const key = pairKey(pair);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(pair);
    }
  }
  return out;
}

export function orderTripPairsForSearch(pairs: TripDatePair[], schoolBreak: SchoolBreak): TripDatePair[] {
  const unique = uniquePairs(pairs);
  const christmas = schoolBreak.holidays.find((holiday) => holiday.id === "christmas");
  const newYear = schoolBreak.holidays.find((holiday) => holiday.id === "new-year");
  if (!christmas || !newYear) return spreadAcrossDurationsAndWindow(unique);

  const bothKey = pairKey({ departureDate: christmas.date, returnDate: newYear.date });
  const both = unique.find((pair) => pairKey(pair) === bothKey);
  const christmasOnly = unique.filter((pair) => (
    pairKey(pair) !== bothKey
    && coveredHolidays(pair, schoolBreak).some((holiday) => holiday.id === "christmas")
    && !coveredHolidays(pair, schoolBreak).some((holiday) => holiday.id === "new-year")
  ));
  const newYearOnly = unique.filter((pair) => (
    pairKey(pair) !== bothKey
    && coveredHolidays(pair, schoolBreak).some((holiday) => holiday.id === "new-year")
    && !coveredHolidays(pair, schoolBreak).some((holiday) => holiday.id === "christmas")
  ));
  const rest = unique.filter((pair) => (
    pairKey(pair) !== bothKey
    && !christmasOnly.some((candidate) => pairKey(candidate) === pairKey(pair))
    && !newYearOnly.some((candidate) => pairKey(candidate) === pairKey(pair))
  ));

  return uniquePairs([
    ...(both ? [both] : []),
    ...roundRobin([
      spreadAcrossDurationsAndWindow(christmasOnly),
      spreadAcrossDurationsAndWindow(newYearOnly),
      spreadAcrossDurationsAndWindow(rest),
    ]),
  ]);
}

export function selectSearchBatch(
  orderedPairs: TripDatePair[],
  cursor: number,
  limit = SEARCH_BATCH_SIZE,
): { batch: TripDatePair[]; nextCursor: number } {
  if (orderedPairs.length === 0) return { batch: [], nextCursor: 0 };
  const start = cursor >= orderedPairs.length || cursor < 0 ? 0 : cursor;
  const batch = uniquePairs(orderedPairs.slice(start, start + limit));
  const next = start + batch.length;
  return { batch, nextCursor: next >= orderedPairs.length ? 0 : next };
}

export function tripDatePolicyFingerprint(breaks: SchoolBreak[]): string {
  const body = breaks.map((schoolBreak) => (
    `${schoolBreak.label}:${schoolBreak.departureDate}:${schoolBreak.returnDate}:${schoolBreak.holidayCoverage}:${schoolBreak.holidays.map((holiday) => `${holiday.id}=${holiday.date}`).join(",")}`
  )).join("|");
  return `${TRIP_DATE_POLICY_VERSION}|nights:${MIN_TRIP_NIGHTS}-${MAX_TRIP_NIGHTS}|${body}`;
}

export function holidayInclusionLabel(holidays: Holiday[]): string | null {
  if (holidays.length === 0) return null;
  if (holidays.length === 1) return `Includes ${holidays[0].label}`;
  if (holidays.length === 2) return `Includes ${holidays[0].label} and ${holidays[1].label}`;
  return `Includes ${holidays.map((holiday) => holiday.label).join(", ")}`;
}

export function holidayRuleCopy(schoolBreak: SchoolBreak): string | null {
  if (schoolBreak.holidayCoverage === "none" || schoolBreak.holidays.length === 0) return null;
  if (schoolBreak.holidays.some((holiday) => holiday.id === "thanksgiving")) {
    return "Thanksgiving trips must include Thanksgiving Day.";
  }
  if (schoolBreak.holidays.some((holiday) => holiday.id === "christmas") && schoolBreak.holidays.some((holiday) => holiday.id === "new-year")) {
    return "Winter trips must include Christmas Day, New Year's Day, or both.";
  }
  return `Trips must include ${schoolBreak.holidays.map((holiday) => holiday.label).join(" or ")}.`;
}

