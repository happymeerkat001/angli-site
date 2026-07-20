"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/ht101", label: "HT101", prefetch: false },
  { href: "/projects", label: "Projects" },
  { href: "/real-estate", label: "Real Estate" },
  { href: "/about", label: "About" },
  { href: "/book", label: "Book" },
  { href: "/personal", label: "Personal", prefetch: false },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="fixed left-0 right-0 top-4 z-50 px-4">
      <nav className="mx-auto max-w-6xl rounded-3xl border border-line/80 bg-white/95 px-3 py-2 shadow-sm shadow-ink/5 backdrop-blur-xl sm:rounded-full sm:px-4 sm:py-3">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="shrink-0 font-serif text-lg font-semibold tracking-tight text-ink"
          >
            Ang Li
          </Link>
          <div className="-mx-1 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {links.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  prefetch={link.prefetch}
                  aria-current={isActive ? "page" : undefined}
                  className={`shrink-0 rounded-full px-3 py-2 text-sm font-medium transition-colors duration-200 sm:px-4 ${
                    isActive
                      ? "bg-accent font-semibold text-white"
                      : "text-muted hover:bg-paper hover:text-ink"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </header>
  );
}
