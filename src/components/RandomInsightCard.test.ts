import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { RandomInsightCard } from "./RandomInsightCard";

const insights = [
  { kind: "text" as const, id: "first", noteTitle: "First note", insightText: "First durable insight" },
  { kind: "text" as const, id: "second", noteTitle: "Second note", insightText: "Second durable insight" },
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

test("renders an image insight with its caption", () => {
  const markup = renderToStaticMarkup(createElement(RandomInsightCard, {
    insights: [{ kind: "image", id: "image", noteTitle: "Improvement", imageUrl: "https://i.imgur.com/abc.png", caption: "Improving 1% every day" }],
  }));

  expect(markup).toContain("<img");
  expect(markup).toContain("Improving 1% every day");
  expect(markup).toContain("https%3A%2F%2Fi.imgur.com%2Fabc.png");
});

test("uses the note title as image alt text without rendering an empty caption", () => {
  const markup = renderToStaticMarkup(createElement(RandomInsightCard, {
    insights: [{ kind: "image", id: "image", noteTitle: "Improvement", imageUrl: "https://i.imgur.com/abc.png", caption: "" }],
  }));

  expect(markup).toContain('alt="Improvement"');
  expect(markup).not.toContain('<p class="mt-2 text-xs text-muted"></p>');
});

test("counts a mixed text and image insight pool", () => {
  const markup = renderToStaticMarkup(createElement(RandomInsightCard, {
    insights: [
      { kind: "text", id: "text", noteTitle: "Text", insightText: "A durable text insight" },
      { kind: "image", id: "image", noteTitle: "Image", imageUrl: "https://i.imgur.com/abc.png", caption: "Image caption" },
    ],
  }));

  expect(markup).toContain("2 insights available");
});
