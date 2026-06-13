# GlidieBirdie — Documentation

Engineering documentation for a solo-built, zero-dependency, GitHub-Pages browser game.

| Document | What it covers |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | System + engine structure, frame loop, rendering, audio, boot, invariants, extension points (with diagrams). |
| [architecture_master_blueprint.md](architecture_master_blueprint.md) | Narrative runtime walkthrough for maintainers. |
| [DATA-MODEL.md](DATA-MODEL.md) | ERM/ERD of the `gb:` localStorage layer, physical key schema, legacy→current migration, runtime state. |
| [COMPLEXITY.md](COMPLEXITY.md) | Time/space complexity (Big-O) of every subsystem + concrete DSA upgrades. |
| [INSPECTION-500.md](INSPECTION-500.md) | The 500-point inspection (25 sections × 20), scored, with the consolidated improvement list. |
| [ROADMAP.md](ROADMAP.md) | Kanban board (Done / In Progress / Next / Backlog) + release cadence + definition of done. |
| [../AUDIT-250.md](../AUDIT-250.md) | Historical 250-point audit ledger. |

## Quick orientation

- **Want to play or build?** See the top-level [README](../README.md).
- **Contributing (human or agent)?** See [CONTRIBUTING](../CONTRIBUTING.md) and [AGENTS.md](../AGENTS.md) — every change flows branch → PR → CI → auto-merge.
- **Security?** See [SECURITY.md](../.github/SECURITY.md).

All documents are calibrated to the project's real scope: a calm, accessible, dependency-free arcade game,
professionally engineered to withstand academic, investor, researcher, or engineering scrutiny.
