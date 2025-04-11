// https://svelte.dev/docs/kit/service-workers

/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { build, files, prerendered, version } from "$service-worker";

const sw = self as unknown as ServiceWorkerGlobalScope;

const CACHE_NAME = `MeanScout-${version}`;
const ASSETS = [...build, ...files, ...prerendered];
const ORIGIN = new URL(sw.location.href).origin;

sw.oninstall = (e) => e.waitUntil(oninstall());
sw.onactivate = (e) => e.waitUntil(onactivate());
sw.onfetch = (e) => {
  if (new URL(e.request.url).origin !== ORIGIN) {
    return;
  }

  if (e.request.method !== "GET") {
    return;
  }

  e.respondWith(onfetch(e.request));
};

async function oninstall() {
  await sw.skipWaiting();
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(ASSETS);
}

async function onactivate() {
  await sw.clients.claim();
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
