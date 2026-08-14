/// <reference lib="esnext" />
/// <reference lib="webworker" />
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { NetworkOnly, Serwist, StaleWhileRevalidate } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ request }) => request.mode === "navigate",
      handler: new NetworkOnly(),
    },
    {
      matcher: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith("/_next/static/"),
      handler: new StaleWhileRevalidate({ cacheName: "polar-next-static" }),
    },
    {
      matcher: ({ request, sameOrigin, url }) =>
        sameOrigin && request.destination === "image" && !url.pathname.startsWith("/api/"),
      handler: new StaleWhileRevalidate({ cacheName: "polar-images" }),
    },
  ],
  fallbacks: {
    entries: [{ url: "/sin-conexion", matcher: ({ request }) => request.destination === "document" }],
  },
});

serwist.addEventListeners();

self.addEventListener("push", (event) => {
  const payload = event.data?.json() as { title?: string; body?: string; href?: string; tag?: string } | undefined;
  event.waitUntil(self.registration.showNotification(payload?.title || "Polar", {
    body: payload?.body || "Hay una notificación nueva.",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: payload?.tag || "polar-notification",
    data: { href: payload?.href || "/" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const href = String((event.notification.data as { href?: string } | undefined)?.href || "/");
  const target = new URL(href, self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = windows.find((client) => "focus" in client && new URL(client.url).origin === self.location.origin);
    if (existing && "navigate" in existing) {
      await existing.navigate(target);
      await existing.focus();
      return;
    }
    await self.clients.openWindow(target);
  })());
});
