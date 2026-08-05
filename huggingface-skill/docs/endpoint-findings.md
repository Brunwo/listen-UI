# Hugging Face Endpoint Exploration Findings

Research date: 2026-08-05
Method: `hf` CLI + REST API exploration + local SQLite sync.

## Key Findings

### 1. Free inference providers
- The `hf-inference` free provider serves **text-embedding**, **text-classification**, **summarization**, and other non-TTS tasks.
- The `hf-inference` provider does **NOT** serve TTS models.
- TTS models with live third-party providers (paid): `hexgrad/Kokoro-82M` → `fal-ai`, `ResembleAI/chatterbox` → `fal-ai`.

### 2. Free ZeroGPU Spaces
- All top TTS Spaces run on **free `zero-a10g`** hardware (shared A10G pool).
- Free CPU Spaces (`cpu-basic`) also exist for lightweight TTS (e.g., Edge-TTS).
- ZeroGPU quota is per-user and resets periodically; Spaces sleep after 48h inactivity.

### 3. REST API quirks (important for automation)
- `GET /api/models?expand=inferenceProviderMapping` **replaces** the response with only `{id, inferenceProviderMapping, trendingScore}` — you must make **two calls** and merge by id.
- `GET /api/spaces?expand=runtime` similarly **replaces** the response with only `{id, runtime, trendingScore}` — two calls needed.
- The REST API uses **camelCase** field names: `providerId` (not `provider_id`), `inferenceProviderMapping` (not `inference_provider_mapping`).
- The `hf` CLI uses **snake_case** field names: `provider_id`, `inference_provider_mapping`.
- `runtime.hardware` in the expand response is an **object** `{current, requested}`, not a string.

### 4. Best free endpoints per use case (from local DB)

| Use case | Best free model (provider) | Best free Space (hardware) |
|----------|---------------------------|---------------------------|
| text-to-speech | none (no free provider) | `hexgrad/Kokoro-TTS` (zero-a10g) |
| speech-to-text | `openai/whisper-large-v3` (hf-inference) | `openai/whisper` (zero-a10g) |
| text-embedding | `mixedbread-ai/mxbai-embed-large-v1` (hf-inference) | `sentence-transformers` spaces |
| text-generation | various (hf-inference) | `Qwen/Qwen3-TTS` (zero-a10g) |
| text-to-image | various (hf-inference) | various (zero-a10g) |

### 5. Discover (ARD) endpoint
- The correct semantic search endpoint is the **MCP** endpoint: `https://huggingface-hf-discover.hf.space/mcp`
- It exposes a `search` tool via JSON-RPC: `{"jsonrpc":"2.0","method":"tools/call","params":{"name":"search","arguments":{"query":{"text":"..."}}}}`
- Returns semantically-ranked Skills, Spaces, and MCP server cards.
- The REST `/api/discover` endpoint returns 401 — it is not the correct discover API.

## How to query the local DB

```bash
cd huggingface-skill/db-sync
node query-db.js best-models text-to-speech
node query-db.js best-spaces text-to-speech
node query-db.js zero-gpu text-to-speech
node query-db.js providers text-embedding
```

## How to call a free Space programmatically

Use the Gradio client (already a dependency in this project):

```js
import { Client } from '@gradio/client';

const client = await Client.connect('hexgrad/Kokoro-TTS');
const result = await client.predict('/generate', {
  text: 'Hello world',
  voice: 'af_heart',
  speed: 1.0
});
// result.data[0] is the audio file URL