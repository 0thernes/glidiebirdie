#!/usr/bin/env bash
# Live Negative Lean 4 Kernel Tamper Test
# Copies lean/ into a temporary directory, injects `sorry` into a Solution proof,
# and verifies that `lake comparator --config comparator.json --paranoid` REJECTS
# the tampered solution with a non-zero exit code (proving the 6-kernel gate is non-vacuous).
set -euo pipefail

TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

cp -r lean "$TMPDIR/lean"
cd "$TMPDIR/lean"

# Inject an explicit sorry into a proved theorem (M-kernel tamper)
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

echo "PASS: live negative kernel tamper test rejected sorry-backed solution (exit code $RC)."
