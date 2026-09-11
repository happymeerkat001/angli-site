import { expect, test } from "vitest";
import { runBoundedTasks } from "./bounded-pool";

test("limits concurrency and preserves result order", async () => {
  let inflight = 0;
  let maxInflight = 0;
  const tasks = Array.from({ length: 6 }, (_, index) => async () => {
    inflight += 1;
    maxInflight = Math.max(maxInflight, inflight);
    await Promise.resolve();
    inflight -= 1;
    return index;
  });

  const { results, timedOut } = await runBoundedTasks(tasks, { concurrency: 2, budgetMs: 10_000 });
  expect(timedOut).toBe(false);
  expect(maxInflight).toBeLessThanOrEqual(2);
  expect(results.map((result) => result.status === "ok" ? result.value : null)).toEqual([0, 1, 2, 3, 4, 5]);
});

test("skips remaining work once the budget is exhausted and keeps earlier successes", async () => {
  let clock = 0;
  const tasks = [
    async () => {
      clock = 20;
      return "ok";
    },
    async () => "late",
  ];

  const { results, timedOut } = await runBoundedTasks(tasks, {
    concurrency: 1,
    budgetMs: 10,
    now: () => clock,
  });

  expect(timedOut).toBe(true);
  expect(results[0]).toEqual({ status: "ok", value: "ok" });
  expect(results[1]).toEqual({ status: "skipped", reason: "budget" });
});

test("records errors without dropping later successes", async () => {
  const { results } = await runBoundedTasks([
    async () => {
      throw new Error("boom");
    },
    async () => "kept",
  ], { concurrency: 1, budgetMs: 1_000 });

  expect(results[0]).toMatchObject({ status: "error" });
  expect(results[1]).toEqual({ status: "ok", value: "kept" });
});
