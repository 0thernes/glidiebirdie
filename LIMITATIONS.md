# Limitations and Real-vs-Metaphor Boundaries (`LIMITATIONS.md`)

This document states explicitly what **GlidieBirdie v3.2.0** does **not** prove, guarantee, or solve (Build Standard B41).

## 1. Epistemic Scope & Unsolved Problems Mega-Atlas

- **0 / 1,900 Mega-Atlas problems retired:** GlidieBirdie is a deterministic browser game and software-verification artifact, not a mathematical conjecture proof. None of the 1,900 open problems in `0thernes/unsolved-problems-mega-atlas` are solved or retired by this repository.
- **Not peer reviewed:** Neither the repository nor the Build White Paper (`dist/Donahue_2026_glidiebirdie_deterministic_browser_architecture.pdf`) has undergone external journal or conference peer review. Correctness rests solely on reproducible mechanical checks (Lean 4.35.0 kernel + automated test suites).

## 2. Formal-to-Runtime Modeling Gaps (Lean 4 vs JavaScript)

- **Discrete integers vs IEEE-754 float64:** The 55 Lean 4.35.0 theorems verify exact integer and `UInt32` specifications (`GlidieBirdieProofs/Spec.lean`). The browser runtime executes JavaScript IEEE-754 double-precision floating-point arithmetic for bird velocity, drag (`Math.pow`), canvas rendering, and `msToTicks` rounding. Float behavior is tested empirically (`tests/determinism.mjs`, `tests/property-and-metamorphic.mjs`, `tests/fuzz-http-and-inputs.mjs`, `results/benchmarks.json`), not formally proved over $\mathbb{R}$ or IEEE-754.
- **Abstract slot counts vs JS arrays:** `PoolAndQueue.lean` certifies slot conservation (`active + free = cap`) on an abstract state counter; concrete index uniqueness and object mutation in `particlePool`/`weatherPool` are verified empirically by `tests/engine-test.mjs` and the 10,000-cycle pool churn benchmark.
- **Canvas & Web Audio side effects:** Visual rendering (`src/render.js`) and Web Audio DSP synthesis (`src/audio.js`) are verified via Node stubs, Playwright browser runs, and manual inspection rather than formal semantics.

## 3. Platform & Security Limitations

- **No `file://` execution:** Because `game.js` uses native ES2022 modules (`<script type="module">`), modern browsers block module loading over `file://` due to CORS. Serve locally over HTTP (`npm run serve`) or via HTTPS (GitHub Pages).
- **Client-side persistence is user-modifiable:** `localStorage` (`gb:*` keys) is strictly local convenience storage. A player can edit their own scores or achievements in browser DevTools; no tamper-proof leaderboard or server-side anti-cheat exists or is claimed.
- **GitHub Pages CSP header ceiling:** `index.html` enforces a strict `<meta http-equiv="Content-Security-Policy">` (`default-src 'self'`), but `frame-ancestors` is a response-header-only directive ignored in `<meta>` tags. GitHub Pages does not expose custom HTTP response headers (the local `tools/static-server.mjs` does emit `X-Frame-Options: DENY`).
- **Windows local multi-kernel sandbox:** On Windows, `lake build`, `VerifyAxioms.lean`, `leanchecker`, and `leanchecker-paranoid` run locally, while `lake comparator --paranoid` requires Linux `bubblewrap` namespaces and executes cleanly in the Ubuntu GitHub Actions CI job (`lean-6kernel`).

## 4. Real vs Metaphor

- Visual terms in the game and docs (*"calm"*, *"zen"*, *"living bird"*, *"breathing"*, *"emotion"*, *"Afterglow"*) describe purely cosmetic Canvas 2D sprite expressions, easing curves, and UI copy. No biological simulation, emotional state, or clinical relaxation/therapeutic efficacy is claimed.
