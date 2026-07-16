import { CalendarDays, ExternalLink, MapPin, Plane } from "lucide-react";
import { getCalendarAgenda } from "@/lib/dashboard/calendar";
import { getFlightDashboard } from "@/lib/dashboard/flights";
import { getNewsDashboard } from "@/lib/dashboard/news";

export const metadata = {
  title: "Personal",
  robots: { index: false, follow: false },
};

export default async function PersonalPage() {
  const [news, flights, agenda] = await Promise.all([
    getNewsDashboard(),
    getFlightDashboard(),
    getCalendarAgenda(),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-12">
      <section>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">Personal</p>
        <h1 className="mt-3 font-serif text-5xl font-semibold tracking-tight text-ink">Personal dashboard</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">Philippines news, flexible travel searches, and your upcoming calendar.</p>
      </section>

      <section aria-labelledby="philippines-heading">
        <div className="mb-7 flex items-center gap-3">
          <Plane className="text-accent" size={22} aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">Philippines & travel</p>
            <h2 id="philippines-heading" className="mt-1 font-serif text-3xl font-semibold text-ink">DFW flexible June searches</h2>
          </div>
        </div>
        <div className="grid gap-5 lg:grid-cols-[1.1fr_1.9fr]">
          <section className="rounded-[2rem] border border-line bg-card p-6 shadow-sm shadow-ink/5">
            <h3 className="font-serif text-xl font-semibold text-ink">Philippines news</h3>
            {news.philippines.status === "ok" ? (
              <ul className="mt-5 space-y-4">
                {news.philippines.value.map((item) => (
                  <li key={item.id}>
                    <a href={item.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-ink hover:text-accent">
                      {item.title}
                    </a>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-5 text-sm text-muted">{news.philippines.message}</p>}
          </section>
          <div className="grid gap-4 sm:grid-cols-2">
            {flights.map((flight) => (
              <a key={flight.destination} href={flight.searchUrl} target="_blank" rel="noreferrer" className="rounded-[2rem] border border-line bg-card p-6 shadow-sm shadow-ink/5 transition hover:-translate-y-1 hover:border-accent/30 hover:shadow-lg">
                <p className="text-sm font-semibold text-accent">{flight.origin} → {flight.destination}</p>
                <h3 className="mt-2 font-serif text-2xl font-semibold text-ink">{flight.label}</h3>
                <p className="mt-3 text-sm text-muted">{flight.departureDate} – {flight.returnDate} · Economy · 1 adult</p>
                <p className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-accent">Search flexible fares in Google Flights <ExternalLink size={15} aria-hidden="true" /></p>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-line bg-card p-7 shadow-sm shadow-ink/5" aria-labelledby="calendar-heading">
        <div className="flex items-center gap-3">
          <CalendarDays className="text-accent" aria-hidden="true" />
          <h2 id="calendar-heading" className="font-serif text-2xl font-semibold text-ink">Next seven days</h2>
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
          ) : <p className="mt-6 text-muted">Nothing scheduled in the next seven days.</p>
        ) : (
          <div className="mt-6 rounded-2xl bg-paper p-5 text-sm text-muted">
            <p>{agenda.message}.</p>
            <p className="mt-2">Add the read-only Google Calendar OAuth client ID, client secret, and refresh token as server-only Vercel environment variables to enable this view.</p>
            <a className="mt-3 inline-flex items-center gap-2 font-semibold text-accent hover:text-accent-hover" href="https://console.cloud.google.com/apis/library/calendar-json.googleapis.com" target="_blank" rel="noreferrer">Open Google Calendar API setup <ExternalLink size={14} aria-hidden="true" /></a>
          </div>
        )}
      </section>
    </div>
  );
}
