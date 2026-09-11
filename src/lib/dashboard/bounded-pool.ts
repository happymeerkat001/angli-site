export type BoundedTaskResult<T> =
  | { status: "ok"; value: T }
  | { status: "error"; error: unknown }
  | { status: "skipped"; reason: "budget" };

export async function runBoundedTasks<T>(
  tasks: Array<() => Promise<T>>,
  options: { concurrency: number; budgetMs: number; now?: () => number },
): Promise<{ results: BoundedTaskResult<T>[]; timedOut: boolean }> {
  const clock = options.now ?? Date.now;
  const deadline = clock() + options.budgetMs;
  const results: BoundedTaskResult<T>[] = Array.from({ length: tasks.length }, () => ({ status: "skipped", reason: "budget" }));
  let next = 0;
  let timedOut = false;

  async function worker() {
    while (true) {
      const index = next;
      next += 1;
      if (index >= tasks.length) return;
      if (clock() >= deadline) {
        timedOut = true;
        results[index] = { status: "skipped", reason: "budget" };
        continue;
      }
      try {
        results[index] = { status: "ok", value: await tasks[index]() };
      } catch (error) {
        results[index] = { status: "error", error };
      }
    }
  }

  const workerCount = Math.max(1, Math.min(options.concurrency, tasks.length));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  if (results.some((result) => result.status === "skipped")) timedOut = true;
  return { results, timedOut };
}
