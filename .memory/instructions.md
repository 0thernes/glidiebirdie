# Instructions

How Copilot should behave in this project.

## Before any code change

1. Read `.memory/security.md` first.
2. Read `.memory/decisions.md` for architectural constraints.
3. Read `.memory/preferences.md` for style rules.

## General behavior

- Keep changes minimal. One concern per edit.
- Prefer `replace_string_in_file` over `insert_edit_into_file`.
- Use `// ...existing code...` comments to skip unchanged regions.
- Never repeat existing code in edits.
- Test assumptions with `read_file` before editing.

## Game-specific rules

- All physics values must respect delta-time (`state.dt`).
- Audio must use the procedural `playTone()` API — no external files.
- Canvas rendering must respect `state.reducedMotion`.
- Screen reader announcements must use `announce()`.
- New features need ARIA attributes and keyboard shortcuts.
- The customizer drawer (`customizerDrawer`) must use `inert` when closed and trap focus when open.
- Theme changes must update `document.body.classList` and persist to `localStorage`.

## Security

- Never add credentials, tokens, or keys to any file.
- `.gitignore` is for git patterns only — never use it for notes.
- If you see secrets in any file, flag them immediately.
