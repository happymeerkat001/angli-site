import { cruiseGuestCount, cruiseLines, cruiseParty, cruiseSearch, type CruiseChild } from "./config";
import { absoluteUrl, fetchJson, isRecord, isoDate } from "./cruise-http";

export type ParsedCruiseSailing = {
  id: string;
  line: string;
  ship: string;
  title: string;
  departurePortCode: string;
  roundtrip: boolean;
  departureDate: string;
  returnDate: string;
  nights: number;
  cashAmount: number;
  url: string;
};

export type CruiseLineFetch = {
  line: (typeof cruiseLines)[number];
  ok: boolean;
  sailings: ParsedCruiseSailing[];
};

const royalOrigin = "https://www.royalcaribbean.com";
const norwegianOrigin = "https://www.ncl.com";
const princessOrigin = "https://gw.api.princess.com/pcl-web/internal";
const princessSite = "https://www.princess.com";
// Public storefront client id published in princess.com's cruise-search bundle. Not a private credential.
const princessClientId = "32e7224ac6cc41302f673c5f5d27b4ba";

const royalQuery = `query cruiseSearch_Cruises($filters: String, $pagination: CruiseSearchPagination) {
  cruiseSearch(filters: $filters, pagination: $pagination) {
    results {
      total
      cruises {
        id
        masterSailing {
          itinerary {
            name
            sailingNights
            ship { name }
            departurePort { code }
            days { ports { port { code } } }
          }
        }
        sailings {
          id
          startDate
          endDate
          bookingLink
          taxesAndFees { value }
          taxesAndFeesIncluded
          stateroomClassPricing { price { value } }
        }
      }
    }
  }
}`;

function royalPortCodes(days: unknown) {
  if (!Array.isArray(days)) return [];
  return days.flatMap((day) => {
    if (!isRecord(day) || !Array.isArray(day.ports)) return [];
    return day.ports.flatMap((stop) => {
      if (!isRecord(stop) || !isRecord(stop.port) || typeof stop.port.code !== "string") return [];
      return [stop.port.code];
    });
  });
}

function royalCash(sailing: Record<string, unknown>) {
  const pricing = Array.isArray(sailing.stateroomClassPricing) ? sailing.stateroomClassPricing : [];
  const prices = pricing.flatMap((item) => {
    if (!isRecord(item) || !isRecord(item.price) || typeof item.price.value !== "number" || item.price.value <= 0) return [];
    return [item.price.value];
  });
  if (prices.length === 0) return null;
  const taxes = sailing.taxesAndFeesIncluded === false && isRecord(sailing.taxesAndFees) && typeof sailing.taxesAndFees.value === "number"
    ? sailing.taxesAndFees.value
    : 0;
  return Math.min(...prices) + taxes;
}

export function parseRoyalCruiseSearch(payload: unknown): ParsedCruiseSailing[] {
  if (!isRecord(payload) || !isRecord(payload.data) || !isRecord(payload.data.cruiseSearch) || !isRecord(payload.data.cruiseSearch.results)) {
    throw new Error("Royal Caribbean search response could not be read");
  }
  const cruises = payload.data.cruiseSearch.results.cruises;
  if (!Array.isArray(cruises)) throw new Error("Royal Caribbean search response could not be read");

  return cruises.flatMap((cruise) => {
    if (!isRecord(cruise) || !isRecord(cruise.masterSailing) || !isRecord(cruise.masterSailing.itinerary)) return [];
    const itinerary = cruise.masterSailing.itinerary;
    const title = typeof itinerary.name === "string" ? itinerary.name : null;
    const ship = isRecord(itinerary.ship) && typeof itinerary.ship.name === "string" ? itinerary.ship.name : null;
    const departurePortCode = isRecord(itinerary.departurePort) && typeof itinerary.departurePort.code === "string"
      ? itinerary.departurePort.code
      : null;
    const nights = typeof itinerary.sailingNights === "number" ? itinerary.sailingNights : null;
    const ports = royalPortCodes(itinerary.days);
    if (!title || !ship || !departurePortCode || nights === null) return [];
    const roundtrip = ports.length > 0 && ports[0] === cruiseSearch.portCode && ports[ports.length - 1] === cruiseSearch.portCode;

    return (Array.isArray(cruise.sailings) ? cruise.sailings : []).flatMap((sailing) => {
      if (!isRecord(sailing)) return [];
      const id = typeof sailing.id === "string" ? sailing.id : null;
      const departureDate = isoDate(sailing.startDate);
      const returnDate = isoDate(sailing.endDate);
      const cashAmount = royalCash(sailing);
      if (!id || !departureDate || !returnDate || cashAmount === null) return [];
      return [{
        id: `royal:${id}`,
        line: "Royal Caribbean",
        ship,
        title,
        departurePortCode,
        roundtrip,
        departureDate,
        returnDate,
        nights,
        cashAmount,
        url: absoluteUrl(royalOrigin, sailing.bookingLink, `${royalOrigin}/cruises?search=departurePort:${cruiseSearch.portCode}`),
      }];
    });
  });
}

async function fetchRoyalPage(skip: number) {
  return await fetchJson(`${royalOrigin}/cruises/graph`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: royalOrigin },
    body: JSON.stringify({
      query: royalQuery,
      variables: {
        filters: `departurePort:${cruiseSearch.portCode}`,
        pagination: { count: 20, skip },
      },
    }),
  });
}

export async function fetchRoyalSailings() {
  const cruises = [];
  let skip = 0;
  let total = Number.POSITIVE_INFINITY;
  while (skip < total && skip < 100) {
    const page = await fetchRoyalPage(skip);
    if (!isRecord(page) || !isRecord(page.data) || !isRecord(page.data.cruiseSearch) || !isRecord(page.data.cruiseSearch.results)) {
      throw new Error("Royal Caribbean search response could not be read");
    }
    const results = page.data.cruiseSearch.results;
    total = typeof results.total === "number" ? results.total : skip;
    const batch = Array.isArray(results.cruises) ? results.cruises : [];
    cruises.push(...batch);
    if (batch.length === 0) break;
    skip += batch.length;
  }
  return parseRoyalCruiseSearch({ data: { cruiseSearch: { results: { total, cruises } } } });
}

type NorwegianItinerary = {
  code?: unknown;
  title?: unknown;
  embarkationPort?: { code?: unknown };
  disembarkationPort?: { code?: unknown };
  ship?: { title?: unknown };
  duration?: { days?: unknown };
};

type NorwegianDetail = {
  sailings?: unknown;
};

export function parseNorwegianItinerary(itinerary: NorwegianItinerary, detail: NorwegianDetail): ParsedCruiseSailing[] {
  const code = typeof itinerary.code === "string" ? itinerary.code : null;
  const title = typeof itinerary.title === "string" ? itinerary.title : null;
  const ship = typeof itinerary.ship?.title === "string" ? itinerary.ship.title : null;
  const nights = typeof itinerary.duration?.days === "number" ? itinerary.duration.days : null;
  const departurePortCode = typeof itinerary.embarkationPort?.code === "string" ? itinerary.embarkationPort.code : null;
  const arrivalPortCode = typeof itinerary.disembarkationPort?.code === "string" ? itinerary.disembarkationPort.code : null;
  if (!code || !title || !ship || nights === null || !departurePortCode) return [];

  return (Array.isArray(detail.sailings) ? detail.sailings : []).flatMap((sailing) => {
    if (!isRecord(sailing)) return [];
    const id = typeof sailing.sailId === "string" ? sailing.sailId : null;
    const departureDate = isoDate(sailing.sailingStartDate);
    const returnDate = isoDate(sailing.sailingEndDate);
    const pricing = Array.isArray(sailing.pricing) ? sailing.pricing : [];
    const fares = pricing.flatMap((cabin) => {
      if (!isRecord(cabin) || cabin.statusText === "Sold Out" || typeof cabin.combinedPrice !== "number" || cabin.combinedPrice <= 0) return [];
      return [cabin.combinedPrice];
    });
    if (!id || !departureDate || !returnDate || fares.length === 0) return [];
    return [{
      id: `norwegian:${id}`,
      line: "Norwegian",
      ship,
      title,
      departurePortCode,
      roundtrip: departurePortCode === cruiseSearch.portCode && arrivalPortCode === cruiseSearch.portCode,
      departureDate,
      returnDate,
      nights,
      cashAmount: Math.min(...fares),
      url: `${norwegianOrigin}/vacations?itineraryCode=${encodeURIComponent(code)}`,
    }];
  });
}

async function fetchNorwegianItineraries() {
  const itineraries: NorwegianItinerary[] = [];
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;
  while (offset < total && offset < 200) {
    const params = new URLSearchParams({
      embPorts: cruiseSearch.portCode,
      guests: String(cruiseGuestCount()),
      limit: "50",
      offset: String(offset),
    });
    const page = await fetchJson(`${norwegianOrigin}/api/v2/vacations/search?${params.toString()}`);
    if (!isRecord(page) || !Array.isArray(page.itineraries)) throw new Error("Norwegian search response could not be read");
    total = typeof page.total === "number" ? page.total : offset;
    itineraries.push(...page.itineraries as NorwegianItinerary[]);
    if (page.itineraries.length === 0) break;
    offset += page.itineraries.length;
  }
  return itineraries;
}

export async function fetchNorwegianSailings() {
  const itineraries = await fetchNorwegianItineraries();
  const roundTrips = itineraries.filter((itinerary) => (
    itinerary.embarkationPort?.code === cruiseSearch.portCode
    && itinerary.disembarkationPort?.code === cruiseSearch.portCode
    && typeof itinerary.code === "string"
  ));
  const details = await Promise.all(roundTrips.map(async (itinerary) => {
    try {
      const detail = await fetchJson(`${norwegianOrigin}/api/vacations/search/${itinerary.code}?guests=${cruiseGuestCount()}`);
      return parseNorwegianItinerary(itinerary, isRecord(detail) ? detail as NorwegianDetail : {});
    } catch (error) {
      console.error(`Norwegian itinerary unavailable: ${String(itinerary.code)}`, error);
      return [];
    }
  }));
  return details.flat();
}

type PrincessCruise = {
  id?: unknown;
  startDate?: unknown;
  endDate?: unknown;
  voyage?: {
    duration?: unknown;
    startPortId?: unknown;
    endPortId?: unknown;
    ship?: { id?: unknown };
  };
};

function lowestPrincessFare(pricing: unknown) {
  if (!isRecord(pricing) || !Array.isArray(pricing.fares)) return null;
  const fares = pricing.fares.flatMap((fare) => {
    if (!isRecord(fare) || !Array.isArray(fare.categories)) return [];
    return fare.categories.flatMap((category) => {
      if (!isRecord(category) || category.status === "N" || category.status === "E" || !Array.isArray(category.guests)) return [];
      const guest = category.guests[0];
      if (!isRecord(guest) || typeof guest.fare !== "number" || guest.fare <= 0) return [];
      const taxesIncluded = category.igvtIncluded === "Y" && category.rcfeIncluded === "Y";
      const taxes = !taxesIncluded && isRecord(pricing.tfpe) && typeof pricing.tfpe.lowerBth === "number" ? pricing.tfpe.lowerBth : 0;
      return [guest.fare + taxes];
    });
  });
  return fares.length > 0 ? Math.min(...fares) : null;
}

export function parsePrincessSailings(
  productsPayload: unknown,
  shipsPayload: unknown,
  prices: ReadonlyMap<string, number>,
): ParsedCruiseSailing[] {
  if (!isRecord(productsPayload) || !Array.isArray(productsPayload.products)) {
    throw new Error("Princess search response could not be read");
  }
  const shipNames = new Map<string, string>();
  if (isRecord(shipsPayload) && Array.isArray(shipsPayload.ships)) {
    for (const ship of shipsPayload.ships) {
      if (isRecord(ship) && typeof ship.id === "string" && typeof ship.name === "string") shipNames.set(ship.id, ship.name);
    }
  }

  return productsPayload.products.flatMap((product) => {
    if (!isRecord(product) || typeof product.name !== "string" || !Array.isArray(product.cruises)) return [];
    return (product.cruises as PrincessCruise[]).flatMap((cruise) => {
      const id = typeof cruise.id === "string" ? cruise.id : null;
      const voyage = cruise.voyage;
      const departurePortCode = typeof voyage?.startPortId === "string" ? voyage.startPortId : null;
      const arrivalPortCode = typeof voyage?.endPortId === "string" ? voyage.endPortId : null;
      const nights = typeof voyage?.duration === "number" ? voyage.duration : null;
      const shipId = typeof voyage?.ship?.id === "string" ? voyage.ship.id : null;
      const departureDate = isoDate(cruise.startDate);
      const returnDate = isoDate(cruise.endDate);
      const cashAmount = id ? prices.get(id) : undefined;
      const galvestonRoundTrip = departurePortCode === "GLS" && arrivalPortCode === "GLS";
      if (!id || !galvestonRoundTrip || nights === null || !shipId || !departureDate || !returnDate || cashAmount === undefined) return [];
      return [{
        id: `princess:${id}`,
        line: "Princess",
        ship: shipNames.get(shipId) ?? shipId,
        title: product.name as string,
        departurePortCode: cruiseSearch.portCode,
        roundtrip: true,
        departureDate,
        returnDate,
        nights,
        cashAmount,
        url: `${princessSite}/cruise-search/details/?voyageCode=${encodeURIComponent(id)}`,
      }];
    });
  });
}

export function princessBookingGuests(party: { adults: number; children: readonly CruiseChild[] } = cruiseParty) {
  return [
    ...Array.from({ length: party.adults }, () => ({ country: "US", homeCity: "LAX" })),
    ...party.children.map((child) => ({ country: "US", homeCity: "LAX", age: child.age })),
  ];
}

function princessHeaders() {
  return {
    Origin: princessSite,
    "pcl-client-id": princessClientId,
    ProductCompany: "PC",
    BookingCompany: "PC",
    ReqSrc: "W",
  };
}

async function fetchPrincessPrices(voyageIds: string[]) {
  const prices = new Map<string, number>();
  for (let index = 0; index < voyageIds.length; index += 25) {
    const cruises = voyageIds.slice(index, index + 25);
    const payload = await fetchJson(`${princessOrigin}/caps/pc/pricing/v1/cruises`, {
      method: "POST",
      headers: { ...princessHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        booking: {
          bookingAgency: { id: "DIRPB", currency: "USD" },
          currencyCode: "USD",
          guests: princessBookingGuests(),
          promos: [],
        },
        filters: {
          availabilities: ["Y", "G", "B"],
          cruiseType: "C",
          cruises,
        },
        leadInBy: "voyages",
        retrieveFlags: { additionalGuestFare: true, roundUpFare: true, includeTfpe: true },
      }),
    });
    if (!isRecord(payload) || !Array.isArray(payload.products)) throw new Error("Princess pricing response could not be read");
    for (const product of payload.products) {
      if (!isRecord(product) || !Array.isArray(product.cruises)) continue;
      for (const cruise of product.cruises) {
        if (!isRecord(cruise) || typeof cruise.id !== "string") continue;
        const fare = lowestPrincessFare(cruise.pricing);
        if (fare !== null) prices.set(cruise.id, fare);
      }
    }
  }
  return prices;
}

export async function fetchPrincessSailings() {
  const params = new URLSearchParams({
    agencyCountry: "US",
    cruiseType: "C",
    voyageStatus: "A",
    webDisplay: "Y",
    promoFilter: "all",
    light: "false",
  });
  const [products, ships] = await Promise.all([
    fetchJson(`${princessOrigin}/resdb/p1.0/products?${params.toString()}`, { headers: princessHeaders() }),
    fetchJson(`${princessOrigin}/resdb/p1.0/ships`, { headers: princessHeaders() }),
  ]);
  if (!isRecord(products) || !Array.isArray(products.products)) throw new Error("Princess search response could not be read");
  const voyageIds = products.products.flatMap((product) => {
    if (!isRecord(product) || !Array.isArray(product.cruises)) return [];
    return product.cruises.flatMap((cruise) => {
      if (!isRecord(cruise) || typeof cruise.id !== "string" || !isRecord(cruise.voyage)) return [];
      return cruise.voyage.startPortId === "GLS" && cruise.voyage.endPortId === "GLS" ? [cruise.id] : [];
    });
  });
  const prices = voyageIds.length > 0 ? await fetchPrincessPrices(voyageIds) : new Map<string, number>();
  return parsePrincessSailings(products, ships, prices);
}

const lineFetchers: Record<(typeof cruiseLines)[number], () => Promise<ParsedCruiseSailing[]>> = {
  "Royal Caribbean": fetchRoyalSailings,
  Norwegian: fetchNorwegianSailings,
  Princess: fetchPrincessSailings,
};

export async function fetchCruiseLines(): Promise<CruiseLineFetch[]> {
  return await Promise.all(cruiseLines.map(async (line) => {
    try {
      return { line, ok: true, sailings: await lineFetchers[line]() };
    } catch (error) {
      console.error(`Cruise line unavailable: ${line}`, error);
      return { line, ok: false, sailings: [] };
    }
  }));
}
