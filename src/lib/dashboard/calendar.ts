import { google } from "googleapis";
import type { CalendarEvent, SourceResult } from "./types";

type GoogleEvent = {
  status?: string | null;
  summary?: string | null;
  description?: string | null;
  location?: string | null;
  start?: { date?: string | null; dateTime?: string | null } | null;
  end?: { date?: string | null; dateTime?: string | null } | null;
};

export function normalizeCalendarEvents(events: GoogleEvent[]): CalendarEvent[] {
  return events
    .filter((event) => event.status !== "cancelled" && Boolean(event.start?.dateTime || event.start?.date))
    .map((event) => ({
      title: event.summary?.trim() || "Untitled event",
      start: event.start?.dateTime || event.start?.date || "",
      end: event.end?.dateTime || event.end?.date || null,
      location: event.location?.trim() || null,
      isAllDay: Boolean(event.start?.date),
    }))
    .sort((a, b) => a.start.localeCompare(b.start));
}

export function mergeCalendarEvents(eventGroups: CalendarEvent[][]): CalendarEvent[] {
  const seen = new Set<string>();
  return eventGroups.flat().filter((event) => {
    const key = `${event.start}\u0000${event.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => a.start.localeCompare(b.start)).slice(0, 30);
}

export function calendarTimeMax(now: Date) {
  const timeMax = new Date(now);
  timeMax.setDate(timeMax.getDate() + 30);
  return timeMax;
}

function configuredCalendarIds() {
  return process.env.GOOGLE_CALENDAR_IDS?.split(",").map((id) => id.trim()).filter(Boolean) ?? [];
}

export async function getCalendarAgenda(): Promise<SourceResult<CalendarEvent[]>> {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_CALENDAR_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) return { status: "error", message: "Calendar is not connected" };

  try {
    const auth = new google.auth.OAuth2(clientId, clientSecret);
    auth.setCredentials({ refresh_token: refreshToken });
    const calendar = google.calendar({ version: "v3", auth });
    const now = new Date();
    const overrideIds = configuredCalendarIds();
    const calendarIds = overrideIds.length > 0
      ? overrideIds
      : (await calendar.calendarList.list()).data.items?.filter((item) => item.selected !== false).map((item) => item.id).filter((id): id is string => Boolean(id)) ?? [];
    const ids = calendarIds.length > 0 ? calendarIds : [process.env.GOOGLE_CALENDAR_ID || "primary"];
    const results = await Promise.all(ids.map(async (calendarId) => {
      try {
        const response = await calendar.events.list({ calendarId, timeMin: now.toISOString(), timeMax: calendarTimeMax(now).toISOString(), singleEvents: true, orderBy: "startTime", maxResults: 30, timeZone: "America/Chicago" });
        return normalizeCalendarEvents(response.data.items ?? []);
      } catch (error) {
        console.error(`Google Calendar unavailable for ${calendarId}`, error);
        return null;
      }
    }));
    const successful = results.filter((events): events is CalendarEvent[] => events !== null);
    if (successful.length === 0) throw new Error("All calendars unavailable");
    return { status: "ok", value: mergeCalendarEvents(successful) };
  } catch (error) {
    console.error("Google Calendar unavailable", error);
    return { status: "error", message: "Calendar temporarily unavailable" };
  }
}
