# Copilot Instructions

Use this file as the fast-start guide for repository context.

Read these files before making a substantial change:

1. `README.md`
2. `docs/architecture_master_blueprint.md`
3. `CONTRIBUTING.md`
4. `CLAUDE.md`

<!-- hacklm-memory:start -->
## Memory-Augmented Context

Read memory files on demand, not all at once.

| File | When to read |
| --- | --- |
| [.memory/instructions.md](.memory/instructions.md) | Behavior rules and working style |
| [.memory/quirks.md](.memory/quirks.md) | Repo-specific surprises and breakage patterns |
| [.memory/preferences.md](.memory/preferences.md) | Naming, style, and design choices |
| [.memory/decisions.md](.memory/decisions.md) | Architecture commitments and tradeoffs |
| [.memory/security.md](.memory/security.md) | Always read before changing storage, network, or DOM injection behavior |

## Memory Tools

Call `queryMemory` before answering questions about architecture, conventions, or style.

Call `storeMemory` with a kebab-case `slug` when:

1. The user states a new preference or rule.
2. The user corrects a prior assumption.
3. A command or build fails and the root cause becomes clear.
4. You finish an implementation that introduces a new convention or architectural choice.

If the slug already exists, update it instead of creating a duplicate.

## Writing Style For Memory Entries

Keep entries short, direct, and specific.

- Prefer blunt summaries over abstract language.
- Record the concrete rule, failure mode, or decision.
- Avoid filler and repeated context from the README.

## Categories

| Category | Use for |
| --- | --- |
| Instruction | How the assistant should behave |
| Quirk | Repo-specific weirdness |
| Preference | Style, naming, or design choices |
| Decision | Architecture commitments |
| Security | Rules that must not be broken |
<!-- hacklm-memory:end -->
