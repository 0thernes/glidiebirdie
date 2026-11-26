# GlidieBirdie v3.2.0 — One-Word Task Runner (Build Standard A31, A36, B01)
set shell := ["bash", "-euo", "pipefail", "-c"]

default:
  @just --list

setup:
  npm ci

test:
  npm run check

mutate:
  npm run mutate

bench:
  npm run benchmark

lint:
  npm run lint

typecheck:
  npm run typecheck

browser:
  npm run test:browser

lean:
  cd lean && lake build && lake build Challenge && lake env lean VerifyAxioms.lean && lake env leanchecker --fresh Solution

paper:
  cd paper && tectonic -X compile main.tex --outdir build --keep-intermediates

reproduce:
  npm ci
  npm run check
  npm run mutate
  npm run benchmark
  npm run lint
  npm run typecheck
  cd lean && lake build && lake build Challenge && lake env lean VerifyAxioms.lean && lake env leanchecker --fresh Solution

audit:
  bash scripts/audit-repo.sh .

serve:
  node tools/static-server.mjs 8000

deploy:
  @echo "GlidieBirdie deploys directly as static files via .github/workflows/pages.yml on push to main."

rollback tag="v3.1.0":
  @echo "Staging rollback of runtime shell to tagged release {{tag}}..."
  git checkout "{{tag}}" -- index.html style.css game.js service-worker.js manifest.webmanifest src
  npm run check
  @echo "Rollback staged and verified. Review git diff before committing."
