import type { CaliforniaAirport, FlightRoute, NewsSource, SchoolBreak, StockPosition } from "./types";

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

export const schoolBreaks: SchoolBreak[] = [
  { label: "Fall Break", departureDate: "2026-10-10", returnDate: "2026-10-13", holidayCoverage: "none", holidays: [] },
  {
    label: "Thanksgiving Break",
    departureDate: "2026-11-21",
    returnDate: "2026-11-29",
    holidayCoverage: "any",
    holidays: [{ id: "thanksgiving", date: "2026-11-26", label: "Thanksgiving" }],
  },
  {
    label: "Winter Break",
    departureDate: "2026-12-19",
    returnDate: "2027-01-06",
    holidayCoverage: "any",
    holidays: [
      { id: "christmas", date: "2026-12-25", label: "Christmas" },
      { id: "new-year", date: "2027-01-01", label: "New Year's" },
    ],
  },
  { label: "Spring Break", departureDate: "2027-03-13", returnDate: "2027-03-21", holidayCoverage: "none", holidays: [] },
  // Search the configured mid-summer window. A prior note mentioned 2027-05-28–2027-08-12 as the full break; those dates are not verified from the school calendar, so they are not used as the search window.
  { label: "Summer Break", departureDate: "2027-06-18", returnDate: "2027-07-09", holidayCoverage: "none", holidays: [] },
];

export const californiaAirports: CaliforniaAirport[] = [
  { origin: "DFW", destination: "SJC", label: "San Jose, California" },
  { origin: "DFW", destination: "SFO", label: "San Francisco, California" },
  { origin: "DFW", destination: "SAN", label: "San Diego, California" },
];

export const serpApiRenewalDay = 16;

export const partnerHubAirports = [
  "AMS", "ATL", "BOS", "BOG", "BWI", "CDG", "DAL", "DEN", "DTW", "EWR",
  "FLL", "HND", "HOU", "IAD", "IAH", "JFK", "LAS", "LAX", "LGA", "LHR",
  "MDW", "MCO", "MSP", "NRT", "ORD", "PHX", "SEA", "SFO", "SLC", "YVR", "YYZ",
] as const;

export const FRONTIER_DEALS_URL = "https://flights.flyfrontier.com/en/flight-deals";
export const frontierDallasOrigins = ["DFW", "DAL"] as const;

export const fareSearch = {
  departureDate: "2027-06-18",
  returnDate: "2027-07-09",
  adults: 1,
  cabin: "ECONOMY",
} as const;
