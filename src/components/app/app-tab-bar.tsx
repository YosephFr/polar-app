"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ChartNoAxesColumnIncreasing, Clock3, House, UserRound } from "lucide-react";

const tabs = [
  { href: "/", label: "Inicio", icon: House },
  { href: "/historial", label: "Historial", icon: Clock3 },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/progreso", label: "Progreso", icon: ChartNoAxesColumnIncreasing },
  { href: "/perfil", label: "Perfil", icon: UserRound },
];

export function AppTabBar() {
  const pathname = usePathname();
  return (
    <nav aria-label="Navegación principal" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white shadow-nav pb-safe">
      <div className="mx-auto grid h-[4.75rem] max-w-3xl grid-cols-5 px-2">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-md text-[0.69rem] font-bold transition-colors sm:text-xs ${active ? "text-polar" : "text-ink-faint"}`}>
              <Icon size={24} strokeWidth={active ? 2.5 : 2} fill={active && href === "/" ? "currentColor" : "none"} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
