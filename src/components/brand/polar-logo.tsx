type PolarMarkProps = { size?: number; className?: string };

export function PolarMark({ size = 44, className }: PolarMarkProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 80 56"
      width={size}
      height={Math.round(size * 0.7)}
      className={className}
    >
      <path d="M5 47C6 25 20 11 40 11s34 14 35 36H5Z" fill="currentColor" />
      <circle cx="25" cy="14" r="8" fill="currentColor" />
      <circle cx="57" cy="14" r="8" fill="currentColor" />
      <path d="M27 31c0-8 6-14 14-14s14 6 14 14v16H27V31Z" fill="white" />
      <circle cx="36" cy="31" r="2.2" fill="#172234" />
      <circle cx="48" cy="31" r="2.2" fill="#172234" />
      <ellipse cx="42" cy="37" rx="4" ry="3" fill="#172234" />
    </svg>
  );
}

export function PolarLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 text-polar" aria-label="Polar">
      <PolarMark size={42} />
      {compact ? null : <span className="text-[1.75rem] font-extrabold tracking-[-0.04em]">Polar</span>}
    </span>
  );
}

