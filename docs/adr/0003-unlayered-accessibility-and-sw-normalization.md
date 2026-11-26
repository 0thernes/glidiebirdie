# ADR 0003: Unlayered Reduced-Transparency Overrides and Query-Normalized Service Worker Caching

- **Date:** 2026-11-21 (hardened 2026-11-25)
- **Status:** Accepted

## Context

Two subtle browser-platform bugs surfaced during forensic review:

1. CSS Cascade Layers (`@layer layout`) caused `@layer components` and unlayered `.toast` rules to override `@media (prefers-reduced-transparency: reduce)`.
2. Query-parameterized requests (`./index.html?v=1`) could serve stale legacy cache entries ahead of refreshed normalized shell entries if `cache.match(request)` ran before `cache.match(cleanKey)` or if `cache.put()` was not awaited inside `event.waitUntil`.

## Decision

1. Place `@media (prefers-reduced-transparency: reduce)` unlayered at the end of `style.css` (asserted in `tests/smoke-test.mjs`).
2. Normalize app-shell URLs (`cleanKey`) first in `staleWhileRevalidate()`, `await cache.put(cleanKey, response.clone())`, precache all 3 PNG install icons (`180/192/512`), and tie `CACHE_NAME` strictly to `VERSION` / `package.json`.

## Consequences

- **Positive:** Reliable opaque UI under `prefers-reduced-transparency: reduce`, zero stale query-shadowed PWA shells, and deterministic cache invalidation on every version bump.
