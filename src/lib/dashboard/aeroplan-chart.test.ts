import { expect, test } from "vitest";
import { classifyAeroplanOperator, estimateAeroplanAward } from "./aeroplan-chart";

test("does not default a missing operator to other-partner", () => {
  expect(classifyAeroplanOperator(null)).toBeNull();
  expect(estimateAeroplanAward({
    originZone: "North America",
    destinationZone: "North America",
    distanceMiles: 800,
  })).toMatchObject({ status: "unknown" });
});

test("returns unknown for Air Canada/select partners instead of using other-partner numbers as a floor", () => {
  expect(classifyAeroplanOperator("UA")).toBe("air-canada-or-select-dynamic");
  expect(estimateAeroplanAward({
    originZone: "North America",
    destinationZone: "North America",
    distanceMiles: 800,
    operatingIata: "UA",
  })).toMatchObject({
    status: "unknown",
    reason: expect.stringContaining("not a floor"),
  });
});

test("returns unknown for unsupported operators such as Frontier", () => {
  expect(classifyAeroplanOperator("F9")).toBeNull();
  expect(estimateAeroplanAward({
    originZone: "North America",
    destinationZone: "North America",
    distanceMiles: 800,
    operatingIata: "F9",
  }).status).toBe("unknown");
});

test("applies the published other-partner economy chart only for a confirmed other partner", () => {
  expect(estimateAeroplanAward({
    originZone: "North America",
    destinationZone: "North America",
    distanceMiles: 800,
    operatingIata: "LH",
  })).toMatchObject({
    status: "conditional",
    oneWayPoints: 10000,
    fees: "unknown",
    operator: "other-partner-fixed",
  });
});

test("keeps fees unknown even when a chart amount applies", () => {
  const estimate = estimateAeroplanAward({
    originZone: "North America",
    destinationZone: "Pacific",
    distanceMiles: 8000,
    operatingIata: "NH",
  });
  expect(estimate.status).toBe("conditional");
  if (estimate.status !== "conditional") throw new Error("expected conditional");
  expect(estimate.fees).toBe("unknown");
  expect(estimate.note).toMatch(/CAD39/);
});
