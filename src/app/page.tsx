import { BookOpen, Bot, CalendarDays, HomeIcon } from "lucide-react";
import { Hero } from "@/components/Hero";
import { SectionCard } from "@/components/SectionCard";

const sections = [
  {
    href: "/ht101",
    icon: BookOpen,
    title: "HT101",
    description:
      "A church history course for students who want historical literacy, theological depth, and practical wisdom.",
  },
  {
    href: "/projects",
    icon: Bot,
    title: "AI Projects",
    description:
      "Practical tools for research, teaching, transcripts, and knowledge work without the usual AI noise.",
  },
  {
    href: "/real-estate",
    icon: HomeIcon,
    title: "Real Estate",
    description:
      "Measured conversations about housing, community, coliving, and technology-enabled stewardship.",
  },
  {
    href: "/book",
    icon: CalendarDays,
    title: "Book with Me",
    description:
      "A place for thoughtful conversations about teaching, AI projects, advising, or collaboration.",
  },
];

export default function Home() {
  return (
    <div className="space-y-20">
      <Hero
        eyebrow="Dr. Ang Li"
        title="Teaching history. Building useful tools. Thinking about community."
        subtitle="Church history teacher, practical AI builder, and thoughtful participant in community-centered real estate conversations."
        body="My work sits at the intersection of formation and systems: helping people understand where they come from, building tools that make knowledge easier to use, and paying attention to the spaces where people live and gather."
        primaryCta={{ href: "/book", label: "Let's talk" }}
        secondaryCta={{ href: "/about", label: "About Ang" }}
      />

      <section className="mx-auto grid max-w-6xl gap-5 md:grid-cols-2">
        {sections.map((section) => (
          <SectionCard key={section.href} {...section} />
        ))}
      </section>
    </div>
  );
}
