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

export type AirlineCodeSource = "airline_code" | "flight_number" | "logo" | "name";

export type AirlineOperatorStatus = "verified-operating" | "reported-marketing" | "codeshare-unverified" | "unknown";

export type AirlineRef = {
  name: string | null;
  iata: string | null;
  iataSource: AirlineCodeSource | null;
  operatingName: string | null;
  operatorStatus: AirlineOperatorStatus;
};

export type FlightAirlineIdentity = {
  kind: "single" | "mixed" | "unknown";
  segments: AirlineRef[];
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
  airlineIdentity?: FlightAirlineIdentity;
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
  airlineIdentity?: FlightAirlineIdentity;
};

export type AnywhereWindowSection = {
  windowLabel: string;
  departureDate: string;
  returnDate: string;
  options: AnywhereFlightOption[];
};

export type AnywhereDashboardValue = {
  sections: AnywhereWindowSection[];
  pile: AnywhereFlightOption[];
};

export type PointsProgram = "Chase" | "Amex";

export type PointsFlightOption = AnywhereFlightOption & {
  program: PointsProgram;
  points: number;
};

export type FrontierTripType = "one-way" | "round-trip";

export type FrontierDealOption = {
  origin: string;
  destination: string;
  airportCode: string;
  amount: number;
  currency: "USD";
  durationMinutes: number | null;
  stops: number | null;
  departureDate: string;
  returnDate: string | null;
  tripType: FrontierTripType;
  windowLabel: string;
  airlineIdentity?: FlightAirlineIdentity;
};

export type TextInsightEntry = {
  kind: "text";
  id: string;
  noteTitle: string;
  insightText: string;
};

export type ImageInsightEntry = {
  kind: "image";
  id: string;
  noteTitle: string;
  imageUrl: string;
  caption: string;
};

export type InsightEntry = TextInsightEntry | ImageInsightEntry;
