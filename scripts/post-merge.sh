#!/bin/bash
# Post-merge setup: runs automatically after a task branch is merged.
# Idempotent, non-interactive, fail-fast.
set -e

npm install --no-audit --no-fund
