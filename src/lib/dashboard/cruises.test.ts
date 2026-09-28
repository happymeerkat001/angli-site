import { afterEach, expect, test, vi } from "vitest";
import { schoolBreaks } from "./config";
import { parseNorwegianItinerary, parsePrincessSailings, parseRoyalCruiseSearch } from "./cruise-lines";
import { carnivalSearchUrl, cashToPoints, getCruiseDashboard, parseCarnivalItineraries, sailingFitsWindow, selectCruiseWindows, type ParsedCruiseSailing } from "./cruises";

afterEach(() => {
  vi.restoreAllMocks();
});

function sailing(overrides: Partial<ParsedCruiseSailing> = {}): ParsedCruiseSailing {
  return {
    id: "20895",
    line: "Carnival",
    ship: "Carnival Breeze",
    title: "5-Day Western Caribbean from Galveston, TX",
    departurePortCode: "GAL",
    roundtrip: true,
    departureDate: "2026-10-09",
    returnDate: "2026-10-14",
    nights: 5,
    cashAmount: 586,
    url: "https://www.carnival.com/booking?sailingID=20895",
    ...overrides,
  };
}

test("allows a Galveston sailing that overruns a school break by up to two days", () => {
  const fall = schoolBreaks[0];
  expect(sailingFitsWindow("2026-10-08", "2026-10-15", fall)).toBe(true);
  expect(sailingFitsWindow("2026-10-07", "2026-10-13", fall)).toBe(false);
  expect(sailingFitsWindow("2026-10-10", "2026-10-16", fall)).toBe(false);
});

test("converts the cash fare to points at 1.5 cents per point", () => {
  expect(cashToPoints(586)).toBe(39067);
});

test("keeps only round trips from Galveston and the four cheapest per break", () => {
  const windows = selectCruiseWindows([
    sailing({ id: "outside", departurePortCode: "MIA" }),
    sailing({ id: "one-way", roundtrip: false }),
    sailing({ id: "early", departureDate: "2026-10-01", returnDate: "2026-10-06" }),
    sailing(),
    sailing({ id: "pricey", cashAmount: 900 }),
    sailing({ id: "mid", cashAmount: 700 }),
    sailing({ id: "cheap", cashAmount: 400 }),
    sailing({ id: "fourth", cashAmount: 800 }),
    sailing({ id: "fifth", cashAmount: 850 }),
    sailing({ id: "sixth", cashAmount: 860 }),
  ], [schoolBreaks[0]]);

  expect(windows[0].offers.map((offer) => offer.id)).toEqual(["cheap", "20895", "mid", "fourth"]);
  expect(windows[0].offers[0]).toMatchObject({
    departurePort: "Galveston",
    cashAmount: 400,
    points: cashToPoints(400),
    currency: "USD",
    windowLabel: "Fall Break",
  });
});

test("parses Carnival cabin fares and ignores sold-out rooms", () => {
  const parsed = parseCarnivalItineraries([{
    roundtrip: true,
    itineraryTitle: "4-Day Western Caribbean from Galveston, TX",
    departurePortCode: "GAL",
    dur: 4,
    shipName: "Carnival Jubilee",
    sailings: [{
      sailingId: "99",
      departureDate: "2026-11-21T00:00:00.000Z",
      arrivalDate: "2026-11-25T00:00:00.000Z",
      sailingURL: "/booking?sailingID=99",
      rooms: {
        interior: { price: 499, soldOut: false, taxesAndFees: 20 },
        suite: { price: 0, soldOut: true },
      },
    }],
  }]);

  expect(parsed).toEqual([expect.objectContaining({
    id: "carnival:99",
    cashAmount: 519,
    departureDate: "2026-11-21",
    returnDate: "2026-11-25",
    url: "https://www.carnival.com/booking?sailingID=99",
  })]);
});

test("requests every Galveston results page and groups sailings by school break", async () => {
  const fetchMock = vi.spyOn(global, "fetch").mockImplementation(async (input) => {
    const page = new URL(input.toString()).searchParams.get("pageNumber");
    const itinerary = page === "1"
      ? {
        roundtrip: true,
        itineraryTitle: "5-Day Western Caribbean from Galveston, TX",
        departurePortCode: "GAL",
        dur: 5,
        shipName: "Carnival Breeze",
        sailings: [{
          sailingId: "fall",
          departureDate: "2026-10-10T00:00:00.000Z",
          arrivalDate: "2026-10-15T00:00:00.000Z",
          lowestPrice: 450,
          sailingURL: "/booking?sailingID=fall",
          rooms: { interior: { price: 450, soldOut: false } },
        }],
      }
      : {
        roundtrip: true,
        itineraryTitle: "7-Day Western Caribbean from Galveston, TX",
        departurePortCode: "GAL",
        dur: 7,
        shipName: "Carnival Dream",
        sailings: [{
          sailingId: "thanks",
          departureDate: "2026-11-21T00:00:00.000Z",
          arrivalDate: "2026-11-28T00:00:00.000Z",
          sailingURL: "/booking?sailingID=thanks",
          rooms: { interior: { price: 620, soldOut: false } },
        }],
      };
    return new Response(JSON.stringify({ results: { lastPage: 2, itineraries: [itinerary] } }), { status: 200 });
  });

  const dashboard = await getCruiseDashboard();

  const carnivalCalls = fetchMock.mock.calls.filter(([input]) => String(input).includes("carnival.com"));
  expect(carnivalCalls).toHaveLength(2);
  expect(new URL(carnivalSearchUrl(1)).searchParams.get("port")).toBe("GAL");
  expect(dashboard.status).toBe("ok");
  if (dashboard.status !== "ok") return;
  expect(dashboard.value.find((window) => window.windowLabel === "Fall Break")?.offers[0]?.id).toBe("carnival:fall");
  expect(dashboard.value.find((window) => window.windowLabel === "Thanksgiving Break")?.offers[0]?.cashAmount).toBe(620);
  expect(dashboard.value.find((window) => window.windowLabel === "Winter Break")?.offers).toEqual([]);
});

test("keeps sailings from the lines that respond when another line fails", async () => {
  vi.spyOn(global, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    if (url.includes("royalcaribbean.com")) {
      return new Response(JSON.stringify({
        data: {
          cruiseSearch: {
            results: {
              total: 1,
              cruises: [{
                masterSailing: {
                  itinerary: {
                    name: "Western Caribbean Cruise",
                    sailingNights: 5,
                    ship: { name: "Liberty of the Seas" },
                    departurePort: { code: "GAL" },
                    days: [{ ports: [{ port: { code: "GAL" } }] }, { ports: [{ port: { code: "GAL" } }] }],
                  },
                },
                sailings: [{
                  id: "LB05_2026-10-10",
                  startDate: "2026-10-10",
                  endDate: "2026-10-15",
                  bookingLink: "/booking/landing?sailDate=2026-10-10",
                  taxesAndFees: { value: 20 },
                  taxesAndFeesIncluded: false,
                  stateroomClassPricing: [{ price: { value: 400 } }, { price: { value: null } }],
                }],
              }],
            },
          },
        },
      }), { status: 200 });
    }
    return new Response("unavailable", { status: 503 });
  });

  const dashboard = await getCruiseDashboard();

  expect(dashboard.status).toBe("ok");
  if (dashboard.status !== "ok") return;
  expect(dashboard.value.find((window) => window.windowLabel === "Fall Break")?.offers[0]).toMatchObject({
    id: "royal:LB05_2026-10-10",
    line: "Royal Caribbean",
    cashAmount: 420,
    points: cashToPoints(420),
    departurePort: "Galveston",
  });
});

test("parses Royal Caribbean, Norwegian, and Princess Galveston sailings", () => {
  const royal = parseRoyalCruiseSearch({
    data: {
      cruiseSearch: {
        results: {
          cruises: [{
            masterSailing: {
              itinerary: {
                name: "Western Caribbean Cruise",
                sailingNights: 5,
                ship: { name: "Liberty of the Seas" },
                departurePort: { code: "GAL" },
                days: [{ ports: [{ port: { code: "MIA" } }] }, { ports: [{ port: { code: "GAL" } }] }],
              },
            },
            sailings: [{
              id: "one-way",
              startDate: "2026-10-10",
              endDate: "2026-10-15",
              taxesAndFeesIncluded: true,
              stateroomClassPricing: [{ price: { value: 500 } }],
            }],
          }],
        },
      },
    },
  });
  expect(royal[0]?.roundtrip).toBe(false);

  const norwegian = parseNorwegianItinerary({
    code: "VIVA7GAL",
    title: "7-Day Caribbean Round-trip Galveston",
    embarkationPort: { code: "GAL" },
    disembarkationPort: { code: "GAL" },
    ship: { title: "Norwegian Viva" },
    duration: { days: 7 },
  }, {
    sailings: [{
      sailId: "59198",
      sailingStartDate: "2026-11-21T00:00",
      sailingEndDate: "2026-11-28T00:00",
      pricing: [
        { statusText: "Sold Out", combinedPrice: 100 },
        { statusText: "Available", combinedPrice: 689 },
        { statusText: "Available", combinedPrice: 779 },
      ],
    }],
  });
  expect(norwegian[0]).toMatchObject({
    id: "norwegian:59198",
    line: "Norwegian",
    cashAmount: 689,
    departureDate: "2026-11-21",
    roundtrip: true,
    departurePortCode: "GAL",
  });

  const princess = parsePrincessSailings({
    products: [{
      name: "Western Caribbean",
      cruises: [
        {
          id: "G640N",
          startDate: "20270313",
          endDate: "20270320",
          voyage: { duration: 7, startPortId: "GLS", endPortId: "GLS", ship: { id: "GP" } },
        },
        {
          id: "MIAMI",
          startDate: "20270313",
          endDate: "20270320",
          voyage: { duration: 7, startPortId: "MIA", endPortId: "MIA", ship: { id: "GP" } },
        },
      ],
    }],
  }, { ships: [{ id: "GP", name: "Grand Princess" }] }, new Map([["G640N", 899], ["MIAMI", 700]]));
  expect(princess).toEqual([expect.objectContaining({
    id: "princess:G640N",
    line: "Princess",
    ship: "Grand Princess",
    departurePortCode: "GAL",
    roundtrip: true,
    departureDate: "2027-03-13",
    cashAmount: 899,
  })]);
});
