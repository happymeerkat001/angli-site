import { expect, test } from "vitest";
import { personalRoute } from "./routes";

test("uses a single private personal route", () => {
  expect(personalRoute).toBe("/personal");
  expect(personalRoute).not.toBe("/today");
});
