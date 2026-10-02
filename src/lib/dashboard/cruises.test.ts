import { afterEach, expect, test, vi } from "vitest";
import { schoolBreaks } from "./config";
import { parseNorwegianItinerary, parsePrincessSailings, parseRoyalCruiseSearch, princessBookingGuests } from "./cruise-lines";
import { cashToPoints, getCruiseDashboard, sailingDepartsInSeason, sailingFitsWindow, selectCruiseWindows, type ParsedCruiseSailing } from "./cruises";

afterEach(() => {
  vi.restoreAllMocks();
});

function sailing(overrides: Partial<ParsedCruiseSailing> = {}): ParsedCruiseSailing {
  return {
    id: "20895",
    line: "Royal Caribbean",
    ship: "Liberty of the Seas",
    title: "5-Day Western Caribbean from Galveston, TX",
    departurePortCode: "GAL",
    roundtrip: true,
    departureDate: "2026-10-09",
    returnDate: "2026-10-14",
    nights: 5,
    cashAmount: 586,
    url: "https://www.royalcaribbean.com/booking?sailingID=20895",
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

test("includes a departure in the next winter even when the trip runs past that season", () => {
  const winter = { label: "Winter 2027-28", departureDate: "2027-12-01", returnDate: "2028-02-29" };
  expect(sailingDepartsInSeason("2028-01-20", winter)).toBe(true);
  expect(sailingDepartsInSeason("2027-11-30", winter)).toBe(false);

  const windows = selectCruiseWindows([
    sailing({ id: "next-winter", departureDate: "2028-01-15", returnDate: "2028-01-22", cashAmount: 510 }),
    sailing({ id: "too-early", departureDate: "2027-06-20", returnDate: "2027-06-27", cashAmount: 300 }),
  ], [winter]);

  expect(windows[0].offers.map((offer) => offer.id)).toEqual(["next-winter"]);
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

test("prices the configured party and defaults to two adults", () => {
  expect(princessBookingGuests()).toEqual([
    { country: "US", homeCity: "LAX" },
    { country: "US", homeCity: "LAX" },
  ]);
  expect(princessBookingGuests({ adults: 2, children: [{ age: 8 }, { age: 11 }] })).toEqual([
    { country: "US", homeCity: "LAX" },
    { country: "US", homeCity: "LAX" },
    { country: "US", homeCity: "LAX", age: 8 },
    { country: "US", homeCity: "LAX", age: 11 },
  ]);
});

test("requests each Royal Caribbean Galveston page and groups sailings by school break", async () => {
  const fetchMock = vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
    const url = String(input);
    if (!url.includes("royalcaribbean.com")) return new Response("unavailable", { status: 503 });
    const body = JSON.parse(String(init?.body)) as { variables: { pagination: { skip: number } } };
    const skip = body.variables.pagination.skip;
    const sailing = skip === 0
      ? { id: "fall", startDate: "2026-10-10", endDate: "2026-10-15", price: 450 }
      : { id: "thanks", startDate: "2026-11-21", endDate: "2026-11-28", price: 620 };
    return new Response(JSON.stringify({
      data: {
        cruiseSearch: {
          results: {
            total: 2,
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
                id: sailing.id,
                startDate: sailing.startDate,
                endDate: sailing.endDate,
                bookingLink: `/booking?id=${sailing.id}`,
                taxesAndFeesIncluded: true,
                stateroomClassPricing: [{ price: { value: sailing.price } }],
              }],
            }],
          },
        },
      },
    }), { status: 200 });
  });

  const dashboard = await getCruiseDashboard();

  const royalCalls = fetchMock.mock.calls.filter(([input]) => String(input).includes("royalcaribbean.com"));
  expect(royalCalls).toHaveLength(2);
  const norwegianSearch = fetchMock.mock.calls.map(([input]) => String(input)).find((url) => url.includes("ncl.com/api/v2/vacations/search"));
  expect(norwegianSearch && new URL(norwegianSearch).searchParams.get("guests")).toBe("2");
  const firstBody = JSON.parse(String(royalCalls[0]?.[1]?.body)) as { variables: { filters: string; pagination: { skip: number } } };
  expect(firstBody.variables.filters).toBe("departurePort:GAL");
  expect(firstBody.variables.pagination.skip).toBe(0);
  expect(dashboard.status).toBe("ok");
  if (dashboard.status !== "ok") return;
  expect(dashboard.value.find((window) => window.windowLabel === "Fall Break")?.offers[0]?.id).toBe("royal:fall");
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
