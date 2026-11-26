# GlidieBirdie v3.2.0 — One-Word Task Runner (Build Standard A31, A36, B01)
set shell := ["bash", "-euo", "pipefail", "-c"]

default:
  @just --list

setup:
  npm ci

test:
  npm run check

fuzz:
  npm run fuzz

mutate:
  npm run mutate

bench:
  npm run benchmark

citations:
  npm run check:citations

lint:
  npm run lint

typecheck:
  npm run typecheck

browser:
  npm run test:browser

lean:
  (cd lean && lake build && lake build Challenge && lake env lean VerifyAxioms.lean && lake env leanchecker --fresh Solution && lake env leanchecker-paranoid --fresh Solution)

paper:
  mkdir -p paper/build
  (cd paper && tectonic -X compile main.tex --outdir build --keep-intermediates)

reproduce:
  npm ci
  npm run check
  npm run fuzz
  npm run mutate
  npm run benchmark
  npm run lint
  npm run typecheck
  (cd lean && lake build && lake build Challenge && lake env lean VerifyAxioms.lean && lake env leanchecker --fresh Solution)

audit:
  bash scripts/audit-repo.sh .

serve:
  node tools/static-server.mjs

deploy:
  @echo "GlidieBirdie deploys directly as static files via .github/workflows/pages.yml on push to main."

rollback tag="v3.1.0":
  @echo "Staging browser runtime rollback to tagged release {{tag}} while preserving v3.2.0 CI/verification interface..."
  git checkout "{{tag}}" -- index.html style.css game.js manifest.webmanifest src
  @echo "Regenerating CHECKSUMS.sha256 for the rolled-back browser shell..."
  node -e "import('node:fs').then(async fs => { const { createHash } = await import('node:crypto'); const lines = fs.readFileSync('CHECKSUMS.sha256','utf8').trim().split(/\r?\n/); const out = lines.map(l => { const rel = l.split('  ')[1]; const h = createHash('sha256').update(fs.readFileSync(rel)).digest('hex'); return h + '  ' + rel; }); fs.writeFileSync('CHECKSUMS.sha256', out.join('\n') + '\n'); });"
  git add index.html style.css game.js manifest.webmanifest src CHECKSUMS.sha256
  npm run check && npm run fuzz && npm run mutate
  @echo "Rollback staged, checksummed, and verified across check/fuzz/mutate. Review git diff, commit, push to main, and verify Pages + canary."
