"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { setAnywhereSeason } from "@/app/personal/actions";

function SeasonSelectControl({
  currentSeason,
  onChange,
  seasons,
  selectRef,
}: {
  currentSeason: string;
  onChange: () => void;
  seasons: string[];
  selectRef: MutableRefObject<HTMLSelectElement | null>;
}) {
  const { pending } = useFormStatus();

  return (
    <label className="flex items-center gap-3 text-sm font-medium text-ink">
      Season
      <select
        ref={selectRef}
        name="season"
        defaultValue={currentSeason}
        disabled={pending}
        onChange={onChange}
        className="rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink disabled:cursor-wait disabled:opacity-70"
      >
        {seasons.map((season) => <option key={season} value={season}>{season}</option>)}
      </select>
      {pending ? <span className="text-muted" aria-live="polite">Updating…</span> : null}
    </label>
  );
}

export function SeasonSelect({ currentSeason, seasons }: { currentSeason: string; seasons: string[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  const [state, formAction] = useFormState(setAnywhereSeason, { ok: true });

  useEffect(() => {
    if (!state.ok && selectRef.current) selectRef.current.value = currentSeason;
  }, [state, currentSeason]);

  return (
    <form ref={formRef} action={formAction} className="mb-4">
      <SeasonSelectControl currentSeason={currentSeason} onChange={() => formRef.current?.requestSubmit()} seasons={seasons} selectRef={selectRef} />
      {!state.ok ? (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {state.reason === "refresh already in progress"
            ? "A refresh is already in progress. Season was not changed."
            : "Season was not changed."}
        </p>
      ) : null}
    </form>
  );
}
