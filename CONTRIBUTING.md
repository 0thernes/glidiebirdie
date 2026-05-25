# Contributing

Thanks for helping improve Calm Edition.

This repo prefers small, readable changes that keep the game calm, accessible, and easy to run from a plain static host.

## Read First

Before making a non-trivial change, read:

1. `README.md`
2. `docs/architecture_master_blueprint.md`
3. `CLAUDE.md`

Those files explain the product boundaries, runtime structure, and guardrails that should stay intact.

## Project Principles

- Keep the game dependency-free.
- Keep the first screen playable.
- Preserve keyboard and screen-reader access.
- Respect reduced-motion preferences.
- Favor calm, readable, forgiving interactions over punishing ones.
- Keep documentation accurate when behavior changes.

## Before You Open A Pull Request

1. Run `npm run check`.
2. Open `index.html` or serve the repo locally.
3. Test keyboard controls.
4. Test the customizer drawer.
5. Test the mobile control bar if you touched input or layout.
6. If you changed PWA behavior, serve locally and verify the service worker registers.
7. Note any browser or accessibility checks you performed.

## Good Contributions

- Clear bug fixes.
- Theme and UI polish that improves readability.
- Accessibility improvements.
- Small gameplay tuning changes that stay true to the calm direction.
- Documentation updates that match the real runtime.
- Tests that protect existing behavior.

## Please Avoid

- Adding a build step.
- Adding external assets or runtime dependencies.
- Splitting `game.js` into modules.
- Making the default game more stressful.
- Removing accessibility behavior.
- Mixing unrelated changes into one pull request.

## Documentation Expectations

If your change affects how the project works, update the matching docs in the same pull request.

Examples:

- Public feature change -> update `README.md`
- Runtime or system change -> update `docs/architecture_master_blueprint.md`
- Contributor workflow change -> update `CONTRIBUTING.md`
- Assistant guidance change -> update `CLAUDE.md`

## Pull Request Style

Keep the description short and useful:

- What changed?
- Why does it help players?
- How did you test it?

Small, reviewed changes are easier to trust and easier to merge.

GitHub Actions runs the same `npm run check` workflow on pushes and pull requests.
