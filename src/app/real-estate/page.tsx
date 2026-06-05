import type { Metadata } from "next";
import Link from "next/link";
import { Hero } from "@/components/Hero";

export const metadata: Metadata = {
  title: "Real Estate",
  description:
    "Ang Li's measured interest in housing, coliving, community, and practical systems.",
};

const interests = [
  "Housing and coliving models that support community without overprogramming it.",
  "Spaces where hospitality, affordability, and good operations matter.",
  "Practical uses of AI for research, organization, and property-related workflows.",
  "Conversations with people thinking carefully about stewardship, place, and shared life.",
];

export default function RealEstatePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-12 prose-page">
      <Hero
        eyebrow="Real Estate"
        title="A measured interest in place, housing, and community."
        subtitle="Real estate appears here as one expression of a broader concern: how people live, gather, and build durable forms of community."
      />

      <section className="space-y-5 text-muted">
        <p>
          Ang is interested in real estate where it intersects with community,
          hospitality, coliving, and thoughtful systems. This is intentionally a
          quiet part of the site: credible enough to invite relevant
          conversations, restrained enough not to distract from teaching and
          ministry-facing work.
        </p>
        <p>
          The most natural overlap with AI is practical rather than flashy:
          better research, clearer operations, useful documentation, and tools
          that reduce friction for people managing complex information.
        </p>
      </section>

      <section className="rounded-[2rem] border border-line bg-card p-8 shadow-sm shadow-ink/5">
        <h2 className="font-serif text-3xl font-semibold leading-tight text-ink">
          Conversations of interest
        </h2>
        <div className="mt-6 grid gap-4">
          {interests.map((interest) => (
            <div key={interest} className="rounded-2xl bg-paper p-5 text-muted">
              {interest}
            </div>
          ))}
        </div>
      </section>

      <Link
        href="/book"
        className="inline-flex rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-accent-hover"
      >
        Start a conversation
      </Link>
    </div>
  );
}
