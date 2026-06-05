import Link from "next/link";

type HeroProps = {
  eyebrow?: string;
  title: string;
  subtitle: string;
  body?: string;
  primaryCta?: {
    href: string;
    label: string;
  };
  secondaryCta?: {
    href: string;
    label: string;
  };
};

export function Hero({
  eyebrow,
  title,
  subtitle,
  body,
  primaryCta,
  secondaryCta,
}: HeroProps) {
  return (
    <section className="mx-auto max-w-3xl text-center">
      {eyebrow ? (
        <p className="mb-5 text-sm font-semibold uppercase tracking-[0.24em] text-accent">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="font-serif text-5xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-6xl">
        {title}
      </h1>
      <p className="mt-6 text-xl leading-8 text-muted sm:text-2xl">{subtitle}</p>
      {body ? <p className="mx-auto mt-5 max-w-2xl text-muted">{body}</p> : null}
      {(primaryCta || secondaryCta) ? (
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          {primaryCta ? (
            <Link
              href={primaryCta.href}
              className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-sm shadow-accent/20 transition-colors duration-200 hover:bg-accent-hover"
            >
              {primaryCta.label}
            </Link>
          ) : null}
          {secondaryCta ? (
            <Link
              href={secondaryCta.href}
              className="rounded-full border border-line bg-white px-6 py-3 text-sm font-semibold text-ink transition-colors duration-200 hover:border-accent/30 hover:text-accent"
            >
              {secondaryCta.label}
            </Link>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
