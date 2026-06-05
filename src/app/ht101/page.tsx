import type { Metadata } from "next";
import Link from "next/link";
import { Hero } from "@/components/Hero";

export const metadata: Metadata = {
  title: "HT101",
  description:
    "HT101 is a church history course designed for historical literacy, theological depth, and practical application.",
};

const gains = [
  "A coherent map of major people, movements, controversies, and councils.",
  "Theological depth for reading doctrine in historical context.",
  "Practical wisdom for ministry, teaching, and faithful presence today.",
];

export default function Ht101Page() {
  return (
    <div className="mx-auto max-w-3xl space-y-12 prose-page">
      <Hero
        eyebrow="HT101"
        title="Church history for people who want more than a timeline."
        subtitle="A seminary-level introduction to the church's past, taught with clarity, warmth, and practical theological attention."
        primaryCta={{ href: "/book", label: "Express interest" }}
      />

      <section className="space-y-5 text-muted">
        <p>
          HT101 introduces students to the major contours of church history:
          early Christian witness, councils and creeds, medieval renewal and
          complexity, the Reformation, global Christianity, and the questions
          that continue to shape the church today.
        </p>
        <p>
          The course is designed for seminary students, ministry leaders, and
          lifelong learners who want to understand the past with intellectual
          honesty and pastoral usefulness.
        </p>
      </section>

      <section className="rounded-[2rem] border border-line bg-card p-8 shadow-sm shadow-ink/5">
        <h2 className="font-serif text-3xl font-semibold leading-tight text-ink">
          What students gain
        </h2>
        <div className="mt-6 grid gap-4">
          {gains.map((gain) => (
            <div key={gain} className="rounded-2xl bg-paper p-5 text-muted">
              {gain}
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        <div className="rounded-[1.5rem] border border-line bg-card p-6">
          <h2 className="font-serif text-2xl font-semibold text-ink">
            Why it matters
          </h2>
          <p className="mt-3 text-muted">
            Church history trains patience. It helps students see continuity,
            complexity, courage, error, reform, and grace across time.
          </p>
        </div>
        <div className="rounded-[1.5rem] border border-line bg-card p-6">
          <h2 className="font-serif text-2xl font-semibold text-ink">
            Current cohort
          </h2>
          <p className="mt-3 text-muted">
            {/* PLACEHOLDER: add current cohort dates, location, and registration details. */}
            Cohort details will be posted here when available.
          </p>
        </div>
      </section>

      <Link
        href="/book"
        className="inline-flex rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-accent-hover"
      >
        Learn more about HT101
      </Link>
    </div>
  );
}
