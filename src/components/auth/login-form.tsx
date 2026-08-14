"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export function LoginForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(body.error || "No se pudo iniciar sesión");
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
      <h1 className="text-3xl font-extrabold tracking-[-0.03em]">Iniciar sesión</h1>
      <form onSubmit={submit} className="mt-8 flex flex-col gap-5">
        <Field label="Usuario o correo electrónico" htmlFor="login-identifier">
          <Input id="login-identifier" autoComplete="username" autoCapitalize="none" value={identifier} onChange={(event) => setIdentifier(event.target.value)} required />
        </Field>
        <Field label="Contraseña" htmlFor="login-password">
          <Input id="login-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </Field>
        {error ? <p className="rounded-md bg-danger-soft px-4 py-3 text-sm font-semibold text-danger" role="alert">{error}</p> : null}
        <Button type="submit" loading={loading} className="w-full">Iniciar sesión</Button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-soft">
        ¿No tiene una cuenta? <Link href="/registro" className="font-bold text-polar">Crear cuenta</Link>
      </p>
    </div>
  );
}
