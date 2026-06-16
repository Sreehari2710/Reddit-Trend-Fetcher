"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/", label: "Fetch Posts" },
  { href: "/subreddits", label: "Discover Subreddits" },
  { href: "/keyword", label: "Search By Keyword" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 border-t border-slate-900 bg-slate-950">
      <div className="max-w-7xl mx-auto px-6 w-full flex items-center gap-1">
        {NAV_LINKS.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`px-4 py-3 text-xs font-bold uppercase tracking-wider font-mono border-b-2 transition-all ${
                isActive
                  ? "text-orange-500 border-orange-500"
                  : "text-slate-400 border-transparent hover:text-slate-200 hover:border-slate-700"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
