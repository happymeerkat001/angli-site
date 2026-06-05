type ProjectCardProps = {
  title: string;
  summary: string;
  problem: string;
  status: string;
};

export function ProjectCard({ title, summary, problem, status }: ProjectCardProps) {
  return (
    <article className="rounded-[2rem] border border-line bg-card p-7 shadow-sm shadow-ink/5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h2 className="font-serif text-2xl font-semibold leading-tight text-ink">
          {title}
        </h2>
        <span className="rounded-full border border-accent/20 bg-accent/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-accent">
          {status}
        </span>
      </div>
      <p className="mt-4 text-muted">{summary}</p>
      <div className="mt-6 rounded-2xl bg-paper p-4">
        <p className="text-sm font-semibold text-ink">Problem it solves</p>
        <p className="mt-1 text-sm text-muted">{problem}</p>
      </div>
      {/* PLACEHOLDER: add live link, repository, or case study URL when public. */}
    </article>
  );
}
