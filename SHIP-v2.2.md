# How to Ship v2.2.0 Parallel Elevation (from this workspace or a clean clone)

The beautiful changes are **already applied** in the filesystem here:
- New hero + social images in docs/assets/
- README, game.js (crest + header), package.json, CHANGELOG, index.html, smoke test all updated for 2.2.0
- `npm run check` passes

Git commands inside this agent shell are currently unreliable because of the crazy "(TEST TEST TEST 123 DEMO)" path.

## Recommended: Run this in your normal terminal (best results)

```bash
# 1. Go to a clean clone of the real repo (recommended)
cd /path/to/your/clean/flappy-bird-calm-edition

# 2. Create the release branch
git checkout -b v2.2-parallel-elevation

# 3. If you are in the test workspace and want to copy the beautiful files over:
#    (only needed if your clean clone is behind)
# cp -r "Z:\Orca\Workspaces\flappy-bird-game (TEST TEST TEST 123 DEMO)\Vibe-Coding-AI-Playground\docs\assets\hero-calm-meadow.jpg" docs/assets/
# cp -r "Z:\Orca\Workspaces\flappy-bird-game (TEST TEST TEST 123 DEMO)\Vibe-Coding-AI-Playground\docs\assets\social-preview-calm.jpg" docs/assets/
# cp "Z:\Orca\Workspaces\flappy-bird-game (TEST TEST TEST 123 DEMO)\Vibe-Coding-AI-Playground\README.md" .
# cp "Z:\Orca\Workspaces\flappy-bird-game (TEST TEST TEST 123 DEMO)\Vibe-Coding-AI-Playground\game.js" .
# ... etc for the other text files

# 4. Stage exactly the elevation work
git add docs/assets/hero-calm-meadow.jpg
git add docs/assets/social-preview-calm.jpg
git add README.md game.js package.json CHANGELOG.md index.html tests/smoke-test.mjs

# 5. Commit with the beautiful message
git commit -F SHIP-v2.2.md   # or paste the message below

# 6. Push and open PR (requires GitHub CLI `gh` or do it in the web UI)
git push -u origin v2.2-parallel-elevation

# Then create the PR (either via web or):
gh pr create \
  --title "v2.2.0 — Parallel Elevation (12-Build Superman Drop)" \
  --body-file docs/assets/pr-body-v2.2.md \
  --base main
```

## Commit message (ready to use)

```
chore(release): v2.2.0 Parallel Elevation — 12-build Superman polish

- Cinematic new hero banner + social preview card (docs/assets)
- Expressive bird crest for more character warmth (all themes/emotions)
- README elevated with LFG energy + new visuals as top hero
- Version + changelog + OG meta synced to 2.2.0
- Smoke checks green

Forged across 12 parallel Grok 4.3 builds. Calm core 100% preserved.
LFG.
```

After merge, the live GitHub Pages site will automatically pick up the new assets and README.

You now have a much more beautiful repo and a slightly more delightful game.

Ship it when ready. The hard work is already done.
