# Best Free Zero-GPU TTS Inference Endpoints

Research date: 2026-08-04
Method: `hf spaces search "text to speech"` + `hf spaces info` to verify hardware.

## Summary

All top TTS Spaces run on **free ZeroGPU (`zero-a10g`)** hardware. One runs on free CPU. No TTS model is served by the free `hf-inference` provider directly.

## Recommended Free Zero-GPU TTS Spaces

| Space | Hardware | Likes | Model | Notes |
|-------|----------|-------|-------|-------|
| `hexgrad/Kokoro-TTS` | `zero-a10g` | 3417 | `hexgrad/Kokoro-82M` | Most popular, lightweight 82M model, fast |
| `mrfakename/E2-F5-TTS` | `zero-a10g` | 2893 | `SWivid/F5-TTS`, `SWivid/E2-TTS` | Voice cloning, high quality |
| `Qwen/Qwen3-TTS` | `zero-a10g` | 2111 | `Qwen/Qwen3-TTS-12Hz-1.7B-*` | Official Qwen demo, voice design |
| `k2-fsa/OmniVoice` | `zero-a10g` | 1180 | `k2-fsa/OmniVoice` | Voice cloning + TTS |
| `innoai/Edge-TTS-Text-to-Speech` | `cpu-basic` | 1243 | Edge TTS (Microsoft) | Free CPU, no GPU needed, many voices |
| `artificialguybr/fish-s2-pro-zero` | `zero-a10g` | 170 | `fishaudio/s2-pro` | Fish Audio S2 Pro |
| `owensong/Inflect-v2` | `zero-a10g` | 111 | `owensong/Inflect-Micro/Nano-v2` | Tiny local TTS, edge-ai |

## Recommendations

### For a podcast app (this project)
- **Best overall**: `hexgrad/Kokoro-TTS` — 82M params, fast on ZeroGPU, 3417 likes, stable.
- **Best quality**: `mrfakename/E2-F5-TTS` — F5-TTS is state-of-the-art for natural speech.
- **Best free CPU fallback**: `innoai/Edge-TTS-Text-to-Speech` — runs on free `cpu-basic`, no GPU quota, uses Microsoft Edge neural voices.

### Inference provider note
The `hf-inference` free provider does **not** serve TTS models. The only TTS models with live third-party providers are:
- `hexgrad/Kokoro-82M` → `fal-ai` (live)
- `ResembleAI/chatterbox` → `fal-ai` (live)

These require a paid fal-ai account. The free path is to use the Gradio Spaces above directly.

## Discover via ARD MCP

The `discover` command uses the Hugging Face Agent Resource Discovery (ARD) MCP endpoint (`https://huggingface-hf-discover.hf.space/mcp`), which returns semantically-ranked Skills, Spaces, and MCP server cards:

```bash
node cli/index.js discover "Text to speech for podcast"
```

## How to call a Space programmatically

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
```

## ZeroGPU quota

- Free ZeroGPU Spaces share a pool of A10G GPUs.
- Quota is per-user, resets periodically.
- Spaces sleep after 48h of inactivity (`sleep_time: 172800`).
- For production, deploy a dedicated Inference Endpoint or use a paid provider.