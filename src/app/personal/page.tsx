import { CalendarDays, Lightbulb, Newspaper, Plane, TrendingUp } from "lucide-react";
import { getCalendarAgenda } from "@/lib/dashboard/calendar";
import { getAnywhereDashboard } from "@/lib/dashboard/flights-anywhere";
import { getFlightDashboard } from "@/lib/dashboard/flights";
import { getNewsDashboard, mixNewsItems } from "@/lib/dashboard/news";
import { getStockAnalysis } from "@/lib/dashboard/stock-analysis";
import { getStockHeadlines, getStockSnapshot } from "@/lib/dashboard/stock";
import { fareSearch } from "@/lib/dashboard/config";
import { isWithinLookaheadWindow, subtractMonths } from "@/lib/dashboard/flex-dates";
import { WeekGrid } from "@/components/WeekGrid";
import { RefreshButton } from "@/components/RefreshButton";
import { RandomInsightCard } from "@/components/RandomInsightCard";
import insights from "@/lib/dashboard/insights.generated.json";
import { refreshFlights, refreshNews, refreshStockAnalysis } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Personal",
  robots: { index: false, follow: false },
};

function durationLabel(durationMinutes: number) {
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

const googleFlightsUrl = "https://www.google.com/travel/flights";

export default async function PersonalPage() {
  const now = new Date();
  const summerStartLooking = subtractMonths(fareSearch.departureDate, 8);
  const summerInWindow = isWithinLookaheadWindow(now, fareSearch.departureDate, 8);
  const [agenda, anywhere, flights, news, stock, stockHeadlines] = await Promise.all([
    getCalendarAgenda(),
    getAnywhereDashboard(),
    getFlightDashboard(),
    getNewsDashboard(),
    getStockSnapshot(),
    getStockHeadlines(),
  ]);
  const stockAnalysis = stock.status === "ok"
    ? await getStockAnalysis(stock.value, stockHeadlines.status === "ok" ? stockHeadlines.value : [])
    : null;
  const headlines = mixNewsItems(
    Object.values(news).flatMap((result) => result.status === "ok" ? result.value : []),
  );

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

      <section className="rounded-[2rem] border border-line bg-card p-7 shadow-sm shadow-ink/5" aria-labelledby="insight-heading">
        <div className="mb-4 flex items-center gap-3"><Lightbulb className="text-accent" aria-hidden="true" /><h2 id="insight-heading" className="font-serif text-2xl font-semibold text-ink">Insight reminder</h2></div>
        <RandomInsightCard insights={insights} />
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
          ) : <p className="text-sm text-muted">News temporarily unavailable.</p>}
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
        <p className="mb-4 text-sm text-muted">Last refreshed: {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Chicago" }).format(new Date(Math.max(...flights.map(({ fetchedAt }) => new Date(fetchedAt).getTime()))))}</p>
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
                </>
              ) : <p className="mt-5 text-sm text-muted">Live price unavailable today.</p>}
            </section>
          ))}
        </div>
      </section>

      <section aria-labelledby="anywhere-heading">
        <div className="mb-6 flex items-center gap-3">
          <Plane className="text-accent" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">Round trip · Economy · 1 adult</p>
            <h2 id="anywhere-heading" className="mt-1 font-serif text-3xl font-semibold text-ink">Cheapest flights anywhere (≤6h)</h2>
          </div>
        </div>
        <section className="rounded-[2rem] border border-line bg-card p-6 shadow-sm shadow-ink/5">
          {anywhere.status === "ok" ? (
            anywhere.value.length > 0 ? (
              <div className="space-y-8">
                {anywhere.value.map((group) => (
                  <section key={group.windowLabel}>
                    <h3 className={`font-serif text-2xl font-semibold ${group.windowLabel === "Summer Break" && isWithinLookaheadWindow(now, group.departureDate, 4) ? "text-red-700" : "text-ink"}`}>{group.windowLabel === "Summer Break" ? "Domestic Summer Break" : group.windowLabel}: {group.departureDate} – {group.returnDate} (start looking {subtractMonths(group.departureDate, 4)})</h3>
                    {group.options.length > 0 ? (
                      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                        {group.options.map((flight) => (
                          <section key={`${flight.airportCode}-${flight.departureDate}-${flight.returnDate}`} className="rounded-[1.5rem] border border-line p-5">
                            <p className="text-sm font-semibold text-accent">{flight.airportCode}</p>
                            <h4 className="mt-2 font-serif text-xl font-semibold text-ink">{flight.destination}</h4>
                            <p className="mt-5 font-serif text-3xl font-semibold text-ink">${flight.amount.toLocaleString()} round trip</p>
                            <p className="mt-2 text-sm text-muted">{durationLabel(flight.durationMinutes)} flight time · {flight.stops === 0 ? "nonstop" : `${flight.stops} stop${flight.stops === 1 ? "" : "s"}`}</p>
                            <p className="mt-2 text-sm text-muted">{flight.departureDate} – {flight.returnDate}</p>
                          </section>
                        ))}
                      </div>
                    ) : <p className="mt-4 text-sm text-muted">No nearby flights found for this break.</p>}
                  </section>
                ))}
              </div>
            ) : <p className="text-sm text-muted">No nearby flights found for the school breaks.</p>
          ) : <p className="text-sm text-muted">{anywhere.message}.</p>}
        </section>
      </section>


    </div>
  );
}
