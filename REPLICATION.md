# Replication Protocol (`REPLICATION.md`)

Any independent engineer or researcher can replicate every formal, empirical, and browser claim in **GlidieBirdie v3.2.0** from a clean clone without special hardware, API keys, or cloud credentials (Build Standard B43, B44).

## Prerequisites

- **Node.js** `>= 20` (tested on Node `v22` in CI and `v25.8.2` locally)
- **Lean 4** `v4.35.0` via `elan` (`lean/lean-toolchain` pins `leanprover/lean4:v4.35.0`; zero Mathlib download required)
- **Tectonic** `>= 0.15` (optional, for recompiling `paper/main.tex` and `dist/arxiv_submission.tar.gz`)
- **Playwright Chromium** (`npx playwright install --with-deps chromium`, optional for browser E2E/axe-core tests)

## Step-by-Step Clean-Clone Replication

```bash
git clone https://github.com/0thernes/glidiebirdie.git
cd glidiebirdie

# 1. Verify tracked SHA-256 manifests BEFORE regenerating host-specific benchmarks
sha256sum -c data/MANIFEST.sha256
sha256sum -c CHECKSUMS.sha256

npm ci

# 2. Core syntax, static, brand, link, license, 12/12 citations, 81 engine, 8 property/contract, determinism, and smoke suites
npm run check

# 3. Structured adversarial fuzzing (2,000 JS parser & HTTP static-server cases) + C11 differential oracle (1,000,000 fuzz cases)
npm run fuzz
npm run test:native

# 4. Baseline-gated surgical mutation testing (16/16 mutants must be KILLED)
npm run mutate

# 5. 30-seed counterbalanced 60 Hz vs 144 Hz determinism, 5,400 pure-step & 5x10k pool-churn benchmarks
#    (Note: rewrites results/benchmarks.json with your local CPU/OS timings.)
npm run benchmark

# 6. Report-only ESLint & strict TypeScript (checkJs + WebWorker) checks
npm run lint
npm run typecheck

# 7. Browser E2E + 4-view WCAG 2.2 AA accessibility tests (7 Playwright + axe-core tests)
npx playwright install --with-deps chromium
npm run test:browser

# 8. Pure Lean 4.35.0 formal core (68 theorems, zero sorry, zero Mathlib, 6-kernel comparator + negative tamper test)
(
  cd lean
  lake build
  lake build Challenge
  lake env lean VerifyAxioms.lean
  lake env leanchecker --fresh Solution
  lake env leanchecker-paranoid --fresh Solution
  # On Linux with bubblewrap installed:
  lake check --paranoid
  lake comparator --config comparator.json --paranoid
)
# On Linux with bubblewrap installed — live negative kernel tamper test (must exit 0 after rejecting sorry):
bash lean/scripts/verify-negative-kernel.sh

# 9. Build White Paper source AND standalone arXiv tarball verification
mkdir -p paper/build /tmp/arxiv-verify
tectonic -X compile paper/main.tex --outdir paper/build --keep-intermediates
tar -xzf dist/arxiv_submission.tar.gz -C /tmp/arxiv-verify
tectonic -X compile /tmp/arxiv-verify/main.tex --outdir /tmp/arxiv-verify

# 10. Build Standard v1.2.0 self-audit
pwsh scripts/Audit-Repo.ps1 -Path .    # or: bash scripts/audit-repo.sh .
```

## Expected Replication Criteria

1. `sha256sum -c data/MANIFEST.sha256` and `sha256sum -c CHECKSUMS.sha256` pass cleanly on a fresh clone before regenerating `results/benchmarks.json`.
2. `npm run check` exits `0` with `12/12` citations resolved, `81/81` engine assertions, `8/8` property/metamorphic/HTTP contract suites, `180` identical hitch-free steps at 60 Hz and 144 Hz, and `0` static/brand/link/license failures.
3. `npm run fuzz` exits `0` across `2,000` adversarial JS cases (`1,500` parser/engine + `500` HTTP) with `0` crashes and `0` leaks, and `npm run test:native` compiles `native/glidiebirdie_oracle.c` with `-std=c11 -O3 -Wall -Wextra -Werror` and completes `1,000,000` fuzz cases with `0` failures and bit-for-bit JS/Lean parity.
4. `npm run mutate` exits `0` after baseline verification with `16/16 (100.0%) killed, 0 survived, 0 runner errors`.
5. `results/benchmarks.json` reports `fixed_step_60hz_on_720hz_grid_max_drift_px.max === 0`, `paired_wins_fixed_over_variable === 30`, `exact_sign_test_p <= 1e-8`, `pure_simulation_step_latency_us.median < 2000`, `individual_step_budget_violations_60hz === 0`, and `conservation_violations === 0`.
6. `VerifyAxioms.lean` emits `68` lines strictly within `[propext, Classical.choice, Quot.sound]` (`19` zero-axiom, `0` `sorryAx`, `0` `ofReduceBool`, `0` custom axioms), `leanchecker` / `leanchecker-paranoid` / `lake comparator --paranoid` exit `0`, and `lean/scripts/verify-negative-kernel.sh` exits `0` (proving tampered proofs are rejected).
7. Both `paper/main.tex` and the extracted standalone `dist/arxiv_submission.tar.gz` compile cleanly via Tectonic with `0` warnings.

## Replication Log

| Date (UTC) | Replicator | Environment | Scope Verified | Outcome | Notes |
| --- | --- | --- | --- | --- | --- |
| 2026-11-26 | Alexander S. Donahue (author, self-replication) | Windows 11 (`10.0.29704`, Intel Core Ultra 9 275HX, 24 cores), Node `v25.8.2`, Lean `4.35.0`, Tectonic `0.17.0` + GitHub Actions Ubuntu/macOS/Windows CI | `check`, `fuzz` (2,000), `mutate` (12/12), `benchmark` (30/30 + 5,400 steps), `lint`, `typecheck`, `test:browser` (7/7 + 4-view axe), `lean` (55/55 + 6-kernel comparator + negative tamper test), Tectonic PDF + arXiv tarball, `Audit-Repo.ps1` | PASS | Author self-replication + public CI (Round 2). |
| 2026-11-27 | Alexander S. Donahue (author, self-replication) | Windows 11 (`10.0.29704`, Intel Core Ultra 9 275HX, 24 cores), Node `v25.8.2`, Lean `4.35.0`, Zig `0.17.1` (`zig cc` Clang 22.1.8), Tectonic `0.17.0` + GitHub Actions Ubuntu/macOS/Windows CI | `check` (81/81 engine), `fuzz` (2,000), `test:native` (C11 1M fuzz + ASan/UBSan in CI), `mutate` (16/16), `benchmark` (30/30 + 5,400 steps), `lint`, `typecheck`, `test:browser` (7/7 + 4-view axe), `lean` (68/68 + 6-kernel comparator + negative tamper test), Tectonic PDF + arXiv tarball, `Audit-Repo.ps1` | PASS | Author self-replication + public CI (Round 3 thermal + 68-theorem + C11 oracle hardening); **B44 independent second-operator external replication pending** (open an issue to add your row). |
