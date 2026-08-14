"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Notice } from "@/components/ui/feedback";
import { clearFieldError, focusFirstError, validateForm, type ApiProblem, type FieldErrors } from "@/lib/client/form-validation";

export function RegisterForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function clearError(name: string) {
    setError("");
    setFieldErrors((current) => clearFieldError(current, name));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    const target = event.currentTarget;
    const validation = validateForm(target);
    if (Object.keys(validation).length > 0) {
      setFieldErrors(validation);
      setError("Revise los campos indicados");
      focusFirstError(target, validation);
      return;
    }
    const form = new FormData(target);
    setLoading(true);
    setError("");
    setFieldErrors({});
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: form.get("displayName"),
          username: form.get("username"),
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      const body = (await response.json()) as ApiProblem;
      if (!response.ok) {
        setError(body.error || "No se pudo crear la cuenta");
        const nextErrors = body.fieldErrors || {};
        setFieldErrors(nextErrors);
        focusFirstError(target, nextErrors);
        return;
      }
      router.push("/bienvenida");
      router.refresh();
    } catch {
      setError("Revise la conexión e inténtelo de nuevo");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-black tracking-[-0.035em] text-ink">Crear cuenta</h1>
      <form onSubmit={submit} noValidate className="mt-7 flex flex-col gap-4">
        <Field label="Nombre" htmlFor="register-name" error={fieldErrors.displayName}>
          <Input id="register-name" name="displayName" autoComplete="name" minLength={2} maxLength={80} required onChange={() => clearError("displayName")} aria-invalid={Boolean(fieldErrors.displayName)} aria-describedby={fieldErrors.displayName ? "register-name-error" : undefined} />
        </Field>
        <Field label="Usuario" htmlFor="register-username" error={fieldErrors.username}>
          <Input id="register-username" name="username" autoComplete="username" autoCapitalize="none" minLength={2} maxLength={32} pattern="[A-Za-z0-9._-]+" required onChange={() => clearError("username")} aria-invalid={Boolean(fieldErrors.username)} aria-describedby={fieldErrors.username ? "register-username-error" : undefined} />
        </Field>
        <Field label="Correo electrónico (opcional)" htmlFor="register-email" error={fieldErrors.email}>
          <Input id="register-email" name="email" type="email" autoComplete="email" autoCapitalize="none" onChange={() => clearError("email")} aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? "register-email-error" : undefined} />
        </Field>
        <Field label="Contraseña" htmlFor="register-password" hint="Mínimo 4 caracteres." error={fieldErrors.password}>
          <Input id="register-password" name="password" type="password" autoComplete="new-password" minLength={4} maxLength={128} required onChange={() => clearError("password")} aria-invalid={Boolean(fieldErrors.password)} aria-describedby={fieldErrors.password ? "register-password-error" : undefined} />
        </Field>
        {error ? <Notice message={error} tone="error" /> : null}
        <Button type="submit" loading={loading} className="mt-2 min-h-14 w-full">Crear cuenta</Button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-soft">
        ¿Ya tiene una cuenta? <Link href="/entrar" className="font-extrabold text-polar">Iniciar sesión</Link>
      </p>
    </div>
  );
}
