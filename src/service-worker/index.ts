// https://svelte.dev/docs/kit/service-workers

import { version } from "$app/env";
import { assets, immutable } from "$app/manifest";
import { asset } from "$app/paths";
import { self } from "$app/service-worker";

const CACHE_NAME = `MeanScout-${version}`;
const ASSETS = [...immutable.map((asset) => asset.path), ...assets.map((a) => asset(a.path))];
const ORIGIN = new URL(self.location.href).origin;

self.oninstall = (e) => e.waitUntil(oninstall());
self.onactivate = (e) => e.waitUntil(onactivate());
self.onfetch = (e) => {
  if (new URL(e.request.url).origin !== ORIGIN) {
    return;
  }

  if (e.request.method !== "GET") {
    return;
  }

  e.respondWith(onfetch(e.request));
};

async function oninstall() {
  await self.skipWaiting();
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(ASSETS);
}

async function onactivate() {
  await self.clients.claim();
  const keys = await caches.keys();

  for (const key of keys) {
    if (key != CACHE_NAME) {
      await caches.delete(key);
    }
  }
}

async function onfetch(request: Request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  const networkResponse = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }

      return response;
    })
    .catch(() => Response.error());

  return cachedResponse || networkResponse;
}
