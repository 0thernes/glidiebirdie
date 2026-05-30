// @ts-check
/// <reference lib="webworker" />
'use strict';

/** @type {ServiceWorkerGlobalScope} */
const sw = /** @type {any} */ (self);

const CACHE_NAME = 'flappy-calm-v2.2.0';
const APP_SHELL = Object.freeze([
  './',
  './index.html',
  './style.css',
  './game.js',
  './manifest.webmanifest',
]);

sw.addEventListener('install', (/** @type {ExtendableEvent} */ event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll([...APP_SHELL]))
      .then(() => sw.skipWaiting()),
  );
});

sw.addEventListener('activate', (/** @type {ExtendableEvent} */ event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => sw.clients.claim()),
  );
});

sw.addEventListener('fetch', (/** @type {FetchEvent} */ event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== sw.location.origin) return;

  event.respondWith(cacheFirst(request));
});

/** @param {Request} request */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok && isAppShellRequest(request)) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    if (request.mode === 'navigate') {
      const fallback = await caches.match('./index.html');
      if (fallback) return fallback;
    }
    return Response.error();
  }
}

/** @param {Request} request */
function isAppShellRequest(request) {
  if (request.mode === 'navigate') return true;
  return APP_SHELL.map((path) => new URL(path, sw.registration.scope).href).includes(request.url);
}
