#!/usr/bin/env bash
# Usage:
#   ./build.sh
#
# Behavior:
#   1. Load nvm from common install locations
#   2. Switch to Node.js 24 with `nvm use 24`
#   3. Run production build with `pnpm run build` (output: dist/)
#
# Note:
#   Run `pnpm install` once if node_modules is missing.
#   Do not invoke through `pnpm run ...` in a fresh terminal without Node/pnpm.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"

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
echo "Working directory: $(pwd)"
nvm use 24
pnpm run build
