# Releasing

Tags and GitHub Releases are cut by a person. Nothing in CI creates a tag.

## Steps

1. Update `CHANGELOG.md` and `package.json` `version`.
2. Set `CACHE_NAME` in `service-worker.js` to `glidiebirdie-v` plus that version. `tests/smoke-test.mjs` fails if they drift.
3. Merge the change to `main`.
4. On the commit you want to ship, create an annotated tag and push it:

```bash
git tag -a v3.1.0 -m "GlidieBirdie 3.1.0"
git push origin v3.1.0
```

5. `.github/workflows/release.yml` runs on tags matching `v*` and opens a GitHub Release with generated notes. It does not move the tag and it does not publish anywhere else.

Do not force-move a tag that already has a release. Cut the next version instead.
