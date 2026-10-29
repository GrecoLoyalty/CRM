"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/dashboard/scrum", label: "Tablero" },
  { href: "/dashboard/scrum/backlog", label: "Backlog" },
  { href: "/dashboard/scrum/sprints", label: "Sprints y equipo" },
];

export default function SubNavScrum() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 border-b border-base-700 overflow-x-auto">
      {TABS.map((t) => {
        const activo = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`px-4 py-2 text-sm whitespace-nowrap border-b-2 -mb-px transition-colors ${
              activo ? "border-accent text-gray-50" : "border-transparent text-gray-500 hover:text-gray-200"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
