"use client";

import Image from "next/image";
import { useRef } from "react";
import { useFormState } from "react-dom";
import { CalendarDays } from "lucide-react";
import { uploadSchedulePhoto } from "@/app/personal/actions";
import type { SchedulePhotoState } from "@/lib/dashboard/schedule-photo-store";

export function SchedulePhotoCard({ state }: { state: SchedulePhotoState | null }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [uploadState, formAction] = useFormState(uploadSchedulePhoto, { error: null });

  return (
    <section className="rounded-[2rem] border border-line bg-card p-7 shadow-sm shadow-ink/5" aria-labelledby="schedule-photo-heading">
      <div className="flex items-center gap-3">
        <CalendarDays className="text-accent" aria-hidden="true" />
        <div>
          <h2 id="schedule-photo-heading" className="font-serif text-2xl font-semibold text-ink">Paper schedule</h2>
          <p className="mt-1 text-sm text-muted">Upload this week&apos;s paper calendar from your phone.</p>
        </div>
      </div>

      <form ref={formRef} action={formAction} className="mt-5">
        <label className="inline-flex cursor-pointer rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent/90">
          Upload a schedule photo
          <input
            type="file"
            name="photo"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(event) => {
              if (event.currentTarget.files?.length) formRef.current?.requestSubmit();
            }}
          />
        </label>
      </form>

      {uploadState.error ? (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {uploadState.error}
        </p>
      ) : null}

      {state ? (
        <figure className="mt-6">
          <Image
            src={state.url}
            alt="Current paper schedule"
            width={1600}
            height={1200}
            className="h-auto w-full rounded-2xl border border-line object-contain"
          />
          <figcaption className="mt-2 text-xs text-muted">
            Updated {new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(state.uploadedAt))}
          </figcaption>
        </figure>
      ) : null}
    </section>
  );
}
