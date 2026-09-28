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

test("places the cruise section below the flight sections", async () => {
  const page = await readFile(new URL("./page.tsx", import.meta.url), "utf8");
  const anywhere = page.indexOf('aria-labelledby="anywhere-heading"');
  const cruises = page.indexOf('aria-labelledby="cruises-heading"');

  expect(anywhere).toBeGreaterThanOrEqual(0);
  expect(cruises).toBeGreaterThan(anywhere);
  expect(page).toContain("Refresh cruises");
  expect(page).toContain("readCruiseState");
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
