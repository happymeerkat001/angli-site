"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { setAnywhereSeason } from "@/app/personal/actions";

function SeasonSelectControl({ currentSeason, onChange, seasons }: { currentSeason: string; onChange: () => void; seasons: string[] }) {
  const { pending } = useFormStatus();

  return (
    <label className="flex items-center gap-3 text-sm font-medium text-ink">
      Season
      <select
        name="season"
        defaultValue={currentSeason}
        disabled={pending}
        onChange={onChange}
        className="rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink disabled:cursor-wait disabled:opacity-70"
      >
        {seasons.map((season) => <option key={season} value={season}>{season}</option>)}
      </select>
      {pending ? <span className="text-muted" aria-live="polite">Refreshing…</span> : null}
    </label>
  );
}

export function SeasonSelect({ currentSeason, seasons }: { currentSeason: string; seasons: string[] }) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={setAnywhereSeason} className="mb-4">
      <SeasonSelectControl currentSeason={currentSeason} onChange={() => formRef.current?.requestSubmit()} seasons={seasons} />
    </form>
  );
}
