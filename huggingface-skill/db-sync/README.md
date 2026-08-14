# HF Catalog DB Sync

Cronable script that syncs the best current Hugging Face models and functional Spaces into a local SQLite database, so you always have a local lookup for the best inference endpoint per use case.

## Requirements

- Node.js 18+
- `sqlite3` CLI (system package)
- `HF_API_KEY` in `../.env` or environment

## Setup

```bash
cd huggingface-skill/db-sync
# Ensure HF_API_KEY is set (in ../.env or env)
```

No npm dependencies — uses Node built-ins + system `sqlite3`.

## Sync

```bash
node sync-db.js
# or
npm run sync
```

This fetches, for each of 20 modalities (text-to-speech, speech-to-text, text-to-image, text-embedding, etc.):
- **Top 20 models** by trending score (with live inference providers)
- **Top 20 Spaces** by likes (with hardware, stage, host)

Writes to `hf_catalog.db` (override with `HF_DB_PATH`).

## Query

```bash
node query-db.js modalities
node query-db.js best-models text-to-speech
node query-db.js best-spaces text-to-speech
node query-db.js zero-gpu text-to-speech
node query-db.js providers text-embedding
node query-db.js search whisper
node query-db.js recent
```

## API Server

Expose the DB as a JSON REST API for the frontend:

```bash
node server.js
# or
npm run server
# Custom port / DB:
PORT=9000 HF_DB_PATH=/path/to/hf_catalog.db node server.js
```

Endpoints (all GET, CORS-enabled):

| Endpoint | Description |
|----------|-------------|
| `/api/health` | Health check |
| `/api/modalities` | All synced modalities with model/space counts |
| `/api/models?modality=X&sort=trending&limit=50&search=...` | List models |
| `/api/spaces?modality=X&limit=50&search=...&zero-gpu=true` | List spaces |
| `/api/search?q=whisper&limit=20` | Search models by keyword |
| `/api/recent` | Recent sync log |
| `/api/changes?modality=X` | Recent sync changes (added/updated/moved_up/moved_down/dropped) |
| `/api/model/:id?modality=X` | Latest data for a model |
| `/api/model/:id/history?modality=X` | Historical snapshots for a model |
| `/api/space/:id?modality=X` | Latest data for a space |
| `/api/space/:id/history?modality=X` | Historical snapshots for a space |
| `/api/stats` | Per-modality counts and last sync times |

The frontend catalog page (`catalog.html` at the repo root) consumes this API. It defaults to `http://localhost:8787`; override with `localStorage.setItem('hfCatalogApiBase', 'http://host:port')`.

## Frontend Pages

- **`catalog.html`** — Explorer listing models, spaces, sync changes, and recent syncs. Model/space IDs link to the detail page.
- **`detail.html?type=model|space&id=...&modality=...`** — Detail page for a single model/space showing:
  - **Latest Data** — current values for all fields
  - **History** — snapshots from previous syncs (from `model_history` / `space_history`)
  - **Diff View** — compare two historical snapshots side-by-side, highlighting changed fields

## Sync Change Tracking & Ranking

Each sync now records per-entity changes so you can see how models/spaces move in the rankings over time:

- **New columns** on `models` and `spaces`: `created_at`, `library_name` (models), `model_id` (spaces), `rank`, `prev_rank`, `status` (`active`/`dropped`).
- **`sync_changes` table** logs every change per sync: `added`, `updated`, `moved_up`, `moved_down`, `dropped` — with `rank` and `prev_rank` to show movement.
- **`model_history` / `space_history` tables** store a full snapshot of each entity per sync, enabling the detail page's history and diff views.
- If a model/space was in the previous sync for a modality but is no longer present, it is marked `status='dropped'` and logged as `dropped`.

Query changes:

```bash
node query-db.js changes              # all recent changes
node query-db.js changes text-to-speech  # changes for a modality
```

## Cron

Run daily:

```cron
# Daily at 3am
0 3 * * * cd /home/bruno/code2k24/audio-copy/huggingface-skill/db-sync && HF_API_KEY=$(cat ../.env | grep HF_API_KEY | cut -d= -f2) node sync-db.js >> sync.log 2>&1
```

Or use the `hf` CLI token directly:

```cron
0 3 * * * cd /home/bruno/code2k24/audio-copy/huggingface-skill/db-sync && HF_API_KEY=$(hf auth token 2>/dev/null | tail -1) node sync-db.js >> sync.log 2>&1
```

## DB Schema

- `models(id, modality, pipeline_tag, likes, downloads, trending_score, tags, inference_providers, created_at, library_name, rank, prev_rank, status, updated_at)` — PK `(id, modality)`
- `spaces(id, modality, title, sdk, likes, hardware, stage, host, models, model_id, rank, prev_rank, status, updated_at)` — PK `(id, modality)`
- `sync_log(id, modality, type, count, synced_at)`
- `sync_changes(id, modality, type, entity_id, change, rank, prev_rank, synced_at)`
- `model_history(id, modality, synced_at, pipeline_tag, likes, downloads, trending_score, tags, inference_providers, created_at, library_name, rank, status)` — PK `(id, modality, synced_at)`
- `space_history(id, modality, synced_at, title, sdk, likes, hardware, stage, host, models, model_id, rank, status)` — PK `(id, modality, synced_at)`

## Notes

- `inference_providers` stores live providers as `provider:providerId` (e.g. `hf-inference:microsoft/harrier-oss-v1-0.6b`).
- `hardware` values: `cpu-basic`, `zero-a10g` (free ZeroGPU), `t4-small`, etc.
- `stage` values: `RUNNING`, `SLEEPING`, `RUNTIME_ERROR`, etc.
