import type { LucideIcon } from "lucide-react";
import Link from "next/link";

type SectionCardProps = {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
};

export function SectionCard({
  href,
  icon: Icon,
  title,
  description,
}: SectionCardProps) {
  return (
    <Link
      href={href}
      className="group rounded-[2rem] border border-line bg-card p-7 shadow-sm shadow-ink/5 transition duration-200 hover:-translate-y-1 hover:border-accent/25 hover:shadow-lg hover:shadow-ink/8"
    >
      <div className="mb-8 inline-flex size-12 items-center justify-center rounded-2xl bg-paper text-accent transition-colors duration-200 group-hover:bg-accent group-hover:text-white">
        <Icon size={22} strokeWidth={1.8} />
      </div>
      <h2 className="font-serif text-2xl font-semibold leading-tight text-ink">
        {title}
      </h2>
      <p className="mt-3 text-muted">{description}</p>
      <p className="mt-6 text-sm font-semibold text-accent">Learn more</p>
    </Link>
  );
}
