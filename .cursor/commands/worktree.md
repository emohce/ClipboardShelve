# worktree

Run task in a separate git worktree.

## Default layout

- Root: `~/work/czzWorktree` (override with `WORKTREE_BASE`).
- Path: `$WORKTREE_BASE/<repo basename>/<NAME>-<8hex>/<REPO_KEY>`  
  - `<repo basename>`: `basename "$(git rev-parse --show-toplevel)"` (project directory).
  - `<NAME>`: user argument to `/worktree` (task / behavior label).
  - `<8hex>`: random lowercase hex suffix (filesystem-safe unique id).
  - `<REPO_KEY>`: same as before (`<basename>-<sha12>` of repo root) for multi-repo chats.

## Optional argument

If the user wrote `/worktree branch=<git-ref>` or `/worktree <branch=<git-ref>>`, use that ref as `WORKTREE_START_REF` (any commit-ish Git accepts). Before the create block:

- Unix/macOS: `export WORKTREE_START_REF='<git-ref>'`
- Windows PowerShell: `$env:WORKTREE_START_REF = '<git-ref>'`

If omitted, default `HEAD`.

If the user wrote `/worktree` **without** a name, stop and ask for `<NAME>` (required for the folder segment).

## First touch for a repo in this chat

Run the create block once with shell `working_directory` set to that repo's workspace folder. Record `workspace folder -> REPO_ROOT -> WORKTREE_PATH`; use `WORKTREE_PATH` for all later reads, edits, shell, and repo-local git for that repo until the user says stop or uses `/apply-worktree` / `/delete-worktree`. Do not fall back to `REPO_ROOT` while that mapping exists.

Multi-root: one chat-wide mapping per `REPO_ROOT`; at most one worktree per `REPO_ROOT` unless the user asks for another.

## Create block (Unix/macOS)

Substitute `<NAME>` with the user-provided label (sanitize: alphanumeric, `-`, `_` only; replace other chars with `-`). Substitute `<SUFFIX>` with 8 random lowercase hex chars.

```bash
set -euo pipefail
WORKTREE_ID="<NAME>-<SUFFIX>"
REPO_ROOT="$(git rev-parse --show-toplevel)"
REPO_BASENAME="$(basename "$REPO_ROOT")"
if command -v shasum >/dev/null 2>&1; then
  REPO_HASH="$(printf '%s' "$REPO_ROOT" | shasum -a 256 | cut -c1-12)"
else
  REPO_HASH="$(printf '%s' "$REPO_ROOT" | sha256sum | cut -c1-12)"
fi
REPO_KEY="${REPO_BASENAME}-${REPO_HASH}"
WORKTREE_BASE="${WORKTREE_BASE:-$HOME/work/czzWorktree}"
WORKTREE_BASE="$(printf '%s' "$WORKTREE_BASE" | sed "s|^~/|$HOME/|")"
WORKTREE_SET_DIR="$WORKTREE_BASE/$REPO_BASENAME/$WORKTREE_ID"
WORKTREE_DIR="$WORKTREE_SET_DIR/$REPO_KEY"
mkdir -p "$WORKTREE_SET_DIR"
if [ -d "$WORKTREE_DIR" ]; then echo "ERROR: worktree directory already exists: $WORKTREE_DIR" >&2; exit 1; fi
WORKTREE_START_REF="${WORKTREE_START_REF:-HEAD}"
git worktree add --detach "$WORKTREE_DIR" "$WORKTREE_START_REF"
HEAD_COMMIT="$(git -C "$WORKTREE_DIR" rev-parse HEAD)"
echo "WORKTREE_ID=$WORKTREE_ID"
echo "REPO_KEY=$REPO_KEY"
echo "WORKTREE_BASE=$WORKTREE_BASE"
echo "WORKTREE_PATH=$WORKTREE_DIR"
echo "REPO_ROOT=$REPO_ROOT"
echo "HEAD_COMMIT=$HEAD_COMMIT"
echo "WORKTREE_START_REF=$WORKTREE_START_REF"
```

## Create block (Windows PowerShell)

Substitute `<NAME>` and `<SUFFIX>` as above.

```powershell
$ErrorActionPreference = 'Stop'
$Name = "<NAME>-<SUFFIX>"
$RepoRoot = (git rev-parse --show-toplevel).Trim()
$RepoBasename = Split-Path -Leaf $RepoRoot
$sha = [System.Security.Cryptography.SHA256]::Create()
$hashBytes = $sha.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($RepoRoot))
$RepoHash = -join ($hashBytes[0..5] | ForEach-Object { $_.ToString("x2") })
$RepoKey = "$RepoBasename-$RepoHash"
$WorktreeBase = if ($env:WORKTREE_BASE) { $env:WORKTREE_BASE.TrimEnd('\', '/') } else { Join-Path $env:USERPROFILE "work\czzWorktree" }
$WorktreeSetDir = Join-Path $WorktreeBase (Join-Path $RepoBasename $Name)
$WorktreeDir = Join-Path $WorktreeSetDir $RepoKey
if (-not (Test-Path $WorktreeSetDir)) { New-Item -ItemType Directory -Path $WorktreeSetDir -Force | Out-Null }
if (Test-Path $WorktreeDir) { Write-Error "ERROR: worktree directory already exists: $WorktreeDir"; exit 1 }
$WorktreeStartRef = if ($env:WORKTREE_START_REF) { $env:WORKTREE_START_REF } else { "HEAD" }
git worktree add --detach $WorktreeDir $WorktreeStartRef
$HeadCommit = (git -C $WorktreeDir rev-parse HEAD).Trim()
Write-Output "WORKTREE_ID=$Name"
Write-Output "REPO_KEY=$RepoKey"
Write-Output "WORKTREE_BASE=$WorktreeBase"
Write-Output "WORKTREE_PATH=$WorktreeDir"
Write-Output "REPO_ROOT=$RepoRoot"
Write-Output "HEAD_COMMIT=$HeadCommit"
Write-Output "WORKTREE_START_REF=$WorktreeStartRef"
```

## After create

Look for `.cursor/worktrees.json` in `REPO_ROOT`, then `WORKTREE_PATH`. If found, run setup once before other work. Prefer `setup-worktree-unix` / `setup-worktree-windows`; else `setup-worktree`. Resolve script paths relative to the config file's directory; execute setup with shell cwd = `WORKTREE_PATH` and `export ROOT_WORKTREE_PATH=<REPO_ROOT>`. No matching keys → skip setup.

Setup failure → stop and report. Do not switch branches or change the main working tree.

## End of command

Report `WORKTREE_ID`, `WORKTREE_BASE`, `WORKTREE_PATH`, `REPO_ROOT`, `HEAD_COMMIT`, `WORKTREE_START_REF`. Tell the user merge-back is `/apply-worktree` (per repo) and cleanup is `/delete-worktree`.
