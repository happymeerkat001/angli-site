import type { FlightRoute, NewsSource } from "./types";

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
  { id: "philippines", label: "Philippines", feedUrl: googleNewsSearch("Philippines") },
];

export const flightRoutes: FlightRoute[] = [
  { origin: "DFW", destination: "CRK", label: "Clark, Philippines" },
  { origin: "DFW", destination: "XIY", label: "Xi'an, China" },
  { origin: "DFW", destination: "XUZ", label: "Xuzhou, China" },
  { origin: "DFW", destination: "TPE", label: "Taipei, Taiwan" },
];

export const fareSearch = {
  departureDate: "2026-06-15",
  returnDate: "2026-07-06",
  adults: 1,
  cabin: "ECONOMY",
} as const;

export function googleFlightsUrl(route: FlightRoute) {
  const flight = `${route.origin}.${route.destination}.${fareSearch.departureDate}`;
  const returnFlight = `${route.destination}.${route.origin}.${fareSearch.returnDate}`;

  return `https://www.google.com/travel/flights#flt=${flight}*${returnFlight};c:USD;e:1;sd:1;t:f`;
}
