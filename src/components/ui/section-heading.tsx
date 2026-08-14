export function SectionHeading({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <h2 className="text-xl font-extrabold tracking-[-0.02em] text-polar-dark">{title}</h2>
      {action}
    </div>
  );
}

