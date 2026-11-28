<!-- markdownlint-disable MD013 -->

# GlidieBirdie — Roadmap & Kanban

A living board of where the project is and what's next. Calibrated to a solo, open-source, zero-dependency
browser game with an autonomous-agent contribution model. Items map to the
[500-Point Inspection](INSPECTION-500.md) opportunity list.

## Board

```mermaid
flowchart LR
  subgraph DONE[✅ Done]
    D1[v3.0.0 rebrand → GlidieBirdie]
    D2[Relicense → MIT + license-guard]
    D3[brand-guard / link-guard]
    D4[gb: namespaced storage + migration]
    D5[Stale-while-revalidate SW]
    D6[True UTC day-streak]
    D7[PNG icons / robots / sitemap]
    D8[Tutorial modal a11y]
    D9[Death-wave timer leak fix]
    D10[Branch protection + auto-merge]
    D11[Guardrail tamper-proofing]
    D12[Post-deploy canary]
    D13[Docs suite: inspection/arch/ERD/complexity/roadmap]
    D14[Pool free-list → O(1) spawn]
    D15[lineAt → O(log n) binary search]
    D16[--text-3 contrast verified ~7:1]
    D17[ENGINEERING-JOURNEY + README doc links]
    D18[v3.1.0 fixed-step + native ES modules + ESLint/Playwright/axe]
    D19[Per-pipe gradient cache]
  end
  subgraph DOING[🔧 In Progress]
    P1[Audit hardening & regression tests]
  end
  subgraph NEXT[⏭ Deferred — decided]
    N4[Merge queue]
  end
  subgraph BACKLOG[🗂 Backlog]
    B1[Property/fuzz tests]
    B2[Visual-regression check]
    B3[Activity ledger + digest]
    B4[Budget/loop governors]
    B5[Non-admin bot identity]
    B6[Save export/import]
  end
  DONE --> DOING --> NEXT --> BACKLOG
```

## Columns (detail)

### ✅ Done — shipped & verified

| Item | Evidence |
|---|---|
| Rebrand to GlidieBirdie | v3.0.0, brand-guard CI |
| Relicense to MIT | `LICENSE.txt` + license-guard |
| `gb:` storage + one-time migration | `SK` map, `migrateLegacyStorage()` |
| Stale-while-revalidate service worker | cache version tied to `package.json` |
| Real UTC day-streak | `nextDayStreak()` unit-tested |
| Install/discovery surface | PNG icons, canonical, robots, sitemap |
| Autonomous-safety pipeline | branch protection, auto-merge, **Guardrail check**, **post-deploy canary** |
| Test/CI gates | static-checks, 44+ engine assertions, 60/144 Hz determinism, smoke, ESLint, TypeScript, Playwright + axe-core WCAG 2.2 AA, brand/license/link guards |
| DSA upgrades | pool free-list → O(1) spawn (PR #17); `lineAt` → O(log n) binary search (PR #14); per-pipe local gradient cache (PR #32) |
| Documentation suite | this `docs/` set + `ENGINEERING-JOURNEY.md` + README cross-links |
| A11y: `--text-3` contrast | Verified **~7:1** (above AA 4.5 and AAA 7) — no change needed |
| Fixed-step + ES modules | v3.1.0 (PR #32): 60 Hz steps on 720 Hz grid, native `src/` modules, gamepad input |

### 🔧 In Progress

- Comprehensive bug/audit hardening pass and regression test expansion.

### ⏭ Deferred — decided, with rationale

| Item | Type | Decision |
|---|---|---|
| Merge queue | CI/CD | **Deferred.** Valuable for concurrent multi-agent merges, but adding it during active churn risks stalling in-flight auto-merges, and `static-checks` already deterministically catches the collision class that actually occurred (duplicate keys/ids). Revisit when churn settles. |

### 🗂 Backlog (valuable, larger or orchestrator-side)

| # | Item | Notes |
|---|---|---|
| 1 | Property/fuzz tests | Random-input invariant testing over the engine |
| 2 | Visual-regression check | Screenshot diff — agents are "blind" to visual breakage |
| 3 | Activity ledger + daily digest | Needs the cron/daemon harness to participate |
| 4 | Budget / loop / oscillation governors | Orchestrator-side runaway protection |
| 5 | Independent external replication (`B44`) | Clean-clone verification by a second human operator |
| 6 | Save export/import | "Copy my save" affordance |

## Release cadence

- **Patch** (`x.y.Z`): bug fixes, polish, docs — commit directly to `main` (Build Standard v1.2.0 R1–R3) with informational CI verification.
- **Minor** (`x.Y.0`): new themes/features that don't break saves.
- **Major** (`X.0.0`): breaking changes (rename, relicense, storage schema) — deliberate, migrated.

## Definition of done (for any change)

1. `npm run check`, `npm run fuzz`, `npm run mutate`, `npm run typecheck`, `npm run lint`, and Lean 4 checks pass cleanly.
2. Docs and `CHECKSUMS.sha256` updated in the same change set when behavior or frozen artifacts change.
3. Push straight to `main` (informational CI verifies cross-platform, 6-kernel Lean, Tectonic PDF, and post-deploy Pages canary).
