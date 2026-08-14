export default function AppLoading() {
  return (
    <div className="skeleton-pulse min-w-0" aria-label="Cargando contenido" role="status">
      <div className="h-9 w-40 rounded-[0.875rem] bg-surface-strong" />
      <div className="mt-3 h-5 w-24 rounded-[0.75rem] bg-surface" />
      <div className="mt-8 h-24 w-full rounded-[1.5rem] bg-surface-strong" />
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="h-32 rounded-[1.5rem] bg-surface" />
        <div className="h-32 rounded-[1.5rem] bg-surface" />
      </div>
      <div className="mt-5 h-16 w-full rounded-[1.25rem] bg-surface-strong" />
      <span className="sr-only">Cargando</span>
    </div>
  );
}
