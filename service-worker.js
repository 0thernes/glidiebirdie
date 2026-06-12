// @ts-check
/// <reference lib="webworker" />
'use strict';

/** @type {ServiceWorkerGlobalScope} */
const sw = /** @type {any} */ (self);

// Cache version is tied to package.json `version` and verified in CI
// (tests/smoke-test.mjs). Bumping the release always invalidates the offline
// shell, so a returning player can never be pinned to a stale build.
const CACHE_NAME = 'glidiebirdie-v3.0.0';
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

  event.respondWith(staleWhileRevalidate(request));
});

/**
 * Stale-while-revalidate: serve the cached copy instantly for snappy offline
 * loads, but ALWAYS kick off a background fetch that refreshes the cache so the
 * next load is current. This replaces the old cache-first strategy, which pinned
 * returning players to whatever shell was cached until the SW file itself changed
 * — i.e. permanently stale between releases. Now updates self-heal within one load.
 * @param {Request} request
 */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const networkFetch = fetch(request)
    .then((response) => {
      if (response && response.ok && isAppShellRequest(request)) {
        // Clone before the page consumes the body.
        cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    })
    .catch(() => null);

  // Cached copy wins for latency; the background refresh updates it for next time.
  if (cached) return cached;

  const fresh = await networkFetch;
  if (fresh) return fresh;

  // Offline cold-start for a route we never cached: fall back to the app shell.
  if (request.mode === 'navigate') {
    const fallback = await cache.match('./index.html');
    if (fallback) return fallback;
  }
  return Response.error();
}

/** @param {Request} request */
function isAppShellRequest(request) {
  if (request.mode === 'navigate') return true;
  return APP_SHELL.map((path) => new URL(path, sw.registration.scope).href).includes(request.url);
}
