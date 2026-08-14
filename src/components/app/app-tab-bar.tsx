"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarBlankIcon,
  ChartBarIcon,
  ClockCounterClockwiseIcon,
  HouseIcon,
  UserCircleIcon,
  type Icon,
} from "@phosphor-icons/react";

const tabs: Array<{ href: string; label: string; icon: Icon }> = [
  { href: "/", label: "Inicio", icon: HouseIcon },
  { href: "/historial", label: "Historial", icon: ClockCounterClockwiseIcon },
  { href: "/agenda", label: "Agenda", icon: CalendarBlankIcon },
  { href: "/progreso", label: "Progreso", icon: ChartBarIcon },
  { href: "/perfil", label: "Perfil", icon: UserCircleIcon },
];

function PendingMark() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden="true"
      className={`absolute inset-x-3 bottom-1 h-0.5 rounded-full bg-polar transition-opacity duration-200 ${pending ? "opacity-100" : "opacity-0"}`}
    />
  );
}

export function AppTabBar() {
  const pathname = usePathname();

  return (
    <nav aria-label="Navegación principal" className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(0.7rem+env(safe-area-inset-bottom))] sm:px-5">
      <div className="pointer-events-auto mx-auto grid min-h-[4.85rem] w-full max-w-3xl grid-cols-5 gap-1 rounded-[1.65rem] border border-polar/10 bg-panel p-1.5 shadow-float">
        {tabs.map(({ href, label, icon: IconComponent }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`relative flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-[1.15rem] px-1 text-[0.65rem] font-extrabold transition-[color,background-color,transform] duration-200 active:scale-[0.97] min-[390px]:gap-1 min-[390px]:text-[0.72rem] ${active ? "bg-polar-soft text-polar-dark" : "text-ink-faint hover:bg-surface hover:text-ink-soft"}`}
            >
              <IconComponent size={25} weight={active ? "fill" : "bold"} />
              <span className="max-w-full truncate">{label}</span>
              <PendingMark />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
