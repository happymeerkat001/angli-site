import type { CaliforniaAirport, FareWindow, FlightRoute, NewsSource } from "./types";

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

export const californiaAirports: CaliforniaAirport[] = [
  { origin: "DFW", destination: "SJC", label: "San Jose, California" },
  { origin: "DFW", destination: "SFO", label: "San Francisco, California" },
  { origin: "DFW", destination: "SAN", label: "San Diego, California" },
];

export const fareSearch = {
  departureDate: "2027-06-18",
  returnDate: "2027-07-09",
  adults: 1,
  cabin: "ECONOMY",
} as const;
