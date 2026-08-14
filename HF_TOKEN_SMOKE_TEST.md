# Hugging Face Token Smoke Test — Fix Summary & Findings

**Date:** 2026-08-11
**Scope:** HF connection testing & settings persistence in the web-to-audio app

---

## 1. Problem / Symptom

Users entering a Hugging Face **token** in the *"Hugging Face Token"* field (and leaving
the endpoint / API server at their default values) were blocked with:

> *"Please enter both Hugging Face API key and Endpoint URL."*

This happened both when clicking **Test HF Connection** and when clicking **Save Settings**.

The behavior was wrong in two ways:

1. **The token field was ignored.** Only the separate `hfApiKey` field was read, so a
   token-only setup was never recognized as having credentials.
2. **An endpoint was treated as mandatory.** Testing a connection required a deployed
   Inference Endpoint URL, even though a Hugging Face token alone is enough to validate
   credentials (via the Hub `whoami` API) — and a free shared embedding endpoint exists.

## 2. Root Cause

- `script.js` (test handler) gated on `!hfApiKey || !hfEndpointUrl` and only read the
  `hfApiKey` input value.
- `script.js` (save handler) only saved Hugging Face settings *inside* the OpenAI
  `if (apiKey && apiServer)` branch, and never read the token field.
- `src/huggingface.js` had no concept of a *default* endpoint and no lightweight
  "token-only" check — `getEmbedding()` always required a reachable endpoint.

## 3. What Was Done

### 3.1 `src/huggingface.js` — client capabilities

| Addition | Description |
|---|---|
| `DEFAULT_HF_ENDPOINT_URL` | Free text-embedding endpoint: `https://api-inference.huggingface.co/models/mixedbread-ai/mxbai-embed-large-v1`. Works with any valid HF token. |
| `getEffectiveEndpointUrl()` | Returns the configured custom endpoint, or the free default when none is set. |
| `smokeTest()` | Calls `GET https://huggingface.co/api/whoami-v2` with a `Bearer` token. Throws on missing key or non-2xx (e.g. HTTP 401). Returns the user/org payload. |
| `testConnection(endpointUrl?)` | 1) Runs `smokeTest()` (primary signal). 2) POSTs `{inputs:'test'}` to the given/custom/default endpoint with a 15 s timeout. An unreachable or failing endpoint is reported, **not fatal** — a plain token check still succeeds. Returns `{ tokenValid, user, endpointTested, endpointUrl }`. |
| Constructor fix | Now falls back to `localStorage['hf_token']` when `hf_api_key` is absent, so a token-only save is honored by the client itself. |

### 3.2 `script.js` — UI wiring

- **Test HF Connection** now:
  - Reads the key from **either** field: `hfApiKey || hfToken` (only requires one).
  - Requires a key only — no endpoint needed.
  - Temporarily applies the entered key/endpoint to the client *without persisting*.
  - Calls `testConnection()` with the entered endpoint, falling back to
    `DEFAULT_HF_ENDPOINT_URL`.
  - Reports the result: `Hugging Face token valid as "<user>" (endpoint verified / not checked: <url>)`.
- **Save Settings** now:
  - Persists HF settings independently of OpenAI settings (`hf_api_key`, `hf_token`).
  - Only persists a **custom** endpoint to `hf_endpoint_url`; the free default is
    implicit and never stored, so code-level default updates can't be masked by stale
    localStorage.
  - If OpenAI fields are incomplete, HF settings are still saved and a message says so.

### 3.3 `index.html` — UI copy

- Labels now clarify the token works alone for the smoke test and that the endpoint is
  optional (defaults to the free embedding endpoint).
- Button text: **Test HF Connection (token smoke test)**.

### 3.4 New tests — `src/huggingface.test.js` (14 cases)

| Group | Coverage |
|---|---|
| `DEFAULT_HF_ENDPOINT_URL` | Non-empty `https` URL. |
| `getEffectiveEndpointUrl` | Custom endpoint preferred; default fallback. |
| `smokeTest` | Throws without key; throws on HTTP 401; returns whoami payload and sends `Authorization: Bearer …`. |
| `testConnection` | Both checks succeed → `endpointTested: true`; endpoint network error → non-fatal `endpointTested: false`; endpoint HTTP error → non-fatal; defaults to built-in URL when none passed; token failure propagates (no endpoint call). |
| Setters | `setApiKey` / `setEndpointUrl` persist to localStorage. |
| Constructor | Falls back to `hf_token` when `hf_api_key` is absent. |

## 4. Verification (no regression)

| Check | Result |
|---|---|
| `pnpm run test:unit` | **25 passed** (11 existing + 14 new), 5 files |
| `pnpm exec eslint script.js src/huggingface.js src/huggingface.test.js` | 0 errors (only pre-existing `no-console` warnings in `script.js`) |
| `pnpm run lint` (full) | Identical to baseline: 17 errors / 24 warnings, all in untouched files |
| `pnpm run build` | Passes, PWA build OK |

## 5. Findings / Remaining Issues (out of scope, pre-existing)

1. **Full lint still fails** on untouched files: `src/audioPlayer.js`
   (`__APP_BASE__` and `audioPlayer` `no-undef`) and `src/audioPlayer.test.js`
   (unused imports). Unrelated to this change.
2. **Settings modal cancel/restore is incomplete** (`src/ui.js` `closeSettingsModal`):
   only `apiKeyInput` and `hfTokenInput` are restored. `hfApiKeyInput`,
   `hfEndpointUrlInput` and `apiServerInput` keep whatever the user typed when the modal
   is closed/cancelled. Pre-existing behavior.
3. **`script.js` `setOriginalSettingsForModal` call** on opening the settings modal passes
   only 2 arguments, overwriting the stored HF "original" values with `undefined`.
   Mitigated by `openSettingsModal()` re-capturing the token input, but the HF API-key /
   endpoint cancel-restore gap (see #2) remains.
4. **Live end-to-end check** of the whoami call requires a real HF token and was covered
   with mocked `fetch` in unit tests instead of a browser run.

## 6. How to Use It

1. Open **Settings**.
2. Paste a Hugging Face token in the **Token** field (or the **API Key** field).
   Leave **Inference Endpoint URL** empty to use the free embedding endpoint.
3. Click **Test HF Connection (token smoke test)**:
   - Valid token → toast: `Hugging Face token valid as "<user>"` + endpoint status.
   - Invalid token → toast: `Hugging Face token rejected (HTTP 401)`.
4. Click **Save** — HF settings persist even if OpenAI fields are incomplete.
