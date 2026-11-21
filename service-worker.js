// @ts-check
/// <reference lib="webworker" />
'use strict';

/** @type {ServiceWorkerGlobalScope} */
const sw = /** @type {any} */ (self);

// Cache version is tied to package.json `version` and verified in CI
// (tests/smoke-test.mjs). Bumping the release always invalidates the offline
// shell, so a returning player can never be pinned to a stale build.
const CACHE_NAME = 'glidiebirdie-v3.1.0';
const APP_SHELL = Object.freeze([
  './',
  './index.html',
  './style.css',
  './game.js',
  './manifest.webmanifest',
  './docs/assets/icon-180.png',
  './docs/assets/icon-192.png',
  './docs/assets/icon-512.png',
  './src/achievements.js',
  './src/audio.js',
  './src/collision.js',
  './src/config.js',
  './src/dom.js',
  './src/haptics.js',
  './src/hooks.js',
  './src/index.js',
  './src/input-queue.js',
  './src/input.js',
  './src/loop.js',
  './src/main.js',
  './src/physics.js',
  './src/render.js',
  './src/rng.js',
  './src/session.js',
  './src/state.js',
  './src/storage.js',
  './src/timestep.js',
  './src/ui.js',
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

  event.respondWith(staleWhileRevalidate(event, request));
});

/**
 * Stale-while-revalidate: serve the cached copy instantly for snappy offline
 * loads, and ALWAYS refresh the cache in the background (held open via
 * `event.waitUntil`) so the next load is current. Query-string requests to
 * app-shell URLs match ignoring search params and normalize cache keys so
 * campaign/UTM parameters never cause offline misses or unbounded cache bloat.
 * @param {FetchEvent} event
 * @param {Request} request
 */
async function staleWhileRevalidate(event, request) {
  const cache = await caches.open(CACHE_NAME);
  const appShell = isAppShellRequest(request);
  const cleanKey = appShell ? normalizeShellUrl(request.url) : null;
  const cached =
    (await cache.match(request)) ||
    (appShell ? await cache.match(request, { ignoreSearch: true }) : undefined);

  const networkFetch = fetch(request)
    .then((response) => {
      if (response && response.ok && appShell && cleanKey) {
        // Clone before the page consumes the body; store under normalized URL key.
        cache.put(cleanKey, response.clone()).catch(() => {});
      }
      return response;
    })
    .catch(() => null);

  // Keep SW alive until background refresh finishes when returning a cached hit.
  if (cached) {
    event.waitUntil(networkFetch);
    return cached;
  }

  const fresh = await networkFetch;
  if (fresh && fresh.ok) return fresh;

  // Offline or 4xx/5xx cold-start for a navigation route: fall back to the app shell.
  if (request.mode === 'navigate') {
    const fallback = await cache.match('./index.html');
    if (fallback) return fallback;
  }
  if (fresh) return fresh;
  return Response.error();
}

// Resolved absolute URLs of the app shell, computed once. The previous code
// rebuilt + linear-scanned this list on every fetch (O(n) per request); a Set
// built lazily on first use makes each subsequent membership test O(1).
let _shellUrlSet = /** @type {Set<string> | null} */ (null);

/** @param {string} rawUrl */
function normalizeShellUrl(rawUrl) {
  const cleanUrl = new URL(rawUrl);
  cleanUrl.search = '';
  cleanUrl.hash = '';
  return cleanUrl.href;
}

/** @param {Request} request */
function isAppShellRequest(request) {
  if (request.mode === 'navigate') return true;
  if (!_shellUrlSet) {
    _shellUrlSet = new Set(APP_SHELL.map((path) => new URL(path, sw.registration.scope).href));
  }
  return _shellUrlSet.has(normalizeShellUrl(request.url));
}
