import { readFile } from "node:fs/promises";
import { expect, test } from "vitest";

test("shows a concise estimate, portal booking links, and per-path sources without itinerary-wide coverage claims", async () => {
  const source = await readFile(new URL("./PurchaseMethodEstimate.tsx", import.meta.url), "utf8");

  expect(source).toContain("rec.headline");
  expect(source).toContain("<details");
  expect(source).toContain("break-words");
  expect(source).toContain("rec.portalLinks.chaseTravel");
  expect(source).toContain("rec.portalLinks.amexTravel");
  expect(source).toContain("path.partner.transferSourceUrl");
  expect(source).toContain("path.bookingSourceUrl");
  expect(source).toContain("if eligible cash is charged");
  expect(source).not.toContain("covers returned segments");
  expect(source).not.toContain("legacy ranking");
  expect(source).toContain("Possible");
  expect(source).toContain("Verify operator and inventory");
});
