import { expect, test } from "vitest";
import { getFlightDashboard } from "./flights";

test("provides flexible Google Flights searches when no price API is configured", async () => {
  const flights = await getFlightDashboard();

  expect(flights).toHaveLength(4);
  expect(flights[0]).toMatchObject({
    destination: "CRK",
    status: "search-only",
    amount: null,
  });
  expect(flights[0].searchUrl).toContain("DFW.CRK");
});
