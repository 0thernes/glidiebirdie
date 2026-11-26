# Operations, Backups, Offsite Mirroring & Rollback (`docs/operations.md`)

## 1. Deployment & Rollback (GitHub Pages)

- **Live production URL:** `https://0thernes.github.io/glidiebirdie/`
- **Automated deploy:** `.github/workflows/pages.yml` packages the static browser shell and deploys via `actions/deploy-pages` on push to `main`.
- **Post-deploy health verification:** `.github/workflows/post-deploy-canary.yml` probes `index.html`, `game.js`, `src/main.js`, `style.css`, and `manifest.webmanifest` for HTTP `200` (with `--connect-timeout 10 --max-time 15`) and opens an alert issue on failure.
- **One-command rollback & live deployment recovery:**

  ```bash
  # 1. Stage browser runtime rollback to a prior tag, refresh CHECKSUMS.sha256, and run check/fuzz/mutate
  just rollback v3.1.0

  # 2. Review staged diff, commit, and push to main (all modified files including CHECKSUMS.sha256 are staged)
  git status
  git commit -m "revert: rollback browser runtime shell to v3.1.0"
  SHA="$(git rev-parse HEAD)"
  git push origin main

  # 3. Wait for the Pages & canary workflows tied specifically to $SHA, then inspect the served shell
  gh run list --workflow pages.yml --commit "$SHA" --limit 1
  gh run list --workflow post-deploy-canary.yml --commit "$SHA" --limit 1
  curl -sf https://0thernes.github.io/glidiebirdie/service-worker.js | grep -E "CACHE_NAME"
  ```

  `just rollback` restores the browser runtime (`index.html`, `style.css`, `game.js`, `manifest.webmanifest`, `src/`) from the target tag while preserving `v3.2.0`'s `package.json`, `VERSION`, `service-worker.js` cache lock, and CI script interface (`check`/`fuzz`/`mutate`), refreshes and stages `CHECKSUMS.sha256`, and validates the full local test suite before committing and pushing to trigger `.github/workflows/pages.yml`. For a complete repository-wide rollback of a single bad merge commit, use `git revert <commit-sha>`.

## 2. Observability Basics (Local Static Server & Browser Runtime)

- **Local HTTP health probe:** `GET http://127.0.0.1:8000/healthz` returns HTTP `200` with `{"status":"ok","service":"glidiebirdie-static","port":8000}` and `Cache-Control: no-store`.
- **Browser error rate-limiting:** `src/loop.js` catches render exceptions, logs structured `[GlidieBirdie] Frame error:` lines, and enters a monotonic 3-second cooldown after `CONFIG.FRAME_ERROR_BURST_LIMIT` (8) consecutive errors so a broken browser canvas never spins the console.

## 3. Data Persistence, Backups & Offsite Repo Mirror

- **Player data (`gb:*` schema `3`):** Stored strictly in browser `localStorage`; legacy v2 saves migrate automatically once via `migrateLegacyStorage()` (`src/storage.js`). Users can clear stats via the Customizer drawer (`Reset Stats`).
- **Offsite repository mirror & cryptographic bundle backup:**

  ```bash
  # Create a self-contained single-file git bundle for offline / offsite backup
  git bundle create ../glidiebirdie-v3.2.0.bundle --all
  git bundle verify ../glidiebirdie-v3.2.0.bundle
  sha256sum ../glidiebirdie-v3.2.0.bundle > ../glidiebirdie-v3.2.0.bundle.sha256

  # Offsite third-party archival snapshot (Software Heritage)
  curl -X POST https://archive.softwareheritage.org/api/1/origin/save/git/url/https://github.com/0thernes/glidiebirdie/
  ```

- **Restore verification:** `git clone ../glidiebirdie-v3.2.0.bundle restore-check && cd restore-check && npm ci && npm run check`.
