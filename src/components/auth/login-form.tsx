"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Notice } from "@/components/ui/feedback";
import { clearFieldError, focusFirstError, validateForm, type ApiProblem, type FieldErrors } from "@/lib/client/form-validation";

export function LoginForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    const form = event.currentTarget;
    const validation = validateForm(form);
    if (Object.keys(validation).length > 0) {
      setFieldErrors(validation);
      setError("Revise los campos indicados");
      focusFirstError(form, validation);
      return;
    }
    setLoading(true);
    setError("");
    setFieldErrors({});
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const body = (await response.json()) as ApiProblem;
      if (!response.ok) {
        setError(body.error || "No se pudo iniciar sesión");
        const nextErrors = body.fieldErrors || {};
        setFieldErrors(nextErrors);
        focusFirstError(form, nextErrors);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Revise la conexión e inténtelo de nuevo");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-black tracking-[-0.035em] text-ink">Iniciar sesión</h1>
      <form onSubmit={submit} noValidate className="mt-7 flex flex-col gap-5">
        <Field label="Usuario o correo electrónico" htmlFor="login-identifier" error={fieldErrors.identifier}>
          <Input id="login-identifier" name="identifier" autoComplete="username" autoCapitalize="none" minLength={2} value={identifier} onChange={(event) => { setIdentifier(event.target.value); setError(""); setFieldErrors((current) => clearFieldError(current, "identifier")); }} required aria-invalid={Boolean(fieldErrors.identifier)} aria-describedby={fieldErrors.identifier ? "login-identifier-error" : undefined} />
        </Field>
        <Field label="Contraseña" htmlFor="login-password" error={fieldErrors.password}>
          <Input id="login-password" name="password" type="password" autoComplete="current-password" value={password} onChange={(event) => { setPassword(event.target.value); setError(""); setFieldErrors((current) => clearFieldError(current, "password")); }} required aria-invalid={Boolean(fieldErrors.password)} aria-describedby={fieldErrors.password ? "login-password-error" : undefined} />
        </Field>
        {error ? <Notice message={error} tone="error" /> : null}
        <Button type="submit" loading={loading} className="mt-1 min-h-14 w-full">Iniciar sesión</Button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-soft">
        ¿No tiene una cuenta? <Link href="/registro" className="font-extrabold text-polar">Crear cuenta</Link>
      </p>
    </div>
  );
}
