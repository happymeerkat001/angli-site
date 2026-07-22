import type { CalendarEvent } from "./types";

export type WeekDay = {
  date: string;
  label: string;
  events: CalendarEvent[];
};

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function chicagoDate(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(date).split("/").reverse().join("-");
}

export function eventDatesInChicago(event: CalendarEvent): string[] {
  if (event.isAllDay) {
    const end = event.end ? new Date(`${event.end}T00:00:00Z`) : new Date(`${event.start}T00:00:00Z`);
    const dates: string[] = [];
    for (const date = new Date(`${event.start}T00:00:00Z`); date < end || dates.length === 0; date.setUTCDate(date.getUTCDate() + 1)) dates.push(dateKey(date));
    return dates;
  }
  return [chicagoDate(new Date(event.start))];
}

export function buildWeekStrip(now: Date, events: CalendarEvent[]): WeekDay[] {
  const buckets = new Map<string, CalendarEvent[]>();
  for (const event of events) for (const date of eventDatesInChicago(event)) buckets.set(date, [...(buckets.get(date) ?? []), event]);

  const start = new Date(`${chicagoDate(now)}T00:00:00Z`);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    const key = dateKey(date);
    return {
      date: key,
      label: new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }).format(date),
      events: buckets.get(key) ?? [],
    };
  });
}
