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
];

export const flightRoutes: FlightRoute[] = [
  { origin: "DFW", destination: "CRK", label: "Clark, Philippines" },
  { origin: "DFW", destination: "XIY", label: "Xi'an, China" },
  { origin: "DFW", destination: "XUZ", label: "Xuzhou, China" },
  { origin: "DFW", destination: "TPE", label: "Taipei, Taiwan" },
];

export const fareSearch = {
  departureDate: "2027-06-18",
  returnDate: "2027-07-09",
  adults: 1,
  cabin: "ECONOMY",
} as const;
