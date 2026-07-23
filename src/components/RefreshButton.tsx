"use client";

import { useFormStatus } from "react-dom";

export function RefreshButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className={`rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors ${pending ? "cursor-wait opacity-70" : "cursor-pointer hover:bg-accent/90"}`}>{pending ? "Refreshing…" : label}</button>;
}
