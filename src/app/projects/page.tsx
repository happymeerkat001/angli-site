import type { Metadata } from "next";
import { Hero } from "@/components/Hero";
import { ProjectCard } from "@/components/ProjectCard";

export const metadata: Metadata = {
  title: "AI Projects",
  description:
    "Practical AI projects by Ang Li, including Graphify, vault automation, and teaching tools.",
};

const projects = [
  {
    title: "Graphify",
    summary:
      "A knowledge graph tool for research, retrieval, and cross-file relationship mapping.",
    problem:
      "Research notes become hard to use when relationships are buried across folders. Graphify makes those relationships visible and queryable.",
    status: "Active",
  },
  {
    title: "Vault Automation",
    summary:
      "AI-supported workflows for transcript management, organization, and recurring knowledge capture.",
    problem:
      "High-volume notes and transcripts need consistent structure before they can become useful memory.",
    status: "Active",
  },
  {
    title: "Teaching Tools",
    summary:
      "AI-assisted support for lesson planning, course materials, retrieval, and review.",
    problem:
      "Teachers need help turning scattered source material into coherent, reusable preparation.",
    status: "In progress",
  },
];

export default function ProjectsPage() {
  return (
    <div className="space-y-14">
      <Hero
        eyebrow="AI Projects"
        title="Small tools for serious knowledge work."
        subtitle="Ang builds practical AI systems for retrieval, teaching, transcript workflows, and research organization."
        body="The emphasis is usefulness over spectacle: clear inputs, inspectable structure, and tools that support real work."
      />
      <section className="mx-auto grid max-w-6xl gap-5 md:grid-cols-2">
        {projects.map((project) => (
          <ProjectCard key={project.title} {...project} />
        ))}
      </section>
    </div>
  );
}
