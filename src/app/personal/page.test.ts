import { readFile } from "node:fs/promises";
import { expect, test } from "vitest";

test("places the schedule photo card between the calendar and insight sections", async () => {
  const page = await readFile(new URL("./page.tsx", import.meta.url), "utf8");
  const calendar = page.indexOf('aria-labelledby="calendar-heading"');
  const photoCard = page.indexOf("<SchedulePhotoCard state={schedulePhotoState} />");
  const insight = page.indexOf('aria-labelledby="insight-heading"');

  expect(calendar).toBeGreaterThanOrEqual(0);
  expect(photoCard).toBeGreaterThan(calendar);
  expect(insight).toBeGreaterThan(photoCard);
});

test("drops the six-hour cap from the cash heading and stacks the new rows under it", async () => {
  const page = await readFile(new URL("./page.tsx", import.meta.url), "utf8");
  const cash = page.indexOf('id="anywhere-heading"');
  const points = page.indexOf('id="points-heading"');
  const frontier = page.indexOf('id="frontier-heading"');

  expect(page).toContain("Cheapest flights anywhere");
  expect(page).not.toContain("≤6h");
  expect(page).toContain("Best points value");
  expect(page).toContain("Frontier from Dallas");
  expect(page).toContain("Showing ${rowSeason} — refresh for ${selectedSeason}");
  expect(cash).toBeGreaterThanOrEqual(0);
  expect(points).toBeGreaterThan(cash);
  expect(frontier).toBeGreaterThan(points);
});

test("reads cached news and stock state instead of fetching them during render", async () => {
  const page = await readFile(new URL("./page.tsx", import.meta.url), "utf8");

  expect(page).toContain("readNewsState");
  expect(page).toContain("readStockState");
  expect(page).not.toContain("getNewsDashboard");
  expect(page).not.toContain("getStockSnapshot");
  expect(page).not.toContain("getStockHeadlines");
  expect(page).not.toContain("getStockAnalysis");
});

test("explains travel windows, sampled lowest-found results, and qualifying Frontier trips", async () => {
  const page = await readFile(new URL("./page.tsx", import.meta.url), "utf8");

  expect(page).toContain("Travel window:");
  expect(page).toContain("Trips of 3–7 nights");
  expect(page).toContain("Lowest found on up to 5 sampled date pairs");
  expect(page).toContain("tripDateLine");
  expect(page).toContain("holidayMark");
  expect(page).toContain("Refresh cheapest flights");
  expect(page.indexOf("refreshAnywhere")).toBeGreaterThan(page.indexOf("SeasonSelect"));
  expect(page.indexOf("refreshAnywhere")).toBeLessThan(page.indexOf('id="anywhere-heading"'));
  expect(page).toContain("No qualifying Frontier round trips found for the sampled dates and destinations");
  expect(page).toContain("presentFlightState");
  expect(page).toContain("export const maxDuration = 60");
  expect(page).not.toContain("FRONTIER_DEALS_URL");
  expect(page).not.toContain("flyfrontier.com");
  expect(page).toContain("Frontier-only Google Flights");
  expect(page).toContain("sampled outbound tokens");
  expect(page).toContain("sampled Frontier outbound options");
  expect(page).not.toContain("because of the request budget");
  expect(page).toContain("shared no-school overlap");
  expect(page).toContain("fall 2027 return dates are not verified");
  expect(page).not.toContain("until the 2027");
});

test("adds a purchase-method estimate on every flight card group and shows cash-only points-row prices", async () => {
  const page = await readFile(new URL("./page.tsx", import.meta.url), "utf8");

  expect(page).toContain("PurchaseMethodEstimate");
  expect(page.match(/<PurchaseMethodEstimate/g)?.length).toBe(5);
  expect(page).toContain("${flight.amount.toLocaleString()} round trip");
  expect(page).not.toContain("legacy ranking");
  expect(page).not.toContain("1.5¢");
  expect(page).not.toContain("flight.points");
  expect(page).toContain('id="fares-heading"');
  expect(page).toContain('id="anywhere-heading"');
  expect(page).toContain('id="points-heading"');
  expect(page).toContain('id="frontier-heading"');
});
