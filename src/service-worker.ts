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

sw.oninstall = (e) => e.waitUntil(install());
sw.onactivate = (e) => e.waitUntil(activate());
sw.onfetch = (e) => methods[e.request.method]?.(e);

async function install() {
  await sw.skipWaiting();
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(ASSETS);
}

async function activate() {
  await sw.clients.claim();
  const keys = await caches.keys();

  for (const key of keys) {
    if (key == CACHE_NAME || key == UPLOAD_CACHE_NAME) {
      continue;
    }

    await caches.delete(key);
  }
}

const methods = {
  async GET(event: FetchEvent) {
    const cache = await caches.open(CACHE_NAME);

    try {
      const response = await fetch(event.request);

      if (!(response instanceof Response)) {
        throw new Error("Invalid response from fetch");
      }

      if (response.status == 200) {
        cache.put(event.request, response.clone());
      }

      return response;
    } catch (error) {
      const response = await cache.match(event.request);

      if (!response) {
        throw error;
      }

      return response;
    }
  },
  async POST(event: FetchEvent) {
    const formData = await event.request.formData();
    const file = formData.get("file");

    if (typeof file != "string") {
      const cache = await caches.open(UPLOAD_CACHE_NAME);
      await cache.put("upload", new Response(file));
    }

    return Response.redirect("/", 303);
  },
};
