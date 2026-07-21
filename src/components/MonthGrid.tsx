import { buildMonthGrids } from "@/lib/dashboard/calendar-grid";
import type { CalendarEvent } from "@/lib/dashboard/types";

export function MonthGrid({ events }: { events: CalendarEvent[] }) {
  return <div className="mt-6 space-y-8">{buildMonthGrids(new Date(), events).map((month) => <section key={month.label}>
    <h3 className="mb-3 font-serif text-xl font-semibold text-ink">{month.label}</h3>
    <div className="grid grid-cols-7 border-l border-t border-line text-xs">{"Sun Mon Tue Wed Thu Fri Sat".split(" ").map((day) => <div key={day} className="border-b border-r border-line bg-card p-2 font-semibold text-muted">{day}</div>)}
      {month.weeks.flat().map((day) => <div key={day.date} className={`min-h-24 border-b border-r border-line p-2 ${day.inMonth ? "bg-card" : "bg-sand/30 text-muted"}`}>
        <p className="font-semibold">{Number(day.date.slice(-2))}</p>
        {day.events.slice(0, 2).map((event) => <p key={`${event.start}-${event.title}`} className="mt-1 truncate rounded bg-accent/10 px-1 text-ink">{event.title}</p>)}
        {day.events.length > 2 ? <p className="mt-1 text-muted">+{day.events.length - 2} more</p> : null}
      </div>)}</div>
  </section>)}</div>;
}
