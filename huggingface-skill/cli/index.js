#!/usr/bin/env node

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import https from 'https';
import http from 'http';

// --- Lightweight .env loader (no external deps) ---
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env');

if (existsSync(envPath)) {
  const content = readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

const apiKey = process.env.HF_API_KEY || '';
const endpointUrl = process.env.HF_ENDPOINT_URL || '';

if (!apiKey) {
  console.error('Missing HF_API_KEY. Set it in your environment or .env file.');
  process.exit(1);
}

// --- HTTP helper using built-in https module (works on Node 18) ---
function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https:') ? https : http;
    const req = lib.request(url, {
      method: options.method || 'GET',
      family: 4, // Force IPv4 (Node 18 may try unreachable IPv6)
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(data);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function searchModels(query) {
  const url = `https://huggingface.co/api/models?search=${encodeURIComponent(query)}&limit=20`;
  const data = await request(url);
  console.log(JSON.stringify(data, null, 2));
}

async function searchSpaces(query) {
  const url = `https://huggingface.co/api/spaces?search=${encodeURIComponent(query)}&limit=20`;
  const data = await request(url);
  console.log(JSON.stringify(data, null, 2));
}

async function modelDetails(modelId) {
  const url = `https://huggingface.co/api/models/${encodeURIComponent(modelId)}`;
  const data = await request(url);
  console.log(JSON.stringify(data, null, 2));
}

async function listEndpoints() {
  const url = 'https://huggingface.co/api/inference-endpoints';
  const data = await request(url);
  console.log(JSON.stringify(data, null, 2));
}

async function embed(text) {
  if (!endpointUrl) {
    console.error('Missing HF_ENDPOINT_URL. Set it in your environment or .env file.');
    process.exit(1);
  }
  const data = await request(endpointUrl, {
    method: 'POST',
    body: JSON.stringify({ inputs: text })
  });
  console.log(JSON.stringify(data, null, 2));
}

async function discover(query) {
  // Use the Hugging Face Agent Resource Discovery (ARD) MCP endpoint
  const url = 'https://huggingface-hf-discover.hf.space/mcp';
  const body = JSON.stringify({
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'search',
      arguments: {
        query: { text: query },
        pageSize: 10
      }
    },
    id: 1
  });
  const data = await request(url, { method: 'POST', body });
  const content = data?.result?.content?.[0]?.text;
  if (content) {
    console.log(JSON.stringify(JSON.parse(content), null, 2));
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

function cosineSimilarity(a, b) {
  const dot = a.reduce((s, x, i) => s + x * b[i], 0);
  const magA = Math.sqrt(a.reduce((s, x) => s + x * x, 0));
  const magB = Math.sqrt(b.reduce((s, x) => s + x * x, 0));
  return dot / (magA * magB);
}

async function semanticSearch(query, documents) {
  if (!endpointUrl) {
    console.error('Missing HF_ENDPOINT_URL. Set it in your environment or .env file.');
    process.exit(1);
  }
  const queryEmb = await request(endpointUrl, { method: 'POST', body: JSON.stringify({ inputs: query }) });
  const docEmbs = [];
  for (const doc of documents) {
    const emb = await request(endpointUrl, { method: 'POST', body: JSON.stringify({ inputs: doc }) });
    docEmbs.push(emb);
  }
  const scored = docEmbs.map((emb, i) => ({ document: documents[i], score: cosineSimilarity(queryEmb, emb) }));
  scored.sort((a, b) => b.score - a.score);
  console.log(JSON.stringify(scored, null, 2));
}

function showHelp() {
  console.log(`Hugging Face Skill CLI

Usage:
  node cli/index.js <command> [args]

Commands:
  search-models <query>
  search-spaces <query>
  model-details <modelId>
  list-endpoints
  embed <text>
  discover <query>
  semantic-search <query> --documents <doc1> <doc2> ...

Env (or .env file):
  HF_API_KEY
  HF_ENDPOINT_URL (required for embed and semantic-search)
`);
}

const command = process.argv[2];
const args = process.argv.slice(3);

(async () => {
  try {
    switch (command) {
      case 'search-models':
        await searchModels(args[0]);
        break;
      case 'search-spaces':
        await searchSpaces(args[0]);
        break;
      case 'model-details':
        await modelDetails(args[0]);
        break;
      case 'list-endpoints':
        await listEndpoints();
        break;
      case 'embed':
        await embed(args[0]);
        break;
      case 'discover':
        await discover(args[0]);
        break;
      case 'semantic-search': {
        const docIndex = args.indexOf('--documents');
        const query = args[0];
        const documents = docIndex === -1 ? [] : args.slice(docIndex + 1);
        await semanticSearch(query, documents);
        break;
      }
      default:
        showHelp();
    }
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
})();