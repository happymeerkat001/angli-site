import { expect, test } from "vitest";
import {
  airlineRefFromSegment,
  identityFromAirlineRefs,
  identityFromExploreDestination,
  identityFromSerpFlightSegments,
  parseAirlineCode,
  reportedIataForLookup,
} from "./airline-identity";

test("accepts only two-character IATA airline_code values", () => {
  expect(parseAirlineCode("UA")).toBe("UA");
  expect(parseAirlineCode("F9")).toBe("F9");
  expect(parseAirlineCode("ua")).toBe("UA");
  expect(parseAirlineCode("United")).toBeNull();
  expect(parseAirlineCode("UAL")).toBeNull();
  expect(parseAirlineCode("U")).toBeNull();
  expect(parseAirlineCode("")).toBeNull();
  expect(parseAirlineCode(12)).toBeNull();
});

test("prefers a valid explicit airline_code over flight-number and logo guesses", () => {
  expect(airlineRefFromSegment({
    airline: "United",
    airline_code: "UA",
    flight_number: "AA 100",
    airline_logo: "https://www.gstatic.com/flights/airline_logos/70px/AA.png",
  })).toMatchObject({ iata: "UA", iataSource: "airline_code", operatorStatus: "reported-marketing" });
});

test("rejects invalid airline_code shape and falls back to flight number as marketing evidence", () => {
  expect(airlineRefFromSegment({
    airline: "United",
    airline_code: "United",
    flight_number: "UA 2175",
  })).toMatchObject({ iata: "UA", iataSource: "flight_number", operatorStatus: "reported-marketing" });
});

test("keeps unidentified segments and labels partial identity as mixed", () => {
  const identity = identityFromAirlineRefs([
    { name: "United", iata: "UA", iataSource: "airline_code", operatingName: null, operatorStatus: "reported-marketing" },
    { name: null, iata: null, iataSource: null, operatingName: null, operatorStatus: "unknown" },
  ]);

  expect(identity.kind).toBe("mixed");
  expect(identity.segments).toHaveLength(2);
  expect(reportedIataForLookup(identity)).toBeNull();
});

test("does not call one known IATA plus a different unnamed carrier a single itinerary", () => {
  const identity = identityFromAirlineRefs([
    { name: "United", iata: "UA", iataSource: "flight_number", operatingName: null, operatorStatus: "reported-marketing" },
    { name: "American", iata: null, iataSource: null, operatingName: null, operatorStatus: "reported-marketing" },
  ]);

  expect(identity.kind).toBe("mixed");
  expect(reportedIataForLookup(identity)).toBeNull();
});

test("labels marketing/operator mismatch as mixed and does not verify the operator", () => {
  const identity = identityFromSerpFlightSegments([
    { airline: "United", flight_number: "UA 123", plane_and_crew_by: "Lufthansa" },
  ]);

  expect(identity.kind).toBe("mixed");
  expect(identity.segments[0]?.operatorStatus).toBe("codeshare-unverified");
  expect(reportedIataForLookup(identity)).toBeNull();
});

test("treats regional codeshare evidence as reported marketing, not a verified operator", () => {
  const identity = identityFromSerpFlightSegments([
    { airline: "United", flight_number: "UA 3489", plane_and_crew_by: "Republic Airways" },
  ]);

  expect(identity.kind).toBe("single");
  expect(identity.segments[0]).toMatchObject({
    iata: "UA",
    iataSource: "flight_number",
    operatingName: "Republic Airways",
    operatorStatus: "codeshare-unverified",
  });
});

test("explore airline_code must be a valid IATA shape", () => {
  expect(identityFromExploreDestination({ airline: "United", airline_code: "UA" }).kind).toBe("single");
  expect(identityFromExploreDestination({ airline: "United", airline_code: "United" }).segments[0]?.iata).toBe("UA");
  expect(identityFromExploreDestination({ airline_code: "U*" }).kind).toBe("unknown");
});
