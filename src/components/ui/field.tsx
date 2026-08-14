"use client";

import { CaretDownIcon, CheckIcon } from "@phosphor-icons/react";
import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";

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
  const messageId = htmlFor ? `${htmlFor}-${error ? "error" : "hint"}` : undefined;

  return (
    <div className={`min-w-0 ${className}`} data-field={htmlFor}>
      <label htmlFor={htmlFor} className="mb-2 block text-[0.94rem] font-extrabold leading-5 text-ink-soft">
        {label}
      </label>
      {children}
      {error ? (
        <p id={messageId} className="mt-2 text-sm font-bold leading-5 text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {!error && hint ? (
        <p id={messageId} className="mt-2 text-sm font-semibold leading-5 text-ink-faint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const controlClass = "min-h-14 min-w-0 w-full rounded-[1.125rem] border-[1.5px] border-border-strong bg-panel px-4 text-base font-bold text-ink shadow-field placeholder:font-semibold placeholder:text-ink-faint transition-[border-color,box-shadow,background-color] duration-200 hover:border-polar/45 focus:border-polar focus:outline-none focus:shadow-[0_0_0_4px_rgb(8_139_142_/_0.12)] disabled:bg-surface disabled:text-ink-faint aria-[invalid=true]:border-danger aria-[invalid=true]:shadow-[0_0_0_4px_rgb(200_73_77_/_0.1)]";

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${controlClass} ${className}`} {...props} />;
}

type SelectOption = {
  value: string;
  label: string;
  disabled: boolean;
};

type SelectProps = {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  children: ReactNode;
  leading?: ReactNode;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  onValueChange?: (value: string) => void;
};

function selectOptions(children: ReactNode) {
  return Children.toArray(children).flatMap<SelectOption>((child) => {
    if (!isValidElement(child) || child.type !== "option") return [];
    const option = child as ReactElement<{ value?: string | number; disabled?: boolean; children?: ReactNode }>;
    return [{
      value: String(option.props.value ?? ""),
      label: String(option.props.children ?? ""),
      disabled: Boolean(option.props.disabled),
    }];
  });
}

export function Select({
  id,
  name,
  value,
  defaultValue,
  disabled = false,
  required = false,
  className = "",
  children,
  leading,
  onValueChange,
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: SelectProps) {
  const options = useMemo(() => selectOptions(children), [children]);
  const firstValue = String(defaultValue ?? options[0]?.value ?? "");
  const [internalValue, setInternalValue] = useState(firstValue);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const generatedId = useId();
  const listboxId = `${generatedId}-listbox`;
  const controlled = value !== undefined;
  const selectedValue = controlled ? value : internalValue;
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === selectedValue));
  const selected = options[selectedIndex];

  useEffect(() => {
    function close(event: PointerEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  useEffect(() => {
    const form = wrapperRef.current?.closest("form");
    if (!form || controlled) return;
    const reset = () => window.setTimeout(() => setInternalValue(firstValue), 0);
    form.addEventListener("reset", reset);
    return () => form.removeEventListener("reset", reset);
  }, [controlled, firstValue]);

  function choose(nextIndex: number) {
    const option = options[nextIndex];
    if (!option || option.disabled) return;
    if (!controlled) setInternalValue(option.value);
    onValueChange?.(option.value);
    setActiveIndex(nextIndex);
    setOpen(false);
  }

  function move(direction: 1 | -1) {
    if (options.length === 0) return;
    let next = activeIndex;
    do {
      next = (next + direction + options.length) % options.length;
    } while (options[next]?.disabled && next !== activeIndex);
    setActiveIndex(next);
  }

  function keyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setActiveIndex(selectedIndex);
        setOpen(true);
      } else {
        move(event.key === "ArrowDown" ? 1 : -1);
      }
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open) choose(activeIndex);
      else {
        setActiveIndex(selectedIndex);
        setOpen(true);
      }
      return;
    }
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      const next = event.key === "Home" ? options.findIndex((option) => !option.disabled) : options.findLastIndex((option) => !option.disabled);
      if (next >= 0) setActiveIndex(next);
    }
  }

  return (
    <div ref={wrapperRef} className="relative min-w-0">
      {name ? <input type="hidden" name={name} value={selectedValue} /> : null}
      <button
        id={id}
        type="button"
        role="combobox"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-required={required || undefined}
        aria-invalid={ariaInvalid || undefined}
        aria-describedby={ariaDescribedBy}
        data-field-name={name}
        onClick={() => {
          setActiveIndex(selectedIndex);
          setOpen((current) => !current);
        }}
        onKeyDown={keyDown}
        className={`${controlClass} flex items-center gap-3 pr-12 text-left ${leading ? "pl-4" : ""} ${className}`}
      >
        {leading ? <span className="flex shrink-0 items-center text-polar">{leading}</span> : null}
        <span className="min-w-0 flex-1 truncate">{selected?.label || "Seleccione una opción"}</span>
        <CaretDownIcon
          size={20}
          weight="bold"
          className={`pointer-events-none absolute right-4 text-ink-soft transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          className="select-menu-enter absolute inset-x-0 top-[calc(100%+0.5rem)] z-70 max-h-72 overflow-y-auto rounded-[1.125rem] border border-border bg-panel p-1.5 shadow-overlay"
        >
          {options.map((option, index) => {
            const active = index === activeIndex;
            const checked = option.value === selectedValue;
            return (
              <button
                key={`${option.value}-${index}`}
                type="button"
                role="option"
                aria-selected={checked}
                disabled={option.disabled}
                onPointerMove={() => setActiveIndex(index)}
                onClick={() => choose(index)}
                className={`flex min-h-11 w-full items-center gap-3 rounded-[0.875rem] px-3.5 text-left text-base font-bold transition-colors disabled:opacity-45 ${active ? "bg-polar-soft text-polar-dark" : "text-ink hover:bg-surface"}`}
              >
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                <CheckIcon size={18} weight="bold" className={checked ? "opacity-100" : "opacity-0"} />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function Textarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${controlClass} min-h-28 resize-y py-3.5 ${className}`} {...props} />;
}
