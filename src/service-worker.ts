// https://svelte.dev/docs/kit/service-workers

/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { build, files, prerendered, version } from "$service-worker";

const sw = self as unknown as ServiceWorkerGlobalScope;

const CACHE_NAME = `MeanScout-${version}`;
const UPLOAD_CACHE_NAME = `MS-Uploads-${version}`;
const ASSETS = [...build, ...files, ...prerendered];

sw.oninstall = (e) => e.waitUntil(oninstall());
sw.onactivate = (e) => e.waitUntil(onactivate());
sw.onfetch = (e) => e.respondWith(onfetch(e));

async function oninstall() {
  await sw.skipWaiting();
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(ASSETS);
}

async function onactivate() {
  await sw.clients.claim();
  const keys = await caches.keys();

  for (const key of keys) {
    if (key == CACHE_NAME || key == UPLOAD_CACHE_NAME) {
      continue;
    }

    await caches.delete(key);
  }
}

async function onfetch(event: FetchEvent) {
  if (event.request.method == "POST") {
    return await onpost(event);
  }

  return await onget(event);
}

async function onget(event: FetchEvent) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const networkResponse = await fetch(event.request);

    if (!(networkResponse instanceof Response)) {
      throw new Error("Invalid response from fetch");
    }

    if (networkResponse.status == 200) {
      cache.put(event.request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    const cachedResponse = await cache.match(event.request);

    if (!cachedResponse) {
      throw error;
    }

    return cachedResponse;
  }
}

async function onpost(event: FetchEvent) {
  const formData = await event.request.formData();
  const file = formData.get("file");

  if (typeof file != "string") {
    const cache = await caches.open(UPLOAD_CACHE_NAME);
    await cache.put("upload", new Response(file));
  }

  return Response.redirect("/", 303);
}
