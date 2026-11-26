# GlidieBirdie — Canonical Project Context For AI Assistants

Read this file first before modifying the repository. `CLAUDE.md`, `GEMINI.md`, and `.cursor/rules/build-standard.mdc` all point here.

## Read Order

1. `README.md` — player features, quickstart, and 5-second axiom proof
2. `CLAIMS.md` & `LIMITATIONS.md` — falsifiable claims and honest boundaries
3. `docs/ARCHITECTURE.md` & `docs/architecture_master_blueprint.md` — acyclic 20-module ES2022 layout
4. `docs/build-standard.md` & `repo.yaml` — Build Standard v1.2.0 manifest
5. `lean/README.md` — 45 zero-Mathlib Lean 4.35.0 proofs (Palomar `Challenge`/`Solution`)
6. `.memory/security.md` & `docs/threat-model.md` — storage, CSP, and HTTP server boundaries

## What This Project Is

GlidieBirdie (`v3.2.0`) is a solo-built, browser-first, zero-runtime-dependency calm arcade flyer engineered with:

- one semantic HTML shell (`index.html`)
- one layered stylesheet (`style.css`)
- 20 native ES2022 modules under `src/` (`src/main.js`, 18 runtime modules, and `src/index.js` headless barrel) loaded by `game.js` (zero bundler, zero runtime npm deps)
- one compact offline app-shell service worker (`service-worker.js`)
- 45 machine-checked pure Lean 4.35.0 theorems (`lean/`, zero Mathlib, Palomar `Challenge.lean`/`Solution.lean`)
- an AMS-LaTeX Build White Paper (`paper/main.tex` -> `dist/Donahue_2026_glidiebirdie_deterministic_browser_architecture.pdf`)

## Hard Rules

- Do not add a build step or bundler for the browser game.
- Do not add runtime dependencies (`package.json` `dependencies` stays absent; dev-only tooling runs offline/CI).
- Do not add remote assets, hosted fonts, analytics, or CDN imports.
- Do not add a backend or network data flow for gameplay state.
- Do not split `style.css` into multiple files.
- Keep `service-worker.js` tiny and app-shell-focused; keep `CACHE_NAME` locked to `VERSION` and `package.json`.
- Never fabricate test results, axiom lines, benchmarks, peer review, DOIs, or LLC affiliation (`Alexander Stephen Donahue`, Independent Researcher, ORCID `0009-0006-8168-9648`).
- Classify every audit finding as exactly one of: `bug`, `error`, `issue`, `problem`, `concern`, `dilemma`, `conflict`, `gap`, `hole`, `blindspot`.

## Runtime Rules

- Put tunable constants in `CONFIG` (`src/config.js`).
- Advance gameplay strictly via the 720 Hz fixed-step integrator (`src/timestep.js`, `src/loop.js`).
- Route all persistence through guarded helpers in `src/storage.js` under the `gb:` namespace.
- Keep keyboard, pointer, mobile touch bar, and gamepad controls at parity.
- Preserve WCAG 2.2 AA accessibility, live screen-reader announcements, `prefers-reduced-motion`, and unlayered `prefers-reduced-transparency`.
- Never bypass active GitHub branch protection or self-apply `guardrail-approved`; if branch protection is enabled on `main`, leave guardrail approval to the human owner.

## Verification Commands

```bash
npm run check          # syntax, static, brand, link, license, 69 engine, 8 property/contract, determinism, smoke
npm run mutate         # 10/10 surgical mutation testing
npm run benchmark      # 30-seed paired 60/144 Hz benchmark -> results/benchmarks.json
npm run lint           # ESLint across src/, tests/, tools/, scripts/
npm run typecheck      # tsc via jsconfig.json + WebWorker service-worker.js
npm run test:browser   # 7 Playwright + axe-core WCAG 2.2 AA E2E tests
cd lean && lake build && lake build Challenge && lake env lean VerifyAxioms.lean
pwsh scripts/Audit-Repo.ps1 -Path .
```

## Repository Map

| Path | Purpose |
| --- | --- |
| `game.js`, `src/*.js` | Native ES2022 browser engine (18 acyclic modules) |
| `index.html`, `style.css`, `service-worker.js`, `manifest.webmanifest` | PWA shell, CSS Cascade Layers, offline cache |
| `lean/` | 45 pure Lean 4.35.0 theorems (`module`, zero Mathlib, Palomar `Challenge`/`Solution`, `comparator.json`) |
| `paper/`, `dist/` | AMS-LaTeX Build White Paper, frozen PDF, standalone `arxiv_submission.tar.gz` |
| `tests/`, `scripts/` | Engine, determinism, property/metamorphic/HTTP contract, Playwright/axe, mutation, benchmarks, audit |
| `tools/` | Zero-dep `static-server.mjs` (`/healthz`, traversal/symlink defense) & `generate-icons.mjs` |
| `docs/`, `.memory/` | Architecture, ADRs, threat model, benchmarks, preregistration, reviews, run-log |
