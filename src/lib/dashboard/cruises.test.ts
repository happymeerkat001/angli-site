import { afterEach, expect, test, vi } from "vitest";
import { schoolBreaks } from "./config";
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
    id: "99",
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

  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(new URL(carnivalSearchUrl(1)).searchParams.get("port")).toBe("GAL");
  expect(dashboard.status).toBe("ok");
  if (dashboard.status !== "ok") return;
  expect(dashboard.value.find((window) => window.windowLabel === "Fall Break")?.offers[0]?.id).toBe("fall");
  expect(dashboard.value.find((window) => window.windowLabel === "Thanksgiving Break")?.offers[0]?.cashAmount).toBe(620);
  expect(dashboard.value.find((window) => window.windowLabel === "Winter Break")?.offers).toEqual([]);
});
