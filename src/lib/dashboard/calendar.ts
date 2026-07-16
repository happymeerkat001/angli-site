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
    .map((event) => {
      const isAllDay = Boolean(event.start?.date);
      return {
        title: event.summary?.trim() || "Untitled event",
        start: event.start?.dateTime || event.start?.date || "",
        end: event.end?.dateTime || event.end?.date || null,
        location: event.location?.trim() || null,
        isAllDay,
      };
    })
    .sort((a, b) => a.start.localeCompare(b.start));
}

export function calendarTimeMax(now: Date) {
  const timeMax = new Date(now);
  timeMax.setDate(timeMax.getDate() + 30);
  return timeMax;
}

export async function getCalendarAgenda(): Promise<SourceResult<CalendarEvent[]>> {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_CALENDAR_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    return { status: "error", message: "Calendar is not connected" };
  }

  try {
    const auth = new google.auth.OAuth2(clientId, clientSecret);
    auth.setCredentials({ refresh_token: refreshToken });
    const calendar = google.calendar({ version: "v3", auth });
    const now = new Date();
    const response = await calendar.events.list({
      calendarId: process.env.GOOGLE_CALENDAR_ID || "primary",
      timeMin: now.toISOString(),
      timeMax: calendarTimeMax(now).toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 15,
      timeZone: "America/Chicago",
    });

    return { status: "ok", value: normalizeCalendarEvents(response.data.items ?? []) };
  } catch (error) {
    console.error("Google Calendar unavailable", error);
    return { status: "error", message: "Calendar temporarily unavailable" };
  }
}
