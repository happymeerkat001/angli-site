import { CalendarDays, Lightbulb, Newspaper, Plane, TrendingUp } from "lucide-react";
import { getCalendarAgenda } from "@/lib/dashboard/calendar";
import { readFlightState } from "@/lib/dashboard/flight-store";
import { readNewsState } from "@/lib/dashboard/news-store";
import { readSchedulePhotoState } from "@/lib/dashboard/schedule-photo-store";
import { readStockState } from "@/lib/dashboard/stock-store";
import { fareSearch, FRONTIER_DEALS_URL, schoolBreaks, serpApiRenewalDay } from "@/lib/dashboard/config";
import { presentFlightState } from "@/lib/dashboard/flight-store";
import { isWithinLookaheadWindow, nearestUpcomingWindow, nextSerpApiReset, subtractMonths } from "@/lib/dashboard/flex-dates";
import { coveredHolidays, holidayInclusionLabel, holidayRuleCopy, nightsBetween } from "@/lib/dashboard/trip-dates";
import { WeekGrid } from "@/components/WeekGrid";
import { RefreshButton } from "@/components/RefreshButton";
import { RandomInsightCard } from "@/components/RandomInsightCard";
import { SchedulePhotoCard } from "@/components/SchedulePhotoCard";
import { SeasonSelect } from "@/components/SeasonSelect";
import { PurchaseMethodEstimate } from "@/components/PurchaseMethodEstimate";
import insights from "@/lib/dashboard/insights.generated.json";
import type { InsightEntry } from "@/lib/dashboard/types";
import { refreshFlights, refreshFrontier, refreshNews, refreshPoints, refreshStockAnalysis } from "./actions";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const metadata = {
  title: "Personal",
  robots: { index: false, follow: false },
};

function durationLabel(durationMinutes: number) {
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

function chicagoStamp(value: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Chicago" }).format(new Date(value));
}

function staleBanner(rowSeason: string, selectedSeason: string) {
  if (!rowSeason || rowSeason === selectedSeason) return null;
  return `Showing ${rowSeason} — refresh for ${selectedSeason}`;
}

function tripDateLine(departureDate: string, returnDate: string | null) {
  if (!returnDate) return departureDate;
  const nights = nightsBetween(departureDate, returnDate);
  return nights === null ? `${departureDate} – ${returnDate}` : `${departureDate} – ${returnDate} · ${nights} night${nights === 1 ? "" : "s"}`;
}

function holidayMark(departureDate: string, returnDate: string | null, seasonLabel: string) {
  if (!returnDate) return null;
  const schoolBreak = schoolBreaks.find((item) => item.label === seasonLabel);
  if (!schoolBreak) return null;
  return holidayInclusionLabel(coveredHolidays({ departureDate, returnDate }, schoolBreak));
}

const googleFlightsUrl = "https://www.google.com/travel/flights";

export default async function PersonalPage() {
  const now = new Date();
  const summerStartLooking = subtractMonths(fareSearch.departureDate, 8);
  const summerInWindow = isWithinLookaheadWindow(now, fareSearch.departureDate, 8);
  const [agenda, storedFlightState, schedulePhotoState, newsState, stockState] = await Promise.all([
    getCalendarAgenda(),
    readFlightState(),
    readSchedulePhotoState(),
    readNewsState(),
    readStockState(),
  ]);
  const flightState = presentFlightState(storedFlightState);
  const flights = flightState?.flights ?? [];
  const anywhere = flightState?.anywhere ?? { status: "error" as const, message: "Flight data not loaded yet — press Refresh flights" };
  const currentSeason = flightState?.anywhereSeasonLabel ?? nearestUpcomingWindow(now, schoolBreaks).label;
  const selectedBreak = schoolBreaks.find((item) => item.label === currentSeason) ?? nearestUpcomingWindow(now, schoolBreaks);
  const coverage = flightState?.coverageBySeason?.[currentSeason];
  const holidayRule = holidayRuleCopy(selectedBreak);
  const points = flightState?.points ?? { status: "error" as const, message: "Not yet loaded — press Refresh points" };
  const frontier = flightState?.frontier ?? { status: "error" as const, message: "Not yet loaded — press Refresh Frontier" };
  const pointsBanner = staleBanner(flightState?.pointsSeasonLabel ?? "", currentSeason);
  const frontierBanner = staleBanner(flightState?.frontierSeasonLabel ?? "", currentSeason);
  const headlines = newsState?.headlines ?? [];
  const stock = stockState?.snapshot ?? { status: "error" as const, message: "Not yet loaded — press Refresh analysis" };
  const stockHeadlines = stockState?.headlines ?? { status: "error" as const, message: "Not yet loaded — press Refresh analysis" };
  const stockAnalysis = stockState?.analysis ?? null;

  return (
    <div className="mx-auto max-w-6xl space-y-12">
      <section>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">Personal</p>
        <h1 className="mt-3 font-serif text-5xl font-semibold tracking-tight text-ink">Personal dashboard</h1>
      </section>

      <section className="rounded-[2rem] border border-line bg-card p-7 shadow-sm shadow-ink/5" aria-labelledby="calendar-heading">
        <div className="flex items-center gap-3">
          <CalendarDays className="text-accent" aria-hidden="true" />
          <h2 id="calendar-heading" className="font-serif text-2xl font-semibold text-ink">Next 7 Days</h2>
        </div>
        {agenda.status === "ok" ? <WeekGrid events={agenda.value} /> : <p className="mt-6 text-sm text-muted">{agenda.message}.</p>}
      </section>

      <SchedulePhotoCard state={schedulePhotoState} />

      <section className="rounded-[2rem] border border-line bg-card p-7 shadow-sm shadow-ink/5" aria-labelledby="insight-heading">
        <div className="mb-4 flex items-center gap-3"><Lightbulb className="text-accent" aria-hidden="true" /><h2 id="insight-heading" className="font-serif text-2xl font-semibold text-ink">Insight reminder</h2></div>
        <RandomInsightCard insights={insights as InsightEntry[]} />
      </section>

      <section aria-labelledby="news-heading">
        <form action={refreshNews} className="mb-4"><RefreshButton label="Refresh headlines" /></form>
        <div className="mb-6 flex items-center gap-3">
          <Newspaper className="text-accent" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">Daily briefing</p>
            <h2 id="news-heading" className="mt-1 font-serif text-3xl font-semibold text-ink">Mixed headlines</h2>
          </div>
        </div>
        <section className="rounded-[2rem] border border-line bg-card p-6 shadow-sm shadow-ink/5">
          {headlines.length > 0 ? (
            <ul className="grid gap-x-8 divide-y divide-line md:grid-cols-2 md:divide-y-0">
              {headlines.map((item) => (
                <li key={item.id} className="py-4 first:pt-0 md:border-b md:border-line md:[&:nth-child(2)]:pt-0">
                  <a href={item.url} target="_blank" rel="noreferrer" className="text-sm font-medium leading-5 text-ink hover:text-accent">
                    {item.title}
                    <span className="mt-1 block text-xs font-normal text-muted">{item.publisher}</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted">{newsState ? "News temporarily unavailable." : "Not yet loaded — press Refresh headlines."}</p>}
        </section>
      </section>

      <section aria-labelledby="stock-heading">
        <form action={refreshStockAnalysis} className="mb-4"><RefreshButton label="Refresh analysis" /></form>
        <div className="mb-6 flex items-center gap-3">
          <TrendingUp className="text-accent" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">Position overview</p>
            <h2 id="stock-heading" className="mt-1 font-serif text-3xl font-semibold text-ink">NVIDIA (NVDA)</h2>
          </div>
        </div>
        <section className="rounded-[2rem] border border-line bg-card p-6 shadow-sm shadow-ink/5">
          {stock.status === "ok" ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div><p className="text-sm text-muted">Live price</p><p className="mt-1 font-serif text-3xl font-semibold text-ink">${stock.value.price.toLocaleString()}</p><p className={`mt-1 text-sm ${stock.value.dayChange >= 0 ? "text-emerald-700" : "text-red-700"}`}>{stock.value.dayChange >= 0 ? "+" : ""}{stock.value.dayChange.toFixed(2)} ({stock.value.dayChangePercent.toFixed(2)}%)</p></div>
              <div><p className="text-sm text-muted">Position value</p><p className="mt-1 font-serif text-3xl font-semibold text-ink">${stock.value.positionValue.toLocaleString()}</p></div>
              <div><p className="text-sm text-muted">Unrealized P/L</p><p className={`mt-1 font-serif text-3xl font-semibold ${stock.value.unrealizedPL >= 0 ? "text-emerald-700" : "text-red-700"}`}>{stock.value.unrealizedPL >= 0 ? "+" : "−"}${Math.abs(stock.value.unrealizedPL).toLocaleString()}</p></div>
              <div><p className="text-sm text-muted">Suggested limit sell</p><p className="mt-1 font-serif text-3xl font-semibold text-ink">{stockAnalysis?.status === "ok" ? `$${stockAnalysis.value.limitSellPrice.toLocaleString()}` : "Unavailable"}</p></div>
            </div>
          ) : <p className="text-sm text-muted">{stock.message}.</p>}
          {stockAnalysis?.status === "ok" ? <p className="mt-6 text-sm leading-6 text-muted">{stockAnalysis.value.analysis}<span className="mt-2 block text-xs">AI-generated analysis — not financial advice.</span></p> : <p className="mt-6 text-sm text-muted">Analysis unavailable.</p>}
          {stockAnalysis?.status === "ok" ? <p className="mt-2 text-xs text-muted">Last refreshed: {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Chicago" }).format(new Date(stockAnalysis.value.fetchedAt))}</p> : null}
          {stockHeadlines.status === "ok" ? (
            <ul className="mt-6 grid gap-x-8 divide-y divide-line md:grid-cols-2 md:divide-y-0">{stockHeadlines.value.map((item) => <li key={item.id} className="py-3"><a href={item.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-ink hover:text-accent">{item.title}<span className="mt-1 block text-xs font-normal text-muted">{item.publisher}</span></a></li>)}</ul>
          ) : <p className="mt-6 text-sm text-muted">Stock news unavailable.</p>}
        </section>
      </section>

      <section aria-labelledby="fares-heading">
        <form action={refreshFlights} className="mb-4"><RefreshButton label="Refresh flights" /></form>
        <p className="mb-4 text-sm text-muted">Last refreshed: {flightState ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Chicago" }).format(new Date(flightState.fetchedAt)) : "Not yet refreshed"}</p>
        <p className="mb-4 text-sm text-muted">
          Prices below can be stale.{" "}
          <a href={googleFlightsUrl} target="_blank" rel="noreferrer" className="font-medium text-accent hover:underline">
            Check Google Flights for live prices
          </a>
          . Fares tend to be lowest 1–4 months out for domestic hops and 2–8 months out for international routes; prices usually climb fast inside the last 2–3 weeks.
        </p>
        <div className="mb-6 flex items-center gap-3">
          <Plane className="text-accent" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">Round trip · Economy · 1 adult</p>
            <h2 id="fares-heading" className="mt-1 font-serif text-3xl font-semibold text-ink">International Summer Fares</h2>
            <p className={summerInWindow ? "text-red-700" : "text-muted"}>(International {summerStartLooking})</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {flights.map((flight) => (
            <section key={flight.destination} className="rounded-[2rem] border border-line bg-card p-6 shadow-sm shadow-ink/5">
              <p className="text-sm font-semibold text-accent">{flight.origin} → {flight.destination}</p>
              <h3 className="mt-2 font-serif text-2xl font-semibold text-ink">{flight.label}</h3>
              {flight.status === "available" ? (
                <>
                  <p className="mt-5 font-serif text-4xl font-semibold text-ink">${flight.amount?.toLocaleString()}</p>
                  <p className="mt-2 text-sm text-muted">Cheapest {flight.stops === 0 ? "nonstop" : "one-stop"} fare, round trip</p>
                  <p className="mt-2 text-sm text-muted">{flight.departureDate} – {flight.returnDate}</p>
                  <PurchaseMethodEstimate input={{
                    cashAmount: flight.amount,
                    tripType: "round-trip",
                    origin: flight.origin,
                    destination: flight.destination,
                    airlineIdentity: flight.airlineIdentity,
                    identityMissingFromCache: flight.airlineIdentity === undefined,
                  }} />
                </>
              ) : (
                <>
                  <p className="mt-5 text-sm text-muted">Live price unavailable today.</p>
                  <PurchaseMethodEstimate input={{
                    cashAmount: null,
                    tripType: "round-trip",
                    origin: flight.origin,
                    destination: flight.destination,
                    airlineIdentity: flight.airlineIdentity,
                    identityMissingFromCache: flight.airlineIdentity === undefined,
                  }} />
                </>
              )}
            </section>
          ))}
        </div>
      </section>

      <SeasonSelect seasons={schoolBreaks.map(({ label }) => label)} currentSeason={currentSeason} />
      <div className="mb-6 space-y-2 text-sm text-muted">
        <p>Travel window: {selectedBreak.departureDate} – {selectedBreak.returnDate}</p>
        <p>Trips of 3–7 nights, with departure and return inside this break. Lowest found on up to 5 sampled date pairs, not every date in the window.</p>
        {holidayRule ? <p>{holidayRule}</p> : null}
        {coverage?.incomplete ? <p>Some sampled dates failed; showing lowest found from the rest.</p> : null}
      </div>
      <section aria-labelledby="anywhere-heading">
        <div className="mb-6 flex items-center gap-3">
          <Plane className="text-accent" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">Round trip · Economy · 1 adult</p>
            <h2 id="anywhere-heading" className="mt-1 font-serif text-3xl font-semibold text-ink">Cheapest flights anywhere</h2>
          </div>
        </div>
        <section className="rounded-[2rem] border border-line bg-card p-6 shadow-sm shadow-ink/5">
          {anywhere.status === "ok" ? (
            anywhere.value.length > 0 ? (
              <div className="space-y-8">
                {anywhere.value.map((group) => (
                  <section key={group.windowLabel}>
                    <h3 className={`font-serif text-2xl font-semibold ${group.windowLabel === "Summer Break" && isWithinLookaheadWindow(now, group.departureDate, 4) ? "text-red-700" : "text-ink"}`}>{group.windowLabel === "Summer Break" ? "Domestic Summer Break" : group.windowLabel}</h3>
                    <p className="mt-1 text-sm text-muted">Travel window: {group.departureDate} – {group.returnDate} (start looking {subtractMonths(group.departureDate, 4)})</p>
                    {group.options.length > 0 ? (
                      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                        {group.options.map((flight) => (
                          <section key={`${flight.airportCode}-${flight.departureDate}-${flight.returnDate}`} className="rounded-[1.5rem] border border-line p-5">
                            <p className="text-sm font-semibold text-accent">{flight.airportCode}</p>
                            <h4 className="mt-2 font-serif text-xl font-semibold text-ink">{flight.destination}</h4>
                            <p className="mt-5 font-serif text-3xl font-semibold text-ink">${flight.amount.toLocaleString()} round trip</p>
                            <p className="mt-2 text-sm text-muted">{durationLabel(flight.durationMinutes)} flight time · {flight.stops === 0 ? "nonstop" : `${flight.stops} stop${flight.stops === 1 ? "" : "s"}`}</p>
                            <p className="mt-2 text-sm text-muted">{tripDateLine(flight.departureDate, flight.returnDate)}</p>
                            {holidayMark(flight.departureDate, flight.returnDate, group.windowLabel) ? <p className="mt-1 text-sm text-muted">{holidayMark(flight.departureDate, flight.returnDate, group.windowLabel)}</p> : null}
                            <PurchaseMethodEstimate input={{
                              cashAmount: flight.amount,
                              tripType: "round-trip",
                              origin: "DFW",
                              destination: flight.airportCode,
                              airlineIdentity: flight.airlineIdentity,
                              identityMissingFromCache: flight.airlineIdentity === undefined,
                            }} />
                          </section>
                        ))}
                      </div>
                    ) : <p className="mt-4 text-sm text-muted">{coverage?.totalPairs === 0 ? "No remaining 3–7 night trips in this travel window." : "No qualifying 3–7 night trips found for the sampled dates."}</p>}
                  </section>
                ))}
              </div>
            ) : <p className="text-sm text-muted">{coverage?.totalPairs === 0 ? "No remaining 3–7 night trips in this travel window." : "No qualifying 3–7 night trips found for the sampled dates."}</p>
          ) : <p className="text-sm text-muted">{anywhere.message}. SerpApi resets {nextSerpApiReset(now, serpApiRenewalDay)}.</p>}
        </section>
      </section>

      <section aria-labelledby="points-heading">
        <form action={refreshPoints} className="mb-4"><RefreshButton label="Refresh points" /></form>
        {flightState?.pointsFetchedAt ? <p className="mb-4 text-sm text-muted">Last refreshed: {chicagoStamp(flightState.pointsFetchedAt)}</p> : <p className="mb-4 text-sm text-muted">Not yet refreshed</p>}
        <div className="mb-6 flex items-center gap-3">
          <Plane className="text-accent" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">Round trip · Economy · 1 adult</p>
            <h2 id="points-heading" className="mt-1 font-serif text-3xl font-semibold text-ink">Best points value</h2>
          </div>
        </div>
        <section className="rounded-[2rem] border border-line bg-card p-6 shadow-sm shadow-ink/5">
          {pointsBanner ? <p className="mb-4 text-sm font-medium text-red-700">{pointsBanner}</p> : null}
          {points.status === "ok" ? (
            points.value.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {points.value.map((flight) => (
                  <section key={`${flight.airportCode}-${flight.departureDate}-${flight.returnDate}`} className="rounded-[1.5rem] border border-line p-5">
                    <p className="text-sm font-semibold text-accent">{flight.airportCode}</p>
                    <h4 className="mt-2 font-serif text-xl font-semibold text-ink">{flight.destination}</h4>
                    <p className="mt-5 font-serif text-3xl font-semibold text-ink">${flight.amount.toLocaleString()} round trip</p>
                    <p className="mt-2 text-sm text-muted">{durationLabel(flight.durationMinutes)} flight time · {flight.stops === 0 ? "nonstop" : `${flight.stops} stop${flight.stops === 1 ? "" : "s"}`}</p>
                    <p className="mt-2 text-sm text-muted">{tripDateLine(flight.departureDate, flight.returnDate)}</p>
                    {holidayMark(flight.departureDate, flight.returnDate, currentSeason) ? <p className="mt-1 text-sm text-muted">{holidayMark(flight.departureDate, flight.returnDate, currentSeason)}</p> : null}
                    <PurchaseMethodEstimate input={{
                      cashAmount: flight.amount,
                      tripType: "round-trip",
                      origin: "DFW",
                      destination: flight.airportCode,
                      airlineIdentity: flight.airlineIdentity,
                      identityMissingFromCache: flight.airlineIdentity === undefined,
                    }} />
                  </section>
                ))}
              </div>
            ) : <p className="text-sm text-muted">No qualifying 3–7 night points trips found for the sampled dates.</p>
          ) : <p className="text-sm text-muted">{points.message}.</p>}
        </section>
      </section>

      <section aria-labelledby="frontier-heading">
        <form action={refreshFrontier} className="mb-4"><RefreshButton label="Refresh Frontier" /></form>
        {flightState?.frontierFetchedAt ? <p className="mb-4 text-sm text-muted">Last refreshed: {chicagoStamp(flightState.frontierFetchedAt)}</p> : <p className="mb-4 text-sm text-muted">Not yet refreshed</p>}
        <div className="mb-6 flex items-center gap-3">
          <Plane className="text-accent" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">Dallas · Frontier deals</p>
            <h2 id="frontier-heading" className="mt-1 font-serif text-3xl font-semibold text-ink">Frontier from Dallas</h2>
            <p className="mt-1 text-sm text-muted">
              <a href={FRONTIER_DEALS_URL} target="_blank" rel="noreferrer" className="font-medium text-accent hover:underline">Frontier deals board</a>
            </p>
          </div>
        </div>
        <section className="rounded-[2rem] border border-line bg-card p-6 shadow-sm shadow-ink/5">
          {frontierBanner ? <p className="mb-4 text-sm font-medium text-red-700">{frontierBanner}</p> : null}
          {frontier.status === "ok" ? (
            frontier.value.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {frontier.value.map((flight) => (
                  <section key={`${flight.origin}-${flight.airportCode}-${flight.departureDate}-${flight.amount}`} className="rounded-[1.5rem] border border-line p-5">
                    <p className="text-sm font-semibold text-accent">{flight.origin} → {flight.airportCode}</p>
                    <h4 className="mt-2 font-serif text-xl font-semibold text-ink">{flight.destination}</h4>
                    <p className="mt-5 font-serif text-3xl font-semibold text-ink">${flight.amount.toLocaleString()} {flight.tripType === "one-way" ? "one-way" : "round trip"}</p>
                    {flight.durationMinutes !== null && flight.stops !== null ? (
                      <p className="mt-2 text-sm text-muted">{durationLabel(flight.durationMinutes)} flight time · {flight.stops === 0 ? "nonstop" : `${flight.stops} stop${flight.stops === 1 ? "" : "s"}`}</p>
                    ) : null}
                    <p className="mt-2 text-sm text-muted">{tripDateLine(flight.departureDate, flight.returnDate)}</p>
                    {holidayMark(flight.departureDate, flight.returnDate, currentSeason) ? <p className="mt-1 text-sm text-muted">{holidayMark(flight.departureDate, flight.returnDate, currentSeason)}</p> : null}
                    <PurchaseMethodEstimate input={{
                      cashAmount: flight.amount,
                      tripType: flight.tripType === "one-way" ? "one-way" : "round-trip",
                      origin: flight.origin,
                      destination: flight.airportCode,
                      airlineIdentity: flight.airlineIdentity,
                      identityMissingFromCache: flight.airlineIdentity === undefined,
                    }} />
                  </section>
                ))}
              </div>
            ) : <p className="text-sm text-muted">No advertised Frontier round trips fit this 3–7 night window. This is not a complete Frontier search.</p>
          ) : <p className="text-sm text-muted">{frontier.message}.</p>}
        </section>
      </section>


    </div>
  );
}
