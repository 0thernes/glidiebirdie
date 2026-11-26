#!/usr/bin/env bash
# Live Negative Lean 4 Kernel Tamper Test
# 1. Verifies `lake` is present and runs an untampered control check (must PASS).
# 2. Copies lean/ into a temporary directory, injects `sorry` into a proved theorem,
#    and verifies that `lake comparator --config comparator.json --paranoid` REJECTS
#    the tampered solution with explicit proof-rejection evidence (not tool/env failure).
set -euo pipefail

if ! command -v lake >/dev/null 2>&1; then
  echo "ERROR: 'lake' binary not found on PATH; cannot run negative kernel test." >&2
  exit 1
fi

TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

cp -r lean "$TMPDIR/lean"
cd "$TMPDIR/lean"

# Step 1: Untampered control check MUST pass first (rules out environment/bwrap errors)
lake comparator --config comparator.json --paranoid >/tmp/control-kernel.log 2>&1 || {
  echo "ERROR: untampered control comparator run failed!" >&2
  cat /tmp/control-kernel.log >&2
  exit 1
}

# Step 2: Inject an explicit sorry into a proved theorem (M-kernel tamper)
sed -i 's/decide/sorry/' GlidieBirdieProofs/TimestepGrid.lean

set +e
lake comparator --config comparator.json --paranoid >/tmp/neg-kernel.log 2>&1
RC=$?
set -e

if [ "$RC" -eq 0 ]; then
  echo "CRITICAL FAILURE: lake comparator accepted a tampered sorry-backed solution!" >&2
  cat /tmp/neg-kernel.log >&2
  exit 1
fi

if ! grep -Eqi "sorry|axiom|disallowed|not allowed|failed|mismatch|error" /tmp/neg-kernel.log; then
  echo "ERROR: tampered run exited $RC without expected proof-rejection diagnostics:" >&2
  cat /tmp/neg-kernel.log >&2
  exit 1
fi

echo "PASS: untampered control accepted; live negative kernel tamper test rejected sorry-backed solution (exit code $RC)."
