"use client";

import { useState } from "react";
import Image from "next/image";
import { selectRandomInsight } from "@/lib/dashboard/insights";
import type { InsightEntry } from "@/lib/dashboard/types";

export function RandomInsightCard({ insights }: { insights: InsightEntry[] }) {
  const [selection, setSelection] = useState(() => selectRandomInsight(insights, new Set()));
  const [imageFailed, setImageFailed] = useState(false);
  if (!selection.entry) return <p className="text-sm text-muted">No insights available yet.</p>;
  const chooseAnother = () => {
    setImageFailed(false);
    setSelection(selectRandomInsight(insights, selection.nextSeenIds));
  };
  const entry = selection.entry;
  return <div aria-live="polite" aria-atomic="true">
    {entry.kind === "text" ? <mark className="bg-accent/10 text-ink">{entry.insightText}</mark> : <>
      {!imageFailed ? <Image src={entry.imageUrl} alt={entry.caption || entry.noteTitle} width={1600} height={1200} onError={() => setImageFailed(true)} className="h-auto w-full rounded-2xl border border-line object-contain" /> : null}
      {entry.caption ? <p className="mt-2 text-xs text-muted">{entry.caption}</p> : null}
    </>}
    <p className="mt-3 text-xs text-muted">{entry.noteTitle}</p>
    <p className="mt-1 text-xs text-muted">{insights.length} insights available</p>
    <button type="button" onClick={chooseAnother} className="mt-4 cursor-pointer rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90">Show another insight</button>
  </div>;
}
