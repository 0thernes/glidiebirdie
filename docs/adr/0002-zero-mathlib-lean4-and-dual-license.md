# ADR 0002: Zero-Mathlib Lean 4.35.0 Formal Core and MIT / CC BY 4.0 Dual License

- **Date:** 2026-11-25
- **Status:** Accepted

## Context

GlidieBirdie's critical invariants (720 Hz LCM grid, Euclidean circle-vs-rect projection, universal pipe passability, UTC `YYYYMMDD` calendar injectivity, free-list pool conservation, 64-slot FIFO bound, 32-bit `mulberry32`) are purely discrete. Pulling Mathlib would add multi-gigabyte cache dependencies and slow CI unnecessarily.

## Decision

1. Formalize all 68 discrete invariants and constructive adversarial refutations in pure Lean 4.35.0 (`lean/GlidieBirdieProofs/`, `module` system, zero Mathlib, zero external Lake packages) with isolated Palomar `Challenge.lean` / `Solution.lean` / `comparator.json` checked across 6 independent kernels plus a live negative kernel tamper check.
2. Keep permissive MIT licensing for all source code (`LICENSE.txt`) and CC BY 4.0 for manuscripts, white papers, and documentation (`NOTICE`, `paper/`, `dist/`).

## Consequences

- **Positive:** Full clean Lean build takes ~6 s with zero external cache downloads; every theorem audits strictly within `[propext, Classical.choice, Quot.sound]` (19 theorems use zero axioms).
- **Trade-off:** IEEE-754 floating-point canvas and Web Audio behavior stays outside the integer/UInt32 formal model and is verified empirically via Node/Playwright suites (documented in `LIMITATIONS.md`).
