// https://kit.svelte.dev/docs/service-workers

/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { build, files, prerendered, version } from "$service-worker";

const sw = self as unknown as ServiceWorkerGlobalScope;

const CACHE_NAME = `MeanScout-${version}`;
const UPLOAD_CACHE_NAME = `MS-Uploads-${version}`;
const ASSETS = [...build, ...files, ...prerendered];

sw.oninstall = (event) => {
  async function addFilesToCache() {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(ASSETS);
  }

  event.waitUntil(addFilesToCache());
};

sw.onactivate = (event) => {
  async function deleteOldCaches() {
    const keys = await caches.keys();

    for (const key of keys) {
      if (key == CACHE_NAME || key == UPLOAD_CACHE_NAME) {
        continue;
      }

      await caches.delete(key);
    }
  }

  event.waitUntil(deleteOldCaches());
};

sw.onfetch = (event) => {
  if (event.request.method == "POST") {
    return event.respondWith(
      (async () => {
        const formData = await event.request.formData();
        const file = formData.get("file");
        if (file == null || typeof file == "string") {
          return Response.redirect("/", 303);
        }

        const cache = await caches.open(UPLOAD_CACHE_NAME);
        await cache.put("upload", new Response(file));
        return Response.redirect("/", 303);
      })(),
    );
  }

  if (event.request.method == "GET") {
    return event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);

        try {
          const response = await fetch(event.request);

          if (response.status == 200) {
            cache.put(event.request, response.clone());
          }

          return response;
        } catch {
          return cache.match(event.request);
        }
      })() as Response | PromiseLike<Response>,
    );
  }
};
