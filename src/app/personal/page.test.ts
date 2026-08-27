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
