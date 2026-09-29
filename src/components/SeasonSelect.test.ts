import { readFile } from "node:fs/promises";
import { expect, test } from "vitest";

test("submits the chosen season through the action passed in", async () => {
  const component = await readFile(new URL("./SeasonSelect.tsx", import.meta.url), "utf8");

  expect(component).toContain("action={action}");
  expect(component).toContain("requestSubmit()");
  expect(component).toContain('name="season"');
  expect(component).toContain('pendingLabel = "Refreshing…"');
});
