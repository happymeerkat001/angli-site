import {
  BookOpen,
  Bot,
  CalendarDays,
  ExternalLink,
  HomeIcon,
  Newspaper,
} from "lucide-react";
import { Hero } from "@/components/Hero";
import { SectionCard } from "@/components/SectionCard";
import { newsSources } from "@/lib/dashboard/config";
import { getNewsDashboard } from "@/lib/dashboard/news";

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

export default async function Home() {
  const news = await getNewsDashboard();

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

      <section className="mx-auto max-w-6xl" aria-labelledby="briefing-heading">
        <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">Daily briefing</p>
            <h2 id="briefing-heading" className="mt-2 font-serif text-3xl font-semibold text-ink">
              News worth checking today
            </h2>
          </div>
          <a
            href="https://happymeerkat001.github.io/padsplit-scrapper/index.html"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm font-semibold text-accent hover:text-accent-hover"
          >
            Open PadSplit dashboard <ExternalLink size={15} aria-hidden="true" />
          </a>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {newsSources.slice(0, 4).map((source) => {
            const result = news[source.id];
            return (
              <section key={source.id} className="rounded-[2rem] border border-line bg-card p-6 shadow-sm shadow-ink/5">
                <div className="flex items-center gap-2 text-accent">
                  <Newspaper size={17} aria-hidden="true" />
                  <h3 className="font-serif text-xl font-semibold text-ink">{source.label}</h3>
                </div>
                {result.status === "ok" ? (
                  <ul className="mt-5 space-y-4">
                    {result.value.map((item) => (
                      <li key={item.id}>
                        <a href={item.url} target="_blank" rel="noreferrer" className="group block text-sm font-medium leading-5 text-ink hover:text-accent">
                          {item.title} <ExternalLink className="inline-block opacity-0 transition group-hover:opacity-100" size={13} aria-hidden="true" />
                          <span className="mt-1 block text-xs font-normal text-muted">{item.publisher}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : <p className="mt-5 text-sm text-muted">{result.message}</p>}
              </section>
            );
          })}
        </div>
      </section>
    </div>
  );
}
