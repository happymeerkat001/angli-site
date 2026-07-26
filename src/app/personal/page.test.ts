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
