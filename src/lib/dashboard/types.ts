export type NewsSourceId =
  | "dallas-news"
  | "crosscheck"
  | "google-news"
  | "hoopshype"
  | "stock-news";

export type NewsSource = {
  id: NewsSourceId;
  label: string;
  feedUrl: string;
};

export type NewsItem = {
  id: string;
  title: string;
  url: string;
  publisher: string;
  publishedAt: string | null;
  sourceId: NewsSourceId;
};

export type StockPosition = {
  symbol: "NVDA";
  shares: number;
  costBasisPerShare: number;
};

export type StockSnapshot = {
  symbol: string;
  price: number;
  previousClose: number;
  dayChange: number;
  dayChangePercent: number;
  positionValue: number;
  unrealizedPL: number;
};

export type FlightRoute = {
  origin: "DFW";
  destination: "CRK" | "XIY" | "XUZ";
  label: string;
};

export type CaliforniaAirportCode = "SJC" | "SFO" | "SAN";

export type CaliforniaAirport = {
  origin: "DFW";
  destination: CaliforniaAirportCode;
  label: string;
};

export type FlightSearchRoute = {
  origin: "DFW";
  destination: string;
  label: string;
};

export type FareWindow = {
  label: string;
  departureDate: string;
  returnDate: string;
};

export type FlightSnapshot = FlightSearchRoute & {
  fetchedAt: string;
  amount: number | null;
  currency: "USD" | null;
  departureDate: string;
  returnDate: string;
  stops: number | null;
  durationMinutes?: number;
  status: "available" | "unavailable";
};

export type CalendarEvent = {
  title: string;
  start: string;
  end: string | null;
  location: string | null;
  isAllDay: boolean;
};

export type SourceResult<T> =
  | { status: "ok"; value: T }
  | { status: "error"; message: string };

export type AnywhereFlightOption = {
  destination: string;
  airportCode: string;
  amount: number;
  currency: "USD";
  durationMinutes: number;
  stops: number;
  departureDate: string;
  returnDate: string;
  windowLabel: string;
};

export type AnywhereWindowSection = {
  windowLabel: string;
  departureDate: string;
  returnDate: string;
  options: AnywhereFlightOption[];
};

export type InsightEntry = {
  id: string;
  noteTitle: string;
  insightText: string;
};
