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
  @echo "Staging coherent rollback snapshot to tagged release {{tag}}..."
  git checkout "{{tag}}" -- index.html style.css game.js service-worker.js manifest.webmanifest src package.json package-lock.json
  printf '%s\n' "{{tag}}" | sed 's/^v//' > VERSION
  @echo "Verifying rolled-back shell syntax and core engine tests..."
  node --check game.js && node --check service-worker.js && node tests/engine-test.mjs && node tests/determinism.mjs
  @echo "Coherent rollback staged. Update CITATION.cff if needed, commit, push to main, and verify GitHub Pages + canary."
