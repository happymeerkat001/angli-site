import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { RandomInsightCard } from "./RandomInsightCard";

const insights = [
  { id: "first", noteTitle: "First note", insightText: "First durable insight" },
  { id: "second", noteTitle: "Second note", insightText: "Second durable insight" },
];

test("displays the total number of available insights", () => {
  const markup = renderToStaticMarkup(createElement(RandomInsightCard, { insights }));

  expect(markup).toContain("2 insights available");
});

test("keeps the empty-state message free of a redundant count", () => {
  const markup = renderToStaticMarkup(createElement(RandomInsightCard, { insights: [] }));

  expect(markup).toContain("No insights available yet.");
  expect(markup).not.toContain("0 insights available");
});
