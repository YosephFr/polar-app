import Image from "next/image";
import {
  CalendarCheckIcon,
  CheckCircleIcon,
  ClipboardTextIcon,
  LockSimpleIcon,
  WarningIcon,
} from "@phosphor-icons/react/ssr";
import { getAppContext, listBolusRecords } from "@/lib/db/data";
import { requireUser } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "Progreso" };

const mascots = [
  { name: "Oso polar", days: 0, src: "/mascots/polar-bear.svg", color: "#218684" },
  { name: "Zorro ártico", days: 3, src: "/mascots/arctic-fox.svg", color: "#de6a49" },
  { name: "Pingüino", days: 7, src: "/mascots/penguin.svg", color: "#75a6d2" },
  { name: "Foca valiente", days: 10, src: "/mascots/seal.svg", color: "#7ca78f" },
  { name: "Búho nival", days: 14, src: "/mascots/snowy-owl.svg", color: "#394b56" },
  { name: "Lobo ártico", days: 18, src: "/mascots/arctic-wolf.svg", color: "#338a88" },
  { name: "Tigre blanco", days: 21, src: "/mascots/white-tiger.svg", color: "#e7b642" },
  { name: "Panda zen", days: 25, src: "/mascots/panda.svg", color: "#7b9f7d" },
  { name: "Unicornio", days: 28, src: "/mascots/unicorn.svg", color: "#bd78b5" },
  { name: "Dragón polar", days: 35, src: "/mascots/dragon.svg", color: "#304a52" },
] as const;

export default async function ProgressPage() {
  const user = await requireUser();
  const context = await getAppContext(user.id);
  if (!context) return null;
  const records = await listBolusRecords(user.id, context.patient.id, 200);
  const days = new Set(records.map((record) => record.occurredAt.slice(0, 10))).size;
  const administered = records.filter((record) => record.status === "administered").length;
  const lows = records.filter((record) => record.status === "blocked_low").length;
  const nextMascot = mascots.find((mascot) => mascot.days > days);

  return (
    <div className="min-w-0">
      <PageHeader title="Progreso" subtitle={context.patient.name} />

      <section className="mt-7 grid min-w-0 grid-cols-2 gap-3">
        <div className="rounded-[1.5rem] bg-polar p-5 text-on-accent shadow-action">
          <CalendarCheckIcon size={25} weight="duotone" />
          <p className="tnum mt-5 text-4xl font-black">{days}</p>
          <p className="mt-1 text-sm font-extrabold text-on-accent/85">días con registros</p>
        </div>
        <div className="rounded-[1.5rem] border border-border bg-panel p-5 shadow-card">
          <ClipboardTextIcon size={25} weight="duotone" className="text-polar" />
          <p className="tnum mt-5 text-4xl font-black">{administered}</p>
          <p className="mt-1 text-sm font-extrabold text-ink-soft">dosis confirmadas</p>
        </div>
      </section>

      {lows > 0 ? (
        <div className="mt-3 flex items-center gap-3 rounded-[1.25rem] bg-danger-soft px-5 py-4 text-danger">
          <WarningIcon size={22} weight="fill" />
          <span className="text-sm font-black">Glucosas bajas registradas: {lows}</span>
        </div>
      ) : null}

      <section className="mt-9 rounded-[1.75rem] border border-polar/10 bg-panel p-4 shadow-card sm:p-6">
        <div className="flex min-w-0 items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xl font-black tracking-[-0.025em] text-polar-dark">Bestias de Polar</h2>
            <p className="mt-1 text-sm font-semibold leading-5 text-ink-soft">Se desbloquean al registrar nuevos días.</p>
          </div>
          {nextMascot ? <span className="shrink-0 rounded-full bg-surface px-3 py-1.5 text-xs font-extrabold text-ink-soft">Próxima: {nextMascot.days} días</span> : null}
        </div>

        <div className="mt-5 grid min-w-0 grid-cols-2 gap-3 min-[520px]:grid-cols-3 md:grid-cols-5">
          {mascots.map((mascot) => {
            const unlocked = days >= mascot.days;
            return (
              <article key={mascot.name} className={`relative min-w-0 rounded-[1.25rem] border p-2.5 text-center transition-[transform,border-color,box-shadow] ${unlocked ? "border-polar/20 bg-panel shadow-field hover:-translate-y-0.5 hover:shadow-card" : "border-border bg-surface/70"}`}>
                <div className={`relative flex aspect-square items-center justify-center overflow-hidden rounded-[1rem] p-3 ${unlocked ? "" : "grayscale opacity-35"}`} style={{ backgroundColor: unlocked ? mascot.color : "#cfd5d5" }}>
                  <Image src={mascot.src} alt={mascot.name} width={100} height={100} className="h-full w-full object-contain" />
                  {unlocked ? <CheckCircleIcon size={20} weight="fill" className="absolute right-2 top-2 text-on-accent" /> : <LockSimpleIcon size={19} weight="fill" className="absolute right-2 top-2 text-ink-soft" />}
                </div>
                <h3 className={`mt-2.5 text-sm font-black leading-4 ${unlocked ? "text-ink" : "text-ink-faint"}`}>{mascot.name}</h3>
                <p className={`mt-1 text-[0.68rem] font-black uppercase tracking-[0.04em] ${unlocked ? "text-polar-dark" : "text-ink-faint"}`}>{mascot.days === 0 ? "Nivel base" : `${mascot.days} días`}</p>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
