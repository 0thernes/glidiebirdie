# Contributing

Thanks for helping make Calm Edition better. This project values small, focused,
player-friendly changes.

## Project Principles

- Keep the game dependency-free.
- Keep the first screen playable.
- Preserve keyboard and screen-reader access.
- Respect reduced-motion preferences.
- Favor calm, readable, forgiving interactions over punishing ones.
- Keep documentation clear enough for a first-time visitor.

## Before You Open A Pull Request

1. Run `npm run check`.
2. Open `index.html` or serve the repo locally.
3. Test keyboard controls.
4. Test the customizer drawer.
5. If you changed PWA behavior, serve locally and verify the service worker registers.
6. Note any browser or accessibility checks you performed.

## Good Contributions

- Clear bug fixes.
- Theme and UI polish that improves readability.
- Accessibility improvements.
- Documentation improvements.
- Tests that protect existing behavior.

## Please Avoid

- Adding a build step.
- Adding external assets or runtime dependencies.
- Making the game more stressful by default.
- Removing accessibility behavior.
- Mixing unrelated changes into one pull request.

## Pull Request Style

Keep the description short and useful:

- What changed?
- Why does it help players?
- How did you test it?

Small, reviewed changes are easier to trust and easier to merge.

GitHub Actions runs the same `npm run check` smoke test on pushes and pull requests.
