import { CalendarDays, MapPin, Newspaper, Plane } from "lucide-react";
import { getCalendarAgenda } from "@/lib/dashboard/calendar";
import { getFlightDashboard } from "@/lib/dashboard/flights";
import { getNewsDashboard, mixNewsItems } from "@/lib/dashboard/news";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Personal",
  robots: { index: false, follow: false },
};

export default async function PersonalPage() {
  const [agenda, flights, news] = await Promise.all([
    getCalendarAgenda(),
    getFlightDashboard(),
    getNewsDashboard(),
  ]);
  const headlines = mixNewsItems(
    Object.values(news).flatMap((result) => result.status === "ok" ? result.value : []),
  );

  return (
    <div className="mx-auto max-w-6xl space-y-12">
      <section>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">Personal</p>
        <h1 className="mt-3 font-serif text-5xl font-semibold tracking-tight text-ink">Personal dashboard</h1>
      </section>

      <section aria-labelledby="news-heading">
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

      <section aria-labelledby="fares-heading">
        <div className="mb-6 flex items-center gap-3">
          <Plane className="text-accent" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">Round trip · Economy · 1 adult</p>
            <h2 id="fares-heading" className="mt-1 font-serif text-3xl font-semibold text-ink">Cheapest June–July fares</h2>
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
                  <p className="mt-2 text-sm text-muted">Cheapest {flight.stops === 0 ? "nonstop" : "one-stop"} fare</p>
                </>
              ) : <p className="mt-5 text-sm text-muted">Live price unavailable today.</p>}
            </section>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-line bg-card p-7 shadow-sm shadow-ink/5" aria-labelledby="calendar-heading">
        <div className="flex items-center gap-3">
          <CalendarDays className="text-accent" aria-hidden="true" />
          <h2 id="calendar-heading" className="font-serif text-2xl font-semibold text-ink">Next 30 days</h2>
        </div>
        {agenda.status === "ok" ? (
          agenda.value.length > 0 ? (
            <ul className="mt-6 divide-y divide-line">
              {agenda.value.map((event) => (
                <li key={`${event.start}-${event.title}`} className="py-4 first:pt-0">
                  <p className="font-semibold text-ink">{event.title}</p>
                  <p className="mt-1 text-sm text-muted">{event.isAllDay ? event.start : new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Chicago" }).format(new Date(event.start))}</p>
                  {event.location ? <p className="mt-1 inline-flex items-center gap-1 text-sm text-muted"><MapPin size={14} aria-hidden="true" />{event.location}</p> : null}
                </li>
              ))}
            </ul>
          ) : <p className="mt-6 text-muted">Nothing scheduled in the next 30 days.</p>
        ) : <p className="mt-6 text-sm text-muted">{agenda.message}.</p>}
      </section>
    </div>
  );
}
