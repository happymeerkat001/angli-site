import { readFile } from "node:fs/promises";
import { expect, test } from "vitest";
import {
  EXCLUDED_EXPIRED_PARTNERS,
  PARTNER_SOURCES,
  TRANSFER_PARTNERS,
  amexUsAirlineTransferFeeUsd,
  bookableIatas,
  pointsNeededForMiles,
  transferPathsForReportedCarrier,
} from "./rewards-partners";

const AEROPLAN_CONVERSION = "https://www.aircanada.com/us/en/aco/home/aeroplan/your-aeroplan/conversion-programs.html";

test("encodes only the two Aeroplan conversion-page 1:1 ratios, not a universal Chase or Amex rate", () => {
  const known = TRANSFER_PARTNERS.filter((partner) => partner.transferRatio.fromPoints !== null);
  expect(known.map((partner) => partner.id).sort()).toEqual(["amex-aeroplan", "chase-aeroplan"]);
  expect(known.every((partner) => partner.transferRatio.fromPoints === 1 && partner.transferRatio.toMiles === 1)).toBe(true);
  expect(known.every((partner) => partner.transferRatio.sourceUrl === AEROPLAN_CONVERSION)).toBe(true);
  expect(known.every((partner) => partner.increment === 1000 && partner.incrementSourceUrl === AEROPLAN_CONVERSION)).toBe(true);
  expect(TRANSFER_PARTNERS.some((partner) => partner.transferRatio.sourceUrl.includes("sapphire-cards/personal/preferred"))).toBe(false);
});

test("excludes unknown ratios from numerical estimates and uses Aeroplan 1:1 with 1,000-point increments", () => {
  const amexDelta = TRANSFER_PARTNERS.find((partner) => partner.id === "amex-delta");
  const chaseUnited = TRANSFER_PARTNERS.find((partner) => partner.id === "chase-united");
  const chaseAeroplan = TRANSFER_PARTNERS.find((partner) => partner.id === "chase-aeroplan");
  const amexAeroplan = TRANSFER_PARTNERS.find((partner) => partner.id === "amex-aeroplan");
  expect(pointsNeededForMiles(10000, amexDelta!.transferRatio, amexDelta!.increment)).toBeNull();
  expect(pointsNeededForMiles(1500, chaseUnited!.transferRatio, chaseUnited!.increment)).toBeNull();
  expect(pointsNeededForMiles(1500, chaseAeroplan!.transferRatio, chaseAeroplan!.increment)).toBe(2000);
  expect(pointsNeededForMiles(500, amexAeroplan!.transferRatio, amexAeroplan!.increment)).toBe(1000);
});

test("keeps Chase 1,000-point increments from the issuer transfer page without inventing a Reserve ratio for other airlines", () => {
  const united = TRANSFER_PARTNERS.find((partner) => partner.id === "chase-united");
  expect(united?.increment).toBe(1000);
  expect(united?.incrementSourceUrl).toContain("how-to-transfer-chase-ultimate-rewards-points");
  expect(united?.transferRatio.fromPoints).toBeNull();
  expect(united && united.transferRatio.fromPoints === null ? united.transferRatio.note : "").toMatch(/Sapphire Preferred/);
});

test("does not cite Sapphire Preferred or a generic Amex points-value page as ratio proof", async () => {
  const source = await readFile(new URL("./rewards-partners.ts", import.meta.url), "utf8");
  expect(PARTNER_SOURCES.aeroplanConversion).toBe(AEROPLAN_CONVERSION);
  expect(source).not.toContain("sapphire-cards/personal/preferred");
  expect(source).not.toContain("american-express-points-value");
  expect(source).toContain(AEROPLAN_CONVERSION);
});

test("maps American via British Airways Avios and United via Aeroplan, not as Chase/Amex own-metal", () => {
  const aa = transferPathsForReportedCarrier("AA", true);
  const ua = transferPathsForReportedCarrier("UA", true);
  expect(aa.some((path) => path.partner.id === "chase-united")).toBe(false);
  expect(aa.some((path) => path.partner.id === "chase-british-airways" && path.relationship === "published-partner")).toBe(true);
  expect(ua.some((path) => path.partner.id === "chase-united" && path.relationship === "own-metal")).toBe(true);
  expect(ua.some((path) => path.partner.id === "chase-aeroplan" && path.relationship === "published-partner")).toBe(true);
});

test("does not invent Frontier as a transfer partner or American as issuer own-metal", () => {
  expect(transferPathsForReportedCarrier("F9", true)).toEqual([]);
  expect(TRANSFER_PARTNERS.every((partner) => (
    !partner.bookableAirlines.some((airline) => airline.iata === "AA" && airline.relationship === "own-metal")
  ))).toBe(true);
});

test("does not treat Juneyao HO as a Star Alliance member mapping or include unverified OK", () => {
  expect(TRANSFER_PARTNERS.some((partner) => bookableIatas(partner).includes("HO"))).toBe(false);
  expect(TRANSFER_PARTNERS.some((partner) => bookableIatas(partner).includes("OK"))).toBe(false);
});

test("caps the Amex US airline excise at $99", () => {
  expect(amexUsAirlineTransferFeeUsd(100_000)).toBe(60);
  expect(amexUsAirlineTransferFeeUsd(200_000)).toBe(99);
  expect(amexUsAirlineTransferFeeUsd(-1)).toBeNull();
});

test("excludes expired Etihad Guest transfers", () => {
  expect(EXCLUDED_EXPIRED_PARTNERS[0]).toMatchObject({ programName: "Etihad Guest", ended: "2026-06-30" });
  expect(TRANSFER_PARTNERS.some((partner) => partner.programName.includes("Etihad Guest"))).toBe(false);
});

test("excludes expired HawaiianMiles transfers after 30 June 2025", () => {
  expect(EXCLUDED_EXPIRED_PARTNERS).toContainEqual({
    programName: "HawaiianMiles",
    ended: "2025-06-30",
    sourceUrl: "https://www.americanexpress.com/content/dam/amex/us/rewards/membership-rewards/mr-updates-final-july-2025.pdf",
    note: "Amex US transfers to HawaiianMiles ended 30 June 2025. Not used for recommendations.",
  });
  expect(TRANSFER_PARTNERS.some((partner) => partner.id === "amex-hawaiian" || partner.programName.includes("HawaiianMiles"))).toBe(false);
  expect(transferPathsForReportedCarrier("HA", true)).toEqual([]);
});
