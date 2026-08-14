import Image from "next/image";

type PolarMarkProps = {
  size?: number;
  className?: string;
  priority?: boolean;
};

export function PolarMark({ size = 44, className = "", priority = false }: PolarMarkProps) {
  return (
    <Image
      src="/polar-mark.svg"
      alt=""
      width={size}
      height={Math.round(size * 0.7)}
      className={className}
      priority={priority}
      aria-hidden="true"
    />
  );
}

export function PolarLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5 text-polar" aria-label="Polar">
      <PolarMark size={44} priority />
      {compact ? null : (
        <span className="text-[1.85rem] font-black leading-none tracking-[-0.045em]">Polar</span>
      )}
    </span>
  );
}
