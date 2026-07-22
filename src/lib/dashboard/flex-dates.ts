import type { FareWindow } from "./types";

function shiftDate(dateString: string, days: number) {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function buildFlexCandidates(window: FareWindow, maxFlexDays = 5): FareWindow[] {
  const candidates = [window, { ...window, departureDate: shiftDate(window.departureDate, maxFlexDays), returnDate: shiftDate(window.returnDate, -maxFlexDays) }, { ...window, departureDate: shiftDate(window.departureDate, Math.min(3, maxFlexDays)), returnDate: shiftDate(window.returnDate, -maxFlexDays) }, { ...window, departureDate: shiftDate(window.departureDate, maxFlexDays) }, { ...window, returnDate: shiftDate(window.returnDate, -maxFlexDays) }];
  const seen = new Set<string>();
  return candidates.filter((candidate) => candidate.returnDate > candidate.departureDate && !seen.has(`${candidate.departureDate}/${candidate.returnDate}`) && Boolean(seen.add(`${candidate.departureDate}/${candidate.returnDate}`)));
}

export function windowsInBookingRange(now: Date, windows: FareWindow[]): FareWindow[] {
  const today = now.toISOString().slice(0, 10);
  const cutoffDate = new Date(now);
  cutoffDate.setUTCDate(cutoffDate.getUTCDate() + 120);
  const cutoff = cutoffDate.toISOString().slice(0, 10);
  return windows.filter(({ departureDate }) => departureDate > today && departureDate < cutoff);
}
