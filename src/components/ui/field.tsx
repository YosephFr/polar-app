import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className = "",
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-bold text-ink-soft">
        {label}
      </label>
      {children}
      {error ? <p className="mt-1.5 text-sm font-medium text-danger" role="alert">{error}</p> : null}
      {!error && hint ? <p className="mt-1.5 text-sm leading-5 text-ink-faint">{hint}</p> : null}
    </div>
  );
}

const controlClass = "h-13 w-full rounded-md border-[1.5px] border-border bg-white px-4 text-base font-semibold text-ink placeholder:font-medium placeholder:text-ink-faint transition-colors focus:border-polar focus:outline-none disabled:bg-surface disabled:text-ink-faint";

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${controlClass} ${className}`} {...props} />;
}

export function Select({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${controlClass} appearance-none bg-[url('/select-arrow.svg')] bg-[length:18px] bg-[right_1rem_center] bg-no-repeat pr-11 ${className}`} {...props} />;
}

export function Textarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${controlClass} min-h-24 resize-y py-3 ${className}`} {...props} />;
}

