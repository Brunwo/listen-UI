# Hugging Face MCP, Skills & Inference Endpoints

This doc covers the three complementary Hugging Face capabilities from the original task: the MCP server, the Skills registry, and Inference Endpoints.

## 1. Hugging Face MCP Server

The HF MCP server lets MCP-compatible AI assistants (Cursor, VS Code, Claude Desktop, Zed) connect directly to the Hub.

### Setup

1. Open your MCP client settings while logged in.
2. Select your client (Cursor, VS Code, etc.).
3. Paste the configuration snippet and restart the client.

Example config (VS Code / Claude Desktop):

```json
{
  "mcpServers": {
    "huggingface": {
      "command": "npx",
      "args": ["-y", "@huggingface/mcp-server"],
      "env": { "HF_TOKEN": "${HF_TOKEN}" }
    }
  }
}
```

Once connected, the assistant can:
- Search/explore models, datasets, Spaces, papers with filters (task, library, etc.)
- Fetch repo details, documentation, run compute jobs
- Use Gradio Spaces as AI tools via MCP

### ARD Discover via MCP

Connect an MCP client to `https://huggingface-hf-discover.hf.space/mcp` for semantic search over Skills, Spaces, and MCP server cards.

Filter by artifact type:

```json
{
  "query": { "text": "Generate an image" },
  "filter": { "type": ["application/mcp-server-card+json"] }
}
```

Other types: `application/ai-skill`, `application/vnd.huggingface.space+json`.

## 2. Hugging Face Skills

Skills are predefined capabilities for AI/ML tasks. Accessible via the Skills Registry.

### Install a skill

```bash
hf skills list                    # List available skills
hf skills add --claude --global   # Install for Claude (global)
hf skills add --dest PATH         # Install to a custom path
hf skills update                  # Update installed skills
```

### Key skills

| Skill | Purpose |
|-------|---------|
| `huggingface-llm-trainer` | Train/fine-tune LLMs with TRL (SFT, DPO, GRPO) on HF Jobs |
| `huggingface-community-evals` | Run evaluations against models on the Hub |
| `hf-mcp` | Use the Hub via MCP server tools |
| `inference-server` | Start/test the Prime-RL inference server, launch vLLM |
| `huggingface-cli-claude-code-skill` | Manage models/datasets/endpoints via `hf` CLI |
| `huggingface-best` | Find best/top/recommended models by benchmark |
| `huggingface-spaces` | Build/deploy/maintain Spaces (ZeroGPU, dedicated hardware) |
| `huggingface-zerogpu` | AI demos with Gradio Spaces ZeroGPU |
| `transformers-js` | Run ML models in JS/TS with Transformers.js |

## 3. Inference Endpoints

Managed service to deploy any Hub model to a production-ready, private API.

### Deploy via CLI

```bash
# List available catalog models
hf endpoints catalog list

# Deploy from the Model Catalog
hf endpoints catalog deploy --repo sentence-transformers/all-MiniLM-L6-v2 --name my-embedder

# Deploy from a Hub repo with explicit config
hf endpoints deploy my-endpoint \
  --repo sentence-transformers/all-MiniLM-L6-v2 \
  --task feature-extraction \
  --accelerator cpu \
  --instance-size small \
  --region us \
  --type protected
```

### Manage endpoints

```bash
hf endpoints list                 # List all endpoints
hf endpoints describe my-endpoint # Get status/URL
hf endpoints pause my-endpoint    # Pause
hf endpoints resume my-endpoint   # Resume
hf endpoints scale-to-zero my-endpoint  # Scale to zero (save cost)
hf endpoints update my-endpoint --min-replica 1 --max-replica 2
hf endpoints delete my-endpoint --yes
```

### Call an endpoint

Once deployed (~10 min), the endpoint URL is available. Call it with your token:

```bash
curl -X POST https://<endpoint-url> \
  -H "Authorization: Bearer $HF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"inputs": "Hello world"}'
```

### Programmatic (Python)

```python
from huggingface_hub import list_inference_endpoints, get_inference_endpoint

endpoints = list_inference_endpoints()
endpoint = get_inference_endpoint(name="my-embedder", namespace="your-username")
api_url = endpoint.url
```

## 4. ARD Semantic Search (CLI)

```bash
# Search for resources to train a model
hf discover search "Fine tune a language model"

# Find MCP Servers to generate an image
hf discover search "Generate an image" --json --kind mcp

# Search other registries
hf discover search "Purchase aeroplane tickets" --registry-url <catalog-url>
```

## Putting it together (semantic search workflow)

1. **Discover**: `hf discover search "sentence transformer for semantic search"` to find candidate models.
2. **Deploy**: `hf endpoints deploy my-embedder --repo <model> --task feature-extraction` for a private endpoint.
3. **Connect**: Add the HF MCP server to your editor for in-IDE search/management.
4. **Automate**: Use skills like `hf-mcp` or `inference-server` in agent workflows.