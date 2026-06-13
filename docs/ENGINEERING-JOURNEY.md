<!-- markdownlint-disable MD013 -->

# GlidieBirdie — Engineering Journey (Idea → Build → PoC → MVP → Production)

A concise case study of how a calm one-tap arcade game went from a single idea to a professionally
engineered, self-governing, zero-dependency open-source product. Written for the reader who wants the
*why* and the *trajectory*, not just the code.

## 0. Thesis

> Most one-tap-flyer clones optimize for punishment and virality. GlidieBirdie optimizes for **calm** —
> and treats that as an engineering constraint, not a tagline. The interesting story is less the game and
> more the **discipline**: zero dependencies, accessibility as a pillar, and a repository that defends and
> documents itself well enough to be edited safely by autonomous agents.

## 1. Idea

- **Problem framing.** The one-tap flyer is a perfect microcosm: trivial to play, brutal to master, and
  usually stressful. Could the same addictive loop feel *kind*?
- **Constraints chosen up front** (the spine of every later decision):
  - One HTML file, one CSS file, one engine file. No build step. No runtime dependencies. No backend.
  - Accessibility and reduced-motion respect are non-negotiable.
  - It must run by opening a file, and install as a PWA.
- **Why these constraints?** They make the artifact forkable, auditable, and immortal — no toolchain rot,
  no dependency CVEs, no server bill. They also force genuine engineering (you cannot import your way out
  of a problem).

## 2. Build

- **Architecture** (see [`ARCHITECTURE.md`](ARCHITECTURE.md)): a `requestAnimationFrame` loop driving a
  delta-time-normalized simulation over a single mutable `state` object, rendered to one DPR-scaled canvas.
- **Calm encoded in constants.** Gentle gravity, asymmetric terminal velocities, larger gaps, consonant
  procedural arpeggios, slow hue drift. The feel is enforced in `CONFIG`, not improvised.
- **Real systems, hand-built:** a Web Audio graph (master → lowpass + convolution reverb), seeded RNG
  (mulberry32) for daily-seed mode, offscreen sprite caches, and object pools — all without a library.
- **Correctness invariants** that bite were identified and protected: the `dt` clamp (tunneling-proof
  collision at any frame rate), `dtSec`/`dt` coupling, visual-only squash/stretch.

## 3. Proof of Concept → MVP

- **PoC:** the loop is fun and the bird has *character* (emotions, eye-tracking, breathing) — the calm
  thesis survives contact with players.
- **MVP feature set** grew past a toy: five themes (table-driven), a forgiving Feather Shield, daily-seed
  mode, persistent stats, achievements, a Serene Postcard capture, full mobile controls, and an offline PWA
  shell. Each feature respects the original constraints (procedural, zero-asset, accessible).
- **Data model** (see [`DATA-MODEL.md`](DATA-MODEL.md)): persistence is the browser's `localStorage`,
  namespaced under `gb:` behind guarded helpers — no PII, no DB, trivially privacy-compliant.

## 4. Hardening to production-grade (v3.0.0)

The two *existential* liabilities were removed deliberately, each with a CI tripwire so it can never
silently return:

| Liability | Fix | Tripwire |
|---|---|---|
| A prior **trademarked** name | Renamed to GlidieBirdie everywhere | `tests/brand-guard.mjs` fails the build if the retired mark reappears |
| **AGPL** copyleft (repelled forking/embedding) | Relicensed to **MIT** | `tests/license-guard.mjs` pins `LICENSE.txt` + `package.json` |

Alongside six Gold-level fixes (true UTC day-streak, namespaced+migrated storage, stale-while-revalidate
service worker, tutorial-modal a11y, a death-wave timer-leak fix, and real PNG install icons + canonical /
robots / sitemap with a link-guard).

## 5. The novel part — a self-governing repository

This repo is edited by **many autonomous agents in parallel**. That is a new failure surface, and the
engineering response is the most transferable lesson here:

- **Every change is gated.** `main` is branch-protected and PR-only; nothing merges red.
- **CI is the reviewer.** `npm run check` = syntax × N + static-checks + 40+ behavioral engine assertions +
  smoke + brand/license/link guards; a separate ephemeral-TypeScript typecheck keeps `game.js` `checkJs`-clean.
- **Agents cannot disable their own oversight.** A required **Guardrail check** blocks any PR touching the
  safety machinery (`.github/`, `tests/`, agent rules, `package.json`) unless a human applies a deliberate
  label — closing the classic "agent weakens its own brakes" alignment hole.
- **Production is watched.** A rename-proof **post-deploy canary** probes the live site after each deploy and
  opens an issue if a merge breaks it.
- **Dependencies stay current but safe.** SHA-pinned Actions + Dependabot, with **major bumps held** for a
  human (the highest-risk supply-chain change).

The merge-collision bug class that multi-agent editing actually produced (duplicate object keys, duplicate
ids) is now caught deterministically by `tests/static-checks.mjs` before merge.

## 6. Performance & DSA posture

The engine is **O(P + A + W)** per frame over small bounded sets — effectively constant-time (see
[`COMPLEXITY.md`](COMPLEXITY.md)). Two documented DSA upgrades were implemented and proven:

- Object pools moved from a rotating linear probe to an **explicit free-list → strict O(1) spawn**
  (verified leak-free by a count-conservation invariant harness).
- The tooling line-resolver went **O(offset) → O(log n)** via precomputed offsets + binary search
  (verified identical across thousands of offsets).

## 7. What makes it notable (for a reviewer)

- **Zero runtime dependencies** at ~3.4k engine LOC with real audio, physics, PWA, and accessibility.
- **Accessibility beyond most shipped AAA**: reduced-motion *and* reduced-transparency *and* forced-colors,
  color-blind redundancy, focus-trapped modals, ARIA live updates.
- **A 500-point inspection** ([`INSPECTION-500.md`](INSPECTION-500.md), 25 sections × 20, scored 482/500)
  with every finding tracked.
- **A repository that documents and defends itself** — the governance model is reusable for any team running
  AI agents against a live codebase.

## 8. Roadmap

Forward work (perf micro-optimizations, a merge queue, property/fuzz and visual-regression tests, and an
orchestrator-side activity ledger) is tracked on the [`ROADMAP.md`](ROADMAP.md) Kanban board.

---

*From a single calm idea to a self-governing, zero-dependency, MIT-licensed PWA — engineered to withstand
scrutiny from an academic, an investor, a researcher, a player, or an engineer.*
