import type { CaliforniaAirport, FareWindow, FlightRoute, NewsSource, StockPosition } from "./types";

const googleNewsBaseUrl = "https://news.google.com/rss";

function googleNewsSearch(query?: string) {
  const params = new URLSearchParams({
    hl: "en-US",
    gl: "US",
    ceid: "US:en",
  });

  if (query) {
    params.set("q", query);
  }

  return `${googleNewsBaseUrl}?${params.toString()}`;
}

export const newsSources: NewsSource[] = [
  { id: "dallas-news", label: "Dallas News", feedUrl: googleNewsSearch("site:dallasnews.com") },
  { id: "crosscheck", label: "CrossCheck", feedUrl: googleNewsSearch("site:crosscheck.news") },
  { id: "google-news", label: "Google News", feedUrl: googleNewsSearch() },
  { id: "hoopshype", label: "HoopsHype", feedUrl: googleNewsSearch("site:hoopshype.com") },
];

export const stockNewsSource: NewsSource = {
  id: "stock-news",
  label: "Google News",
  feedUrl: googleNewsSearch("NVIDIA NVDA stock"),
};

export const stockPosition: StockPosition = {
  symbol: "NVDA",
  shares: 203.26,
  costBasisPerShare: 26.85,
};

export const flightRoutes: FlightRoute[] = [
  { origin: "DFW", destination: "CRK", label: "Clark, Philippines" },
  { origin: "DFW", destination: "XIY", label: "Xi'an, China" },
  { origin: "DFW", destination: "XUZ", label: "Xuzhou, China" },
];

export const schoolBreaks: FareWindow[] = [
  { label: "Fall Break", departureDate: "2026-10-10", returnDate: "2026-10-13" },
  { label: "Thanksgiving Break", departureDate: "2026-11-21", returnDate: "2026-11-29" },
  { label: "Winter Break", departureDate: "2026-12-19", returnDate: "2027-01-06" },
  { label: "Spring Break", departureDate: "2027-03-13", returnDate: "2027-03-21" },
  // The full summer break is 2027-05-28–2027-08-12; search its mid-summer slice.
  { label: "Summer Break", departureDate: "2027-06-18", returnDate: "2027-07-09" },
];

// McKinney ISD has not published a 2027-28 calendar. After the current school breaks,
// cruise seasons are whole seasons through winter 2028-29 (about 29 months from Sep 2026),
// which covers the 16-month horizon and the usual cruise booking window.
export const cruiseWindows: FareWindow[] = [
  ...schoolBreaks,
  { label: "Late Summer 2027", departureDate: "2027-07-12", returnDate: "2027-08-31" },
  { label: "Fall 2027", departureDate: "2027-09-01", returnDate: "2027-11-30" },
  { label: "Winter 2027-28", departureDate: "2027-12-01", returnDate: "2028-02-29" },
  { label: "Spring 2028", departureDate: "2028-03-01", returnDate: "2028-05-31" },
  { label: "Summer 2028", departureDate: "2028-06-01", returnDate: "2028-08-31" },
  { label: "Fall 2028", departureDate: "2028-09-01", returnDate: "2028-11-30" },
  { label: "Winter 2028-29", departureDate: "2028-12-01", returnDate: "2029-02-28" },
];

export const californiaAirports: CaliforniaAirport[] = [
  { origin: "DFW", destination: "SJC", label: "San Jose, California" },
  { origin: "DFW", destination: "SFO", label: "San Francisco, California" },
  { origin: "DFW", destination: "SAN", label: "San Diego, California" },
];

export const serpApiRenewalDay = 16;

export const cruiseSearch = {
  portCode: "GAL",
  portName: "Galveston",
  adults: 2,
  flexDays: 2,
  pointsCentsPerPoint: 1.5,
  offersPerWindow: 4,
} as const;

export const cruiseLines = [
  "Carnival",
  "Royal Caribbean",
  "Norwegian",
  "MSC",
  "Disney",
  "Princess",
] as const;

export const fareSearch = {
  departureDate: "2027-06-18",
  returnDate: "2027-07-09",
  adults: 1,
  cabin: "ECONOMY",
} as const;
