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
  end
  subgraph DOING[🔧 In Progress]
    P1[Engine micro-optimizations]
    P2[Docs cross-linking]
  end
  subgraph NEXT[⏭ Next]
    N1[Pool free-list O(1) spawn]
    N2[lineAt offsets + binary search]
    N3[Cache per-pipe gradient]
    N4[Merge queue]
    N5[Verify --text-3 contrast]
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
| Test/CI gates | static-checks, 23 engine assertions, smoke, typecheck, brand/license/link guards |
| Documentation suite | this `docs/` set |

### 🔧 In Progress

- Engine micro-optimizations (the other agents are actively tuning `game.js`).
- Cross-linking the docs from the README Repository Map.

### ⏭ Next (highest leverage, low risk)

| # | Item | Type | Why |
|---|---|---|---|
| 1 | Pool free-list → O(1) spawn | DSA | Removes the only worst-case probe; see `COMPLEXITY.md §5.1` |
| 2 | `lineAt` → binary search | DSA | Removes the only super-linear tooling pattern; `COMPLEXITY.md §5.2` |
| 3 | Cache per-pipe gradient | Perf | Fewer allocations / lower GC pressure |
| 4 | Merge queue | CI/CD | Serialize concurrent agent merges (collision-proof) |
| 5 | Verify `--text-3` contrast ≥ 4.5:1 | A11y | Close the last AA question |

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
