import Link from "next/link";

const links = [
  { href: "/ht101", label: "Archive", prefetch: false },
  { href: "/projects", label: "Projects" },
  { href: "/real-estate", label: "Real Estate" },
  { href: "/about", label: "About" },
  { href: "/book", label: "Book" },
];

export function Footer() {
  return (
    <footer className="border-t border-line bg-white/60 px-5 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 text-sm text-muted md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-serif text-lg font-semibold text-ink">Ang Li</p>
          <p>Teaching, practical AI, and community-centered conversations.</p>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              prefetch={link.prefetch}
              className="transition-colors duration-200 hover:text-accent"
            >
              {link.label}
            </Link>
          ))}
          {/* PLACEHOLDER: add social/profile links when available. */}
        </div>
      </div>
    </footer>
  );
}
