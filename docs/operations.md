# Operations, Backups, Offsite Mirroring & Rollback (`docs/operations.md`)

## 1. Deployment & Rollback (GitHub Pages)

- **Live production URL:** `https://0thernes.github.io/glidiebirdie/`
- **Automated deploy:** `.github/workflows/pages.yml` packages the static browser shell and deploys via `actions/deploy-pages` on push to `main`.
- **Post-deploy health verification:** `.github/workflows/post-deploy-canary.yml` probes `index.html`, `game.js`, `src/main.js`, `style.css`, and `manifest.webmanifest` for HTTP `200` (with `--connect-timeout 10 --max-time 15`) and opens an alert issue on failure.
- **One-command rollback & live deployment recovery:**

  ```bash
  # 1. Stage a coherent tagged snapshot (runtime shell + package manifests + VERSION) and verify
  just rollback v3.1.0

  # 2. Review diff (reconcile CITATION.cff if reverting across versions), commit, and push to main
  git status
  git commit -m "revert: rollback browser runtime shell to v3.1.0"
  git push origin main

  # 3. Verify live GitHub Pages deployment and post-deploy canary
  gh run list --workflow pages.yml --limit 1
  gh run list --workflow post-deploy-canary.yml --limit 1
  curl -sfI https://0thernes.github.io/glidiebirdie/ | head -n 5
  ```

  `just rollback` checks out a coherent release snapshot (`index.html`, `style.css`, `game.js`, `service-worker.js`, `manifest.webmanifest`, `src/`, `package.json`, `package-lock.json`, and `VERSION`) so `service-worker.js` `CACHE_NAME` stays consistent with `package.json` and `VERSION`, then runs syntax, engine, and determinism verification before you commit and push to trigger `.github/workflows/pages.yml`.

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
