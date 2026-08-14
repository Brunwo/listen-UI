#!/usr/bin/env bash
# ── OpenRouter Free Models ─────────────────────────────────────────────────────
# Lists all currently free models on OpenRouter.
# Usage:
#   ./openrouter-models.sh              # list all free model slugs
#   ./openrouter-models.sh --top        # list top 10 free models by popularity
#   ./openrouter-models.sh --check <id> # check if a specific model is free
# ───────────────────────────────────────────────────────────────────────────────

set -euo pipefail

API_URL="https://openrouter.ai/api/v1/models"

# Fetch and filter free models (pricing.prompt == "0" and pricing.completion == "0")
free_models() {
  curl -sg "$API_URL" | jq -r '.data[] | select(.pricing.prompt == "0" and .pricing.completion == "0") | .id'
}

case "${1:-}" in
  --top)
    free_models | head -10
    ;;
  --check)
    if [ -z "${2:-}" ]; then
      echo "Usage: $0 --check <model-id>" >&2
      exit 1
    fi
    if free_models | grep -qx "$2"; then
      echo "✓ $2 is a free model"
      exit 0
    else
      echo "✗ $2 is NOT a free model" >&2
      exit 1
    fi
    ;;
  *)
    free_models
    ;;
esac