"use client";

import { useState } from "react";
import { selectRandomInsight } from "@/lib/dashboard/insights";
import type { InsightEntry } from "@/lib/dashboard/types";

export function RandomInsightCard({ insights }: { insights: InsightEntry[] }) {
  const [selection, setSelection] = useState(() => selectRandomInsight(insights, new Set()));
  if (!selection.entry) return <p className="text-sm text-muted">No insights available yet.</p>;
  const chooseAnother = () => setSelection(selectRandomInsight(insights, selection.nextSeenIds));
  return <div aria-live="polite" aria-atomic="true"><mark className="bg-accent/10 text-ink">{selection.entry.insightText}</mark><p className="mt-3 text-xs text-muted">{selection.entry.noteTitle}</p><button type="button" onClick={chooseAnother} className="mt-4 cursor-pointer rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90">Show another insight</button></div>;
}
