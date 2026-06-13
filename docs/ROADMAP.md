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
  end
  subgraph DOING[🔧 In Progress]
    P1[Engine micro-optimizations]
  end
  subgraph NEXT[⏭ Deferred — decided]
    N3[Cache per-pipe gradient]
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
| Test/CI gates | static-checks, 29 engine assertions, smoke, typecheck, brand/license/link guards |
| DSA upgrades | pool free-list → O(1) spawn (PR #17); `lineAt` → O(log n) binary search (PR #14), both behavior-proven |
| Documentation suite | this `docs/` set + `ENGINEERING-JOURNEY.md` + README cross-links |
| A11y: `--text-3` contrast | Verified **~7:1** (above AA 4.5 and AAA 7) — no change needed |

### 🔧 In Progress

- Engine micro-optimizations (the other agents are actively tuning `game.js`).

### ⏭ Deferred — decided, with rationale

| Item | Type | Decision |
|---|---|---|
| Cache per-pipe gradient | Perf | **Deferred.** The gradient is position-dependent (`createLinearGradient` at the pipe's absolute x), so the object can't be trivially reused across pipes — a real fix is an offscreen pipe-sprite cache. With ~4 pipes on screen (~8 gradients/frame) the benefit is negligible and not worth the complexity/risk in the actively-edited engine file. |
| Merge queue | CI/CD | **Deferred.** Valuable for concurrent multi-agent merges, but adding it during the active churn risks stalling in-flight auto-merges, and `static-checks` already deterministically catches the collision class that actually occurred (duplicate keys/ids). Revisit when churn settles. |

### 🗂 Backlog (valuable, larger or orchestrator-side)

| # | Item | Notes |
|---|---|---|
| 1 | Property/fuzz tests | Random-input invariant testing over the engine |
| 2 | Visual-regression check | Screenshot diff — agents are "blind" to visual breakage |
| 3 | Activity ledger + daily digest | Needs the cron/daemon harness to participate |
| 4 | Budget / loop / oscillation governors | Orchestrator-side runaway protection |
| 5 | Non-admin bot identity | So the `guardrail-approved` label can't be self-applied (full enforcement) |
| 6 | Save export/import | "Copy my save" affordance |

## Release cadence

- **Patch** (`x.y.Z`): bug fixes, polish, docs — auto-merge once CI is green.
- **Minor** (`x.Y.0`): new themes/features that don't break saves.
- **Major** (`X.0.0`): breaking changes (rename, relicense, storage schema) — deliberate, migrated.

## Definition of done (for any change)

1. Branch → PR (never direct to `main`).
2. `npm run check` + typecheck + brand/license/link guards green.
3. Guardrail-path changes carry the human `guardrail-approved` label.
4. Docs updated in the same change set if behavior changed.
5. Auto-merge on green; post-deploy canary confirms the live site.
