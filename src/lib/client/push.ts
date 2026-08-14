"use client";

function applicationServerKey(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const binary = window.atob(base64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export type PushCapability = "unsupported" | "unconfigured" | "blocked" | "available" | "active";

function withTimeout<T>(promise: Promise<T>, milliseconds: number, message: string) {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      window.setTimeout(() => reject(new Error(message)), milliseconds);
    }),
  ]);
}

async function pushConfig() {
  const response = await fetch("/api/push/config", { cache: "no-store" });
  if (!response.ok) return { enabled: false, publicKey: "" };
  return response.json() as Promise<{ enabled: boolean; publicKey: string }>;
}

export async function readPushCapability(): Promise<PushCapability> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return "unsupported";
  }
  const config = await pushConfig();
  if (!config.enabled) return "unconfigured";
  if (Notification.permission === "denied") return "blocked";
  const registration = await navigator.serviceWorker.getRegistration("/");
  const subscription = await registration?.pushManager.getSubscription();
  return subscription ? "active" : "available";
}

export async function enablePush() {
  const config = await pushConfig();
  if (!config.enabled) throw new Error("Las notificaciones push todavía no están configuradas en este entorno.");
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    throw new Error("Este navegador no admite notificaciones push.");
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("El navegador no concedió permiso para enviar notificaciones.");
  const registration = await withTimeout(
    navigator.serviceWorker.ready,
    10_000,
    "El servicio de notificaciones no respondió. Recargue Polar e inténtelo de nuevo.",
  );
  const current = await registration.pushManager.getSubscription();
  const subscription = current || await withTimeout(
    registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey(config.publicKey),
    }),
    15_000,
    "La activación tardó demasiado. Compruebe la conexión e inténtelo de nuevo.",
  );
  const response = await fetch("/api/push/subscriptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: subscription.toJSON(), deviceName: navigator.userAgent }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error || "No se pudo registrar este dispositivo.");
  }
}

export async function disablePush() {
  const registration = await navigator.serviceWorker.getRegistration("/");
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  await fetch("/api/push/subscriptions", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint }),
  });
}
