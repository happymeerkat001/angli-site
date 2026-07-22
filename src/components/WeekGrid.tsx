import { buildWeekStrip } from "@/lib/dashboard/calendar-grid";
import type { CalendarEvent } from "@/lib/dashboard/types";

export function WeekGrid({ events }: { events: CalendarEvent[] }) {
  return <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-7">{buildWeekStrip(new Date(), events).map((day) => (
    <section key={day.date} className="rounded-2xl border border-line bg-card p-4">
      <h3 className="font-serif text-lg font-semibold text-ink">{day.label}</h3>
      {day.events.length > 0 ? <ul className="mt-3 space-y-2">{day.events.map((event) => (
        <li key={`${event.start}-${event.title}`} className="rounded bg-accent/10 px-2 py-1 text-sm text-ink"><p>{event.title}</p>{!event.isAllDay ? <p className="text-xs text-muted">{new Intl.DateTimeFormat("en-US", { timeStyle: "short", timeZone: "America/Chicago" }).format(new Date(event.start))}</p> : null}{event.location ? <p className="text-xs text-muted">{event.location}</p> : null}</li>
      ))}</ul> : <p className="mt-3 text-sm text-muted">No events</p>}
    </section>
  ))}</div>;
}
