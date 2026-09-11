import type { AirlineCodeSource, AirlineOperatorStatus, AirlineRef, FlightAirlineIdentity } from "./types";

const IATA_SHAPE = /^[A-Z][A-Z0-9]$/;
const FLIGHT_NUMBER_IATA = /^([A-Z][A-Z0-9])\s/;
const LOGO_IATA = /\/([A-Z0-9]{2})\.png(?:\?|$)/i;

export const FRONTIER_AIRLINE_IDENTITY: FlightAirlineIdentity = {
  kind: "single",
  segments: [{
    name: "Frontier",
    iata: "F9",
    iataSource: "airline_code",
    operatingName: "Frontier",
    operatorStatus: "verified-operating",
  }],
};

export const unknownAirlineIdentity: FlightAirlineIdentity = { kind: "unknown", segments: [] };

const NAME_TO_IATA: Record<string, string> = {
  "aer lingus": "EI",
  "aeromexico": "AM",
  "air canada": "AC",
  "air france": "AF",
  "alaska": "AS",
  "alaska airlines": "AS",
  "american": "AA",
  "american airlines": "AA",
  "ana": "NH",
  "all nippon airways": "NH",
  "avianca": "AV",
  "british airways": "BA",
  "cathay pacific": "CX",
  "delta": "DL",
  "delta air lines": "DL",
  "emirates": "EK",
  "frontier": "F9",
  "hawaiian": "HA",
  "hawaiian airlines": "HA",
  "iberia": "IB",
  "jetblue": "B6",
  "klm": "KL",
  "lufthansa": "LH",
  "qantas": "QF",
  "qatar airways": "QR",
  "singapore airlines": "SQ",
  "southwest": "WN",
  "united": "UA",
  "united airlines": "UA",
  "virgin atlantic": "VS",
};

export function parseAirlineCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const code = value.trim().toUpperCase();
  return IATA_SHAPE.test(code) ? code : null;
}

export function iataFromFlightNumber(flightNumber: string | null | undefined) {
  const match = typeof flightNumber === "string" ? flightNumber.trim().toUpperCase().match(FLIGHT_NUMBER_IATA) : null;
  const code = match?.[1] ?? null;
  return code && IATA_SHAPE.test(code) ? code : null;
}

export function iataFromAirlineLogo(logoUrl: string | null | undefined) {
  const match = typeof logoUrl === "string" ? logoUrl.match(LOGO_IATA) : null;
  const code = match?.[1]?.toUpperCase() ?? null;
  return code && IATA_SHAPE.test(code) ? code : null;
}

export function iataFromAirlineName(name: string | null | undefined) {
  if (typeof name !== "string") return null;
  return NAME_TO_IATA[name.trim().toLowerCase()] ?? null;
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function resolveIata(segment: {
  airline?: unknown;
  airline_code?: unknown;
  flight_number?: unknown;
  airline_logo?: unknown;
}): { iata: string | null; iataSource: AirlineCodeSource | null } {
  const fromCode = parseAirlineCode(segment.airline_code);
  if (fromCode) return { iata: fromCode, iataSource: "airline_code" };
  const fromNumber = iataFromFlightNumber(asString(segment.flight_number));
  if (fromNumber) return { iata: fromNumber, iataSource: "flight_number" };
  const fromLogo = iataFromAirlineLogo(asString(segment.airline_logo));
  if (fromLogo) return { iata: fromLogo, iataSource: "logo" };
  const fromName = iataFromAirlineName(asString(segment.airline));
  if (fromName) return { iata: fromName, iataSource: "name" };
  return { iata: null, iataSource: null };
}

function operatorStatus(args: {
  iata: string | null;
  name: string | null;
  operatingName: string | null;
}): AirlineOperatorStatus {
  if (!args.iata && !args.name && !args.operatingName) return "unknown";
  if (!args.operatingName) return args.iata || args.name ? "reported-marketing" : "unknown";
  const operatingIata = iataFromAirlineName(args.operatingName);
  if (operatingIata && args.iata && operatingIata !== args.iata) return "codeshare-unverified";
  const marketing = args.name?.toLowerCase() ?? "";
  const operating = args.operatingName.toLowerCase();
  if (marketing && operating !== marketing && !operating.includes(marketing) && !marketing.includes(operating)) {
    return "codeshare-unverified";
  }
  return "verified-operating";
}

export function airlineRefFromSegment(segment: {
  airline?: unknown;
  airline_code?: unknown;
  flight_number?: unknown;
  airline_logo?: unknown;
  plane_and_crew_by?: unknown;
}): AirlineRef {
  const name = asString(segment.airline);
  const operatingName = asString(segment.plane_and_crew_by);
  const { iata, iataSource } = resolveIata(segment);
  return {
    name,
    iata,
    iataSource,
    operatingName,
    operatorStatus: operatorStatus({ iata, name, operatingName }),
  };
}

function hasUsableCarrier(segment: AirlineRef) {
  return Boolean(segment.iata || segment.name || segment.operatingName);
}

export function identityFromAirlineRefs(segments: AirlineRef[]): FlightAirlineIdentity {
  if (segments.length === 0) return unknownAirlineIdentity;

  const incomplete = segments.some((segment) => !hasUsableCarrier(segment));
  const usable = segments.filter(hasUsableCarrier);
  if (usable.length === 0) return { kind: "unknown", segments };

  const iatas = [...new Set(usable.map((segment) => segment.iata).filter((code): code is string => Boolean(code)))];
  const names = [...new Set(usable.map((segment) => segment.name?.toLowerCase()).filter((name): name is string => Boolean(name)))];
  const operatorMismatch = usable.some((segment) => {
    const operatingIata = iataFromAirlineName(segment.operatingName);
    return Boolean(operatingIata && segment.iata && operatingIata !== segment.iata);
  });

  const unresolvedAlongsideKnownIata = iatas.length === 1 && usable.some((segment) => segment.iata !== iatas[0]);

  if (
    incomplete
    || iatas.length > 1
    || operatorMismatch
    || unresolvedAlongsideKnownIata
    || (iatas.length === 0 && names.length > 1)
  ) {
    return { kind: "mixed", segments };
  }
  return { kind: "single", segments };
}

export function identityFromSerpFlightSegments(flights: unknown): FlightAirlineIdentity {
  if (!Array.isArray(flights) || flights.length === 0) return unknownAirlineIdentity;
  return identityFromAirlineRefs(flights.map((segment) => (
    airlineRefFromSegment(segment && typeof segment === "object" ? segment : {})
  )));
}

export function identityFromExploreDestination(destination: {
  airline?: unknown;
  airline_code?: unknown;
}): FlightAirlineIdentity {
  return identityFromAirlineRefs([airlineRefFromSegment(destination)]);
}

export function reportedIataForLookup(identity: FlightAirlineIdentity | undefined) {
  if (!identity || identity.kind !== "single") return null;
  return identity.segments.find((segment) => segment.iata)?.iata ?? null;
}
