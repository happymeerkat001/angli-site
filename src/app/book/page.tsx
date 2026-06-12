import type { Metadata } from "next";
import { Bot, CalendarDays, Handshake, Lightbulb, MessageCircle } from "lucide-react";
import { BookingCategory } from "@/components/BookingCategory";
import { Hero } from "@/components/Hero";

export const metadata: Metadata = {
  title: "Book with Me",
  description:
    "Book a conversation with Ang Li about teaching, AI projects, advising, or collaboration.",
};

const categories = [
  {
    icon: MessageCircle,
    title: "Conversation",
    description:
      "A thoughtful first conversation about overlapping interests or a question worth exploring.",
  },
  {
    icon: Handshake,
    title: "Collaboration",
    description:
      "A practical discussion about a shared project, teaching opportunity, or tool-building effort.",
  },
  {
    icon: Lightbulb,
    title: "Advising",
    description:
      "Input on knowledge workflows, course planning, AI adoption, or early project direction.",
  },
  {
    icon: CalendarDays,
    title: "Teaching",
    description:
      "Questions about HT101, church history learning, cohorts, or ministry-facing education.",
  },
  {
    icon: Bot,
    title: "AI / Project Discussion",
    description:
      "A focused session on Graphify, automation, transcripts, retrieval, or practical AI systems.",
  },
];

export default function BookPage() {
  return (
    <div className="space-y-14">
      <Hero
        eyebrow="Book with Me"
        title="Make the conversation concrete."
        subtitle="Reach out when there is a real question, a useful collaboration, or a project that would benefit from careful thinking."
      />

      <section className="mx-auto grid max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <BookingCategory key={category.title} {...category} />
        ))}
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-[2rem] border border-line bg-card p-8 shadow-sm shadow-ink/5">
          <h2 className="font-serif text-3xl font-semibold leading-tight text-ink">
            Good reasons to reach out
          </h2>
          <p className="mt-4 text-muted">
            The best conversations usually have a clear context, an honest
            question, and enough specificity to make the time useful.
          </p>
        </div>
        <div className="rounded-[2rem] border border-dashed border-accent/30 bg-accent/5 p-8">
          <h2 className="font-serif text-3xl font-semibold leading-tight text-ink">
            Booking link
          </h2>
          <p className="mt-4 text-muted">
            Book a 60-minute meeting directly through TidyCal.
          </p>
          <a
            href="https://tidycal.com/mrangli/60-minute-meeting"
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-accent-hover"
          >
            Open booking page
          </a>
        </div>
      </section>
    </div>
  );
}
