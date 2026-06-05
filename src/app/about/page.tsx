import type { Metadata } from "next";
import { Hero } from "@/components/Hero";

export const metadata: Metadata = {
  title: "About",
  description:
    "About Dr. Ang Li, his teaching, practical AI work, and interest in community-centered spaces.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-12 prose-page">
      <Hero
        eyebrow="About"
        title="A teacher and builder with an eye for formation."
        subtitle="Ang's work connects church history, practical technology, and the human spaces where learning and community take shape."
      />

      <section className="space-y-5 text-muted">
        <p>
          Dr. Ang Li teaches church history with a concern for clarity,
          theological depth, and practical formation. His teaching aims to help
          students see the church&apos;s past not as a museum of names and dates, but
          as a living inheritance that still shapes faithfulness today.
        </p>
        <p>
          Alongside teaching, Ang builds AI-supported tools for research,
          transcript organization, knowledge graphs, and course preparation. The
          goal is not novelty for its own sake, but better attention: tools that
          help people retrieve, connect, and act on what they already know.
        </p>
        <p>
          His real estate interests are similarly grounded in community. He is
          interested in housing, coliving, and spaces that make shared life more
          possible, especially where thoughtful design and practical systems can
          support people rather than distract from them.
        </p>
      </section>

      <section className="rounded-[2rem] border border-line bg-card p-8 shadow-sm shadow-ink/5">
        <h2 className="font-serif text-3xl font-semibold leading-tight text-ink">
          What ties the work together
        </h2>
        <p className="mt-4 text-muted">
          Teaching, AI, and real estate can seem like separate lanes. For Ang,
          they share a simpler concern: how people are formed by histories,
          tools, habits, and places.
        </p>
        {/* PLACEHOLDER: add links to public profiles, publications, or talks. */}
      </section>
    </div>
  );
}
