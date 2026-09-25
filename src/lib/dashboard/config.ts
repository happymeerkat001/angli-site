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
  // Shared no-school overlap of MCA 2026–27 and Imagine North Texas 2026–27. Imagine does not follow McKinney ISD.
  // MCA: https://www.mckinneychristian.org/uploads/files/mca-2026-2027-school-calendar-1.pdf
  // Imagine: https://www.imaginenorthtexas.org/General_Documents/Calendar/IIANT_Calendar_2026_2027_v3_.pdf
  // Fall: Imagine students resume Oct 13; MCA is off Oct 12–13. Shared travel window is Oct 10–12 (weekend + Oct 12).
  { label: "Fall Break", departureDate: "2026-10-10", returnDate: "2026-10-12", holidayCoverage: "none", holidays: [] },
  {
    label: "Thanksgiving Break",
    departureDate: "2026-11-21",
    returnDate: "2026-11-29",
    holidayCoverage: "any",
    holidays: [{ id: "thanksgiving", date: "2026-11-26", label: "Thanksgiving" }],
  },
  {
    // MCA resumes Jan 6; Imagine students resume Jan 5. Shared last day both students are off is Jan 4.
    label: "Winter Break",
    departureDate: "2026-12-19",
    returnDate: "2027-01-04",
    holidayCoverage: "any",
    holidays: [
      { id: "christmas", date: "2026-12-25", label: "Christmas" },
      { id: "new-year", date: "2027-01-01", label: "New Year's" },
    ],
  },
  { label: "Spring Break", departureDate: "2027-03-13", returnDate: "2027-03-21", holidayCoverage: "none", holidays: [] },
  // Shared summer start is May 22 (MCA last day May 21; Imagine last student day May 20, May 21 staff-only).
  // Official calendars checked 2026-09-16 did not verify fall 2027 student return dates; keep 2027-07-09 as a provisional search end and do not invent August.
  { label: "Summer Break", departureDate: "2027-05-22", returnDate: "2027-07-09", holidayCoverage: "none", holidays: [] },
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

export const frontierOrigin = "DFW" as const;
export const frontierSearchDestinations = [
  { destination: "ORD", label: "Chicago O'Hare" },
  { destination: "MDW", label: "Chicago Midway" },
  { destination: "DEN", label: "Denver" },
  { destination: "LAS", label: "Las Vegas" },
  { destination: "MCO", label: "Orlando" },
  { destination: "PHX", label: "Phoenix" },
  { destination: "ATL", label: "Atlanta" },
  { destination: "MIA", label: "Miami" },
] as const;

export const fareSearch = {
  departureDate: "2027-06-18",
  returnDate: "2027-07-09",
  adults: 1,
  cabin: "ECONOMY",
} as const;
