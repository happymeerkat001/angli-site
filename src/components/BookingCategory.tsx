import type { LucideIcon } from "lucide-react";

type BookingCategoryProps = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export function BookingCategory({
  icon: Icon,
  title,
  description,
}: BookingCategoryProps) {
  return (
    <div className="rounded-[1.5rem] border border-line bg-card p-6 shadow-sm shadow-ink/5">
      <Icon className="text-accent" size={22} strokeWidth={1.8} />
      <h2 className="mt-5 font-serif text-xl font-semibold leading-tight text-ink">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
    </div>
  );
}
