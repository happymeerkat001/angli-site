import { readFile } from "node:fs/promises";
import { expect, test } from "vitest";

test("provides an image-only upload control and conditionally renders the current photo", async () => {
  const component = await readFile(new URL("./SchedulePhotoCard.tsx", import.meta.url), "utf8");

  expect(component).toContain('type="file"');
  expect(component).toContain('accept="image/*"');
  expect(component).toContain("Upload a schedule photo");
  expect(component).toContain('alt="Current paper schedule"');
  expect(component).toContain("{state ? (");
  expect(component).toContain("Updated {");
});
