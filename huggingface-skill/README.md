# Hugging Face Skill

Self-contained CLI for searching Hugging Face models/spaces, listing inference endpoints, running zero-inference calls, and performing semantic search via an Inference Endpoint.

## Setup

```bash
cd huggingface-skill
cp .env.example .env
# Edit .env with your HF_API_KEY and HF_ENDPOINT_URL
```

No external dependencies required — the CLI uses Node.js built-ins only.

## CLI Usage

From the `huggingface-skill` folder:

```bash
node cli/index.js <command> [args]
```

Or via npm scripts:

```bash
npm run <command> -- [args]
```

## Commands & Examples

### Search Models

Find models by keyword:

```bash
node cli/index.js search-models "sentence transformer"
node cli/index.js search-models "text-to-speech"
node cli/index.js search-models "whisper"
node cli/index.js search-models "llama"
```

### Search Spaces

Find Spaces (apps/demos) by keyword:

```bash
node cli/index.js search-spaces "text-to-image"
node cli/index.js search-spaces "text-to-speech"
node cli/index.js search-spaces "chatbot"
node cli/index.js search-spaces "image generation"
```

### Model Details

Get full metadata for a specific model:

```bash
node cli/index.js model-details sentence-transformers/all-MiniLM-L6-v2
node cli/index.js model-details hexgrad/Kokoro-82M
node cli/index.js model-details openai/whisper-large-v3
```

### List Inference Endpoints

List your deployed Inference Endpoints (requires token with `inference-endpoints:read` scope):

```bash
node cli/index.js list-endpoints
```

### Embed Text

Generate embeddings via your Inference Endpoint (requires `HF_ENDPOINT_URL`):

```bash
node cli/index.js embed "Hello world"
node cli/index.js embed "This is a sentence to embed"
```

### Discover Resources

Semantic search over the Hub catalog (models, Spaces, skills, MCP servers):

```bash
node cli/index.js discover "Fine tune a language model"
node cli/index.js discover "Generate an image"
node cli/index.js discover "Text to speech for podcast"
```

### Semantic Search

Rank documents by similarity to a query (requires `HF_ENDPOINT_URL`):

```bash
node cli/index.js semantic-search "AI podcast" --documents "First doc" "Second doc" "Third doc"
node cli/index.js semantic-search "machine learning" --documents "Neural networks" "Cooking recipes" "Deep learning"
```

## Environment Variables

- `HF_API_KEY` — required for all commands
- `HF_ENDPOINT_URL` — required for `embed` and `semantic-search`

## Docs

- `docs/tts-zero-gpu-endpoints.md` — Best free ZeroGPU TTS inference endpoints (researched via `hf` CLI).
- `docs/endpoint-findings.md` — REST API quirks, free providers, and best endpoints per use case.
- `docs/mcp-skills-inference.md` — MCP server setup, Skills registry, and Inference Endpoint deployment.

## Local DB Sync (cronable)

`db-sync/` contains a cronable script that syncs the best current HF models and functional Spaces into a local SQLite DB for offline lookup.

```bash
cd db-sync
node sync-db.js   # sync (cronable)
node query-db.js best-spaces text-to-speech   # query
```

See `db-sync/README.md` for full usage and cron setup.

## Integration

The browser client in the parent app (`src/huggingface.js`) uses the same endpoints for web UI features. This CLI is for quick testing and debugging.



## Sync Data & Change Tracking (implemented)

When syncing, the following fields are saved for each entity:

- **Models**: `likes`, `trendingScore` (as `trending_score`), `downloads`, all `tags`, `createdAt` (as `created_at`), `library_name`, `inference_providers`.
- **Spaces**: `likes`, `title`, `sdk`, `hardware`, `stage`, `host`, `models`, `modelId` (as `model_id`).

Each sync logs per-entity changes in the `sync_changes` table so you can see how models/spaces move in the rankings over time:

- `added` — new entity in the top ranking
- `updated` — same rank, refreshed data
- `moved_up` / `moved_down` — rank changed (with `prev_rank` → `rank`)
- `dropped` — was in the previous sync for a modality but no longer present (marked `status='dropped'`)

Entities are versioned with `rank`, `prev_rank`, and `status` columns. See `db-sync/README.md` for the API endpoints and query commands.

> Tip: To see how to call a Space via its API, query the Space's `/gradio_api/info` endpoint for a client-code example, e.g. `https://qwen-qwen3-tts.hf.space/gradio_api/info`.

