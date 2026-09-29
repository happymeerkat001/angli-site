"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";

function SeasonSelectControl({
  currentSeason,
  label,
  onChange,
  pendingLabel,
  seasons,
}: {
  currentSeason: string;
  label: string;
  onChange: () => void;
  pendingLabel: string;
  seasons: string[];
}) {
  const { pending } = useFormStatus();

  return (
    <label className="flex items-center gap-3 text-sm font-medium text-ink">
      {label}
      <select
        name="season"
        defaultValue={currentSeason}
        disabled={pending}
        onChange={onChange}
        className="rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink disabled:cursor-wait disabled:opacity-70"
      >
        {seasons.map((season) => <option key={season} value={season}>{season}</option>)}
      </select>
      {pending ? <span className="text-muted" aria-live="polite">{pendingLabel}</span> : null}
    </label>
  );
}

export function SeasonSelect({
  action,
  currentSeason,
  label = "Season",
  pendingLabel = "Refreshing…",
  seasons,
}: {
  action: (formData: FormData) => void | Promise<void>;
  currentSeason: string;
  label?: string;
  pendingLabel?: string;
  seasons: string[];
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={action} className="mb-4">
      <SeasonSelectControl
        currentSeason={currentSeason}
        label={label}
        onChange={() => formRef.current?.requestSubmit()}
        pendingLabel={pendingLabel}
        seasons={seasons}
      />
    </form>
  );
}
