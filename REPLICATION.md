# Replication Protocol (`REPLICATION.md`)

Any independent engineer or researcher can replicate every formal, empirical, and browser claim in **GlidieBirdie v3.2.0** from a clean clone without special hardware, API keys, or cloud credentials (Build Standard B43, B44).

## Prerequisites

- **Node.js** `>= 20` (tested on Node `v22` in CI and `v25.8.2` locally)
- **Lean 4** `v4.35.0` via `elan` (`lean/lean-toolchain` pins `leanprover/lean4:v4.35.0`; zero Mathlib download required)
- **Tectonic** `>= 0.15` (optional, for recompiling `paper/main.tex` to PDF)
- **Playwright Chromium** (`npx playwright install --with-deps chromium`, optional for browser E2E/axe-core tests)

## Step-by-Step Clean-Clone Replication

```bash
git clone https://github.com/0thernes/glidiebirdie.git
cd glidiebirdie
npm ci

# 1. Core syntax, static, brand, link, license, 69 engine, 8 property/contract, determinism, and smoke suites
npm run check

# 2. Surgical mutation testing (10/10 mutants must be KILLED)
npm run mutate

# 3. 30-seed paired 60 Hz vs 144 Hz determinism & pool-churn benchmark
npm run benchmark

# 4. Report-only ESLint & strict TypeScript (checkJs + WebWorker) checks
npm run lint
npm run typecheck

# 5. Browser E2E + WCAG 2.2 AA accessibility tests (7 Playwright + axe-core tests)
npx playwright install --with-deps chromium
npm run test:browser

# 6. Pure Lean 4.35.0 formal core (45 theorems, zero sorry, zero Mathlib, 6-kernel comparator on Linux)
cd lean
lake build
lake build Challenge
lake env lean VerifyAxioms.lean
lake env leanchecker --fresh Solution
lake env leanchecker-paranoid --fresh Solution
# On Linux with bubblewrap installed:
lake check --paranoid
lake comparator --config comparator.json --paranoid
cd ..

# 7. Standalone Build White Paper & arXiv tarball compilation
tectonic -X compile paper/main.tex --outdir paper/build --keep-intermediates

# 8. Build Standard v1.2.0 self-audit
pwsh scripts/Audit-Repo.ps1 -Path .    # or: bash scripts/audit-repo.sh .
```

## Expected Replication Criteria

1. `npm run check` exits `0` with `69/69` engine assertions, `8/8` property/metamorphic/HTTP contract suites, `180` identical steps at 60 Hz and 144 Hz, and `0` static/brand/link/license failures.
2. `npm run mutate` exits `0` with `10/10 (100.0%) killed, 0 survived`.
3. `results/benchmarks.json` reports `fixed_step_720hz_max_drift_px.max === 0`, `paired_wins_fixed_over_variable === 30`, `exact_sign_test_p <= 1e-8`, and `conservation_violations === 0`.
4. `VerifyAxioms.lean` emits 45 lines strictly within `[propext, Classical.choice, Quot.sound]` (0 `sorryAx`, 0 `ofReduceBool`, 0 custom axioms), and `leanchecker` / `leanchecker-paranoid` / `lake comparator --paranoid` exit `0`.

## Replication Log

| Date (UTC) | Replicator | Environment | Scope Verified | Outcome | Notes |
| --- | --- | --- | --- | --- | --- |
| 2026-11-26 | Alexander S. Donahue (author, self-replication) | Windows 11 x64, Node v25.8.2, Lean 4.35.0, Tectonic 0.17.0 | `npm run check`, `mutate` (10/10), `benchmark` (30/30), `lint`, `typecheck`, `lean` (45/45 + `leanchecker-paranoid`), Tectonic PDF + arXiv tarball, `Audit-Repo.ps1` | PASS | Self-replication only; **awaiting independent external replication** (open an issue to add your row). |
