import type { CalendarEvent } from "./types";

export type MonthGrid = {
  label: string;
  weeks: Array<Array<{ date: string; inMonth: boolean; events: CalendarEvent[] }>>;
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

export function buildMonthGrids(now: Date, events: CalendarEvent[]): MonthGrid[] {
  const end = new Date(now);
  end.setDate(end.getDate() + 30);
  const months = [new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))];
  if (now.getUTCFullYear() !== end.getUTCFullYear() || now.getUTCMonth() !== end.getUTCMonth()) months.push(new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1)));
  const buckets = new Map<string, CalendarEvent[]>();
  for (const event of events) for (const date of eventDatesInChicago(event)) buckets.set(date, [...(buckets.get(date) ?? []), event]);
  return months.map((month) => {
    const first = new Date(month);
    first.setUTCDate(first.getUTCDate() - first.getUTCDay());
    const weeks = Array.from({ length: 6 }, (_, week) => Array.from({ length: 7 }, (_, day) => {
      const date = new Date(first);
      date.setUTCDate(first.getUTCDate() + week * 7 + day);
      const key = dateKey(date);
      return { date: key, inMonth: date.getUTCMonth() === month.getUTCMonth(), events: buckets.get(key) ?? [] };
    }));
    return { label: new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(month), weeks };
  });
}
