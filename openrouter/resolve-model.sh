#!/usr/bin/env bash
# ── OpenRouter Model Resolver ─────────────────────────────────────────────────
# Reads config.json and resolves the configured model alias to a concrete
# usable model slug. Supports the generic "openrouter/free" alias.
# Usage:
#   ./resolve-model.sh                 # print resolved model slug
#   OPENROUTER_MODEL=my/model ./resolve-model.sh  # override via env
# ───────────────────────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/config.json"

# Default free alias → resolved to a concrete model
DEFAULT_FREE_MODEL="nvidia/nemotron-3-super-120b-a12b:free"

# 1. Read config (env override wins)
if [ -n "${OPENROUTER_MODEL:-}" ]; then
  CONFIG_MODEL="$OPENROUTER_MODEL"
elif [ -f "$CONFIG_FILE" ]; then
  CONFIG_MODEL="$(jq -r '.model // empty' "$CONFIG_FILE")"
else
  CONFIG_MODEL=""
fi

# 2. Default fallback
if [ -z "$CONFIG_MODEL" ]; then
  CONFIG_MODEL="openrouter/free"
fi

# 3. Resolve the alias
case "$CONFIG_MODEL" in
  openrouter/free)
    # Try to pick the most popular free model, fall back to a known-good one
    RESOLVED="$(
      curl -sg "https://openrouter.ai/api/v1/models" \
      | jq -r '.data[] |
          select(.pricing.prompt == "0" and .pricing.completion == "0" and .id != "openrouter/free") |
          [.id, (.featured // 0 | tonumber? // 0), .created] |
          @tsv' \
      | sort -k2,2nr -k3,3nr \
      | head -1 \
      | cut -f1
    )"
    echo "${RESOLVED:-$DEFAULT_FREE_MODEL}"
    ;;
  *)
    echo "$CONFIG_MODEL"
    ;;
esac