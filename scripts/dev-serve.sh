#!/usr/bin/env bash
# Usage:
#   ./scripts/dev-serve.sh
#
# Behavior:
#   1. Load nvm from common install locations
#   2. Switch to Node.js 24 with `nvm use 24`
#   3. Start the Vue dev server with `pnpm run serve`
#
# Note:
#   Do not invoke this through `pnpm run ...` in a fresh terminal.
#   This script exists specifically for shells that have not loaded Node.js/pnpm yet.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

load_nvm() {
  if command -v nvm >/dev/null 2>&1; then
    return 0
  fi

  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"

  if [ -s "$NVM_DIR/nvm.sh" ]; then
    # shellcheck source=/dev/null
    . "$NVM_DIR/nvm.sh"
    return 0
  fi

  if [ -s "/opt/homebrew/opt/nvm/nvm.sh" ]; then
    # shellcheck source=/dev/null
    . "/opt/homebrew/opt/nvm/nvm.sh"
    return 0
  fi

  echo "Error: nvm is not available. Install nvm or set NVM_DIR correctly." >&2
  exit 1
}

load_nvm

cd "$ROOT_DIR"
nvm use 24
pnpm run serve
