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

- `models(id, modality, pipeline_tag, likes, downloads, trending_score, tags, inference_providers, updated_at)` — PK `(id, modality)`
- `spaces(id, modality, title, sdk, likes, hardware, stage, host, models, updated_at)` — PK `(id, modality)`
- `sync_log(id, modality, type, count, synced_at)`

## Notes

- `inference_providers` stores live providers as `provider:providerId` (e.g. `hf-inference:microsoft/harrier-oss-v1-0.6b`).
- `hardware` values: `cpu-basic`, `zero-a10g` (free ZeroGPU), `t4-small`, etc.
- `stage` values: `RUNNING`, `SLEEPING`, `RUNTIME_ERROR`, etc.