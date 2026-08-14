import { Serwist } from "@serwist/window";

const buildId = process.env.NEXT_PUBLIC_BUILD_ID || "";
const swUrl = "/serwist/sw.js";
let instance: Serwist | undefined;

export function registerServiceWorker(onUpdateAvailable: (apply: () => void) => void) {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
  if (instance) return;
  const serwist = new Serwist(swUrl, { scope: "/", type: "classic", updateViaCache: "none" });
  instance = serwist;
  const reload = () => window.location.reload();
  serwist.addEventListener("waiting", () => {
    onUpdateAvailable(() => {
      serwist.addEventListener("controlling", reload);
      serwist.messageSkipWaiting();
    });
  });
  void serwist.register();

  const check = async () => {
    await serwist.update().catch(() => undefined);
    if (!buildId) return;
    const response = await fetch("/api/version", { cache: "no-store" }).catch(() => null);
    if (!response?.ok) return;
    const current = (await response.json()) as { buildId?: string };
    if (current.buildId && current.buildId !== buildId) onUpdateAvailable(reload);
  };

  const onVisible = () => {
    if (document.visibilityState === "visible") void check();
  };
  document.addEventListener("visibilitychange", onVisible);
  window.setInterval(check, 60_000);
}

