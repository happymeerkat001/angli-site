"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const links = [
  { href: "/ht101", label: "HT101" },
  { href: "/projects", label: "Projects" },
  { href: "/real-estate", label: "Real Estate" },
  { href: "/about", label: "About" },
  { href: "/book", label: "Book" },
];

export function Nav() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="fixed left-0 right-0 top-4 z-50 px-4">
      <nav className="mx-auto max-w-6xl rounded-full border border-line/80 bg-white/82 px-4 py-3 shadow-sm shadow-ink/5 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="font-serif text-lg font-semibold tracking-tight text-ink"
            onClick={() => setIsOpen(false)}
          >
            Ang Li
          </Link>
          <div className="hidden items-center gap-1 md:flex">
            {links.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                    isActive
                      ? "bg-ink text-white"
                      : "text-muted hover:bg-paper hover:text-ink"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-full border border-line text-ink transition-colors duration-200 hover:bg-paper md:hidden"
            aria-label="Toggle navigation"
            aria-expanded={isOpen}
            onClick={() => setIsOpen((current) => !current)}
          >
            {isOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
        {isOpen ? (
          <div className="grid gap-1 border-t border-line/70 pt-3 md:hidden">
            {links.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-2xl px-4 py-3 text-sm font-medium transition-colors duration-200 ${
                    isActive
                      ? "bg-ink text-white"
                      : "text-muted hover:bg-paper hover:text-ink"
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        ) : null}
      </nav>
    </header>
  );
}
