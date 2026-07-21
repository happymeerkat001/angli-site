export type NewsSourceId =
  | "dallas-news"
  | "crosscheck"
  | "google-news"
  | "hoopshype";

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

export type FlightRoute = {
  origin: "DFW";
  destination: "CRK" | "XIY" | "XUZ" | "SJC";
  label: string;
};

export type FareWindow = {
  label: string;
  departureDate: string;
  returnDate: string;
};

export type FlightSnapshot = FlightRoute & {
  fetchedAt: string;
  amount: number | null;
  currency: "USD" | null;
  departureDate: string;
  returnDate: string;
  stops: number | null;
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
