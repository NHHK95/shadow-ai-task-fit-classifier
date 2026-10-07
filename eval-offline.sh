#!/usr/bin/env bash
# Runs every evaluation that needs NO live model, and saves the combined output.
# Usage (from the project root):  bash scripts/eval-offline.sh
set -u
# Always run from the project root, wherever this script is launched from.
cd "$(dirname "$0")/.." || exit 1
mkdir -p eval-results
OUT=eval-results/offline-output.txt
{
  echo "### node version: $(node -v)   date: $(date -u +%FT%TZ)"
  echo; echo "########## 1. TESTS + COVERAGE (black-box and white-box) ##########"
  node --test --test-timeout=120000 --test-reporter=spec --experimental-test-coverage test/evaluation.test.js 2>&1
  echo; echo "########## 2. SIMULATION + VALIDATOR ACCURACY + PROMPT BUDGET ##########"
  node scripts/eval-simulation.js
  echo; echo "########## 3. STATIC ANALYSIS ##########"
  node --expose-internals scripts/eval-static.js 2>&1
  echo; echo "########## 4. EXISTING SCRIPTS (regression) ##########"
  node scripts/verify-priya.js 2>&1 | tail -3
  node scripts/verify-guardrail-logic.js 2>&1 | tail -3
  node scripts/verify-guardrail-service.js 2>&1 | tail -3
} 2>&1 | tee "$OUT"
echo; echo "Saved to $OUT"
