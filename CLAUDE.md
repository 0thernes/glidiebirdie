# Project Context For AI Assistants

This file is for Claude Code, Codex, Cursor, Copilot, Continue, and similar tools.

Read this first before making changes in the repo.

## Read Order

1. `README.md`
2. `docs/architecture_master_blueprint.md`
3. `CONTRIBUTING.md`
4. `tests/smoke-test.mjs`
5. `.memory/security.md` before touching storage, network, or DOM injection

## What This Project Is

A solo-built, browser-first GlidieBirdie variant tuned for comfort and clarity.

The runtime is intentionally simple:

- one HTML shell
- one CSS file
- one game engine file
- one small service worker
- no build step
- no runtime dependencies
- no backend

## Hard rules

- Do not add a build step.
- Do not add runtime dependencies.
- Do not add remote assets, hosted fonts, analytics, or CDN imports.
- Do not add a backend or network data flow for gameplay state.
- Do not split `game.js` into modules.
- Do not split `style.css` into multiple files.
- Keep the service worker tiny and app-shell-focused.

## Runtime Rules

- Put tunable constants in `CONFIG`.
- Respect `state.dt` or `state.dtSec` for time-based behavior.
- Route persistence through the guarded storage helpers only.
- Keep mobile controls functional when gameplay changes.
- Preserve keyboard access, live announcements, and reduced-motion handling.
- Prefer extending the current structure over inventing a parallel one.

## Documentation Rules

If you change the public shape of the project, update the matching docs in the same change set.

- `README.md` for player-facing features and workflow
- `docs/architecture_master_blueprint.md` for runtime structure
- `CONTRIBUTING.md` for contributor workflow
- `SUPPORT.md` for troubleshooting changes

## Important Files

| File | Purpose |
| --- | --- |
| `game.js` | Entire runtime engine |
| `index.html` | Semantic shell, canvas host, controls, tutorial, PWA metadata |
| `style.css` | Layout, components, themes, accessibility styling |
| `service-worker.js` | Minimal offline shell caching |
| `manifest.webmanifest` | Install metadata |
| `tests/smoke-test.mjs` | Lightweight repo safety checks |
| `.memory/` | Canonical project notes and constraints |

## When In Doubt

- Prefer a smaller change.
- Preserve the current runtime shape.
- Check the architecture guide before refactoring.
- Run `npm run check` before closing the task.
