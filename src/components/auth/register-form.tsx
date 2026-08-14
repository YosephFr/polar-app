"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export function RegisterForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    const form = new FormData(event.currentTarget);
    setLoading(true);
    setError("");
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
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(body.error || "No se pudo crear la cuenta");
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
      <h1 className="text-3xl font-extrabold tracking-[-0.03em]">Crear cuenta</h1>
      <form onSubmit={submit} className="mt-7 flex flex-col gap-4">
        <Field label="Nombre" htmlFor="register-name">
          <Input id="register-name" name="displayName" autoComplete="name" required />
        </Field>
        <Field label="Usuario" htmlFor="register-username">
          <Input id="register-username" name="username" autoComplete="username" autoCapitalize="none" pattern="[A-Za-z0-9._-]+" required />
        </Field>
        <Field label="Correo electrónico (opcional)" htmlFor="register-email">
          <Input id="register-email" name="email" type="email" autoComplete="email" autoCapitalize="none" />
        </Field>
        <Field label="Contraseña" htmlFor="register-password" hint="Mínimo 4 caracteres.">
          <Input id="register-password" name="password" type="password" autoComplete="new-password" minLength={4} required />
        </Field>
        {error ? <p className="rounded-md bg-danger-soft px-4 py-3 text-sm font-semibold text-danger" role="alert">{error}</p> : null}
        <Button type="submit" loading={loading} className="mt-1 w-full">Crear cuenta</Button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-soft">
        ¿Ya tiene una cuenta? <Link href="/entrar" className="font-bold text-polar">Iniciar sesión</Link>
      </p>
    </div>
  );
}
