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

