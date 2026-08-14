#!/usr/bin/env node

/**
 * HF Catalog API Server
 *
 * Exposes the local SQLite catalog (hf_catalog.db) as a JSON REST API
 * for the frontend to consume.
 *
 * Usage:
 *   node server.js [--port 8787] [--db /path/to/hf_catalog.db]
 *
 * Endpoints:
 *   GET /api/modalities            List all synced modalities
 *   GET /api/models?modality=X     List models (sort=trending|likes|downloads, limit, search)
 *   GET /api/spaces?modality=X     List spaces (sort=likes, limit, search, zero-gpu)
 *   GET /api/search?q=...          Search models by keyword
 *   GET /api/recent                Recent sync log
 *   GET /api/stats                 Per-modality counts
 *   GET /api/health                Health check
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execFile } from 'child_process';
import http from 'http';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.HF_DB_PATH || join(__dirname, 'hf_catalog.db');
const PORT = Number(process.env.PORT) || 8787;

// --- SQLite helpers (async, non-blocking) ---

function queryDb(sql) {
  return new Promise((resolve, reject) => {
    execFile('sqlite3', ['-json', DB_PATH, sql], { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(stderr || err.message));
        return;
      }
      try {
        resolve(JSON.parse(stdout || '[]'));
      } catch (parseErr) {
        reject(new Error(`Failed to parse SQLite JSON output: ${parseErr.message}`));
      }
    });
  });
}

// --- Request helpers ---

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function sendError(res, status, message) {
  sendJson(res, status, { error: message });
}

function parseQuery(url) {
  const parsed = new URL(url, 'http://localhost');
  const params = {};
  for (const [key, value] of parsed.searchParams) {
    params[key] = value;
  }
  return params;
}

function escapeSql(value) {
  return String(value).replace(/'/g, "''");
}

// --- Route handlers ---

async function handleModalities(res) {
  const rows = await queryDb(
    `SELECT m.modality,
            (SELECT COUNT(*) FROM models WHERE modality = m.modality) AS model_count,
            (SELECT COUNT(*) FROM spaces WHERE modality = m.modality) AS space_count
     FROM (SELECT DISTINCT modality FROM models) m
     ORDER BY m.modality;`
  );
  sendJson(res, 200, rows);
}

async function handleModels(res, params) {
  const modality = params.modality;
  const limit = Math.min(Number(params.limit) || 50, 200);
  const sort = params.sort || 'trending';
  const search = params.search ? escapeSql(params.search) : '';

  const sortMap = {
    trending: 'trending_score DESC',
    likes: 'likes DESC',
    downloads: 'downloads DESC'
  };
  const orderBy = sortMap[sort] || sortMap.trending;

  let where = '';
  if (modality) where += `modality = '${escapeSql(modality)}'`;
  if (search) {
    where += where ? ' AND ' : '';
    where += `(id LIKE '%${search}%' OR tags LIKE '%${search}%')`;
  }
  if (where) where = `WHERE ${where}`;

  const rows = await queryDb(
    `SELECT id, modality, pipeline_tag, likes, downloads, trending_score, tags, inference_providers, updated_at
     FROM models ${where}
     ORDER BY ${orderBy}
     LIMIT ${limit};`
  );
  sendJson(res, 200, rows);
}

async function handleSpaces(res, params) {
  const modality = params.modality;
  const limit = Math.min(Number(params.limit) || 50, 200);
  const search = params.search ? escapeSql(params.search) : '';
  const zeroGpu = params['zero-gpu'] === 'true' || params['zero-gpu'] === '1';

  let where = '';
  if (modality) where += `modality = '${escapeSql(modality)}'`;
  if (search) {
    where += where ? ' AND ' : '';
    where += `(id LIKE '%${search}%' OR title LIKE '%${search}%')`;
  }
  if (zeroGpu) {
    where += where ? ' AND ' : '';
    where += `hardware LIKE 'zero-%'`;
  }
  if (where) where = `WHERE ${where}`;

  const rows = await queryDb(
    `SELECT id, modality, title, sdk, likes, hardware, stage, host, models, updated_at
     FROM spaces ${where}
     ORDER BY likes DESC
     LIMIT ${limit};`
  );
  sendJson(res, 200, rows);
}

async function handleSearch(res, params) {
  const q = params.q ? escapeSql(params.q) : '';
  if (!q) {
    sendError(res, 400, 'Missing required query parameter: q');
    return;
  }
  const limit = Math.min(Number(params.limit) || 20, 100);

  const rows = await queryDb(
    `SELECT id, modality, likes, downloads, trending_score, inference_providers
     FROM models
     WHERE id LIKE '%${q}%' OR tags LIKE '%${q}%'
     ORDER BY trending_score DESC
     LIMIT ${limit};`
  );
  sendJson(res, 200, rows);
}

async function handleRecent(res) {
  const rows = await queryDb(
    `SELECT id, modality, type, count, synced_at
     FROM sync_log
     ORDER BY id DESC
     LIMIT 50;`
  );
  sendJson(res, 200, rows);
}

async function handleStats(res) {
  const rows = await queryDb(
    `SELECT modality,
            (SELECT COUNT(*) FROM models WHERE modality = m.modality) AS model_count,
            (SELECT COUNT(*) FROM spaces WHERE modality = m.modality) AS space_count,
            (SELECT MAX(updated_at) FROM models WHERE modality = m.modality) AS last_model_sync,
            (SELECT MAX(updated_at) FROM spaces WHERE modality = m.modality) AS last_space_sync
     FROM (SELECT DISTINCT modality FROM models) m
     ORDER BY m.modality;`
  );
  sendJson(res, 200, rows);
}

async function handleHealth(res) {
  try {
    await queryDb('SELECT 1 AS ok;');
    sendJson(res, 200, { status: 'ok', db: DB_PATH });
  } catch (err) {
    sendError(res, 500, `Database not reachable: ${err.message}`);
  }
}

// --- Server ---

const server = http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  if (req.method !== 'GET') {
    sendError(res, 405, 'Method not allowed. Only GET is supported.');
    return;
  }

  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname;
  const params = parseQuery(req.url);

  try {
    switch (path) {
      case '/api/modalities':
        await handleModalities(res);
        break;
      case '/api/models':
        await handleModels(res, params);
        break;
      case '/api/spaces':
        await handleSpaces(res, params);
        break;
      case '/api/search':
        await handleSearch(res, params);
        break;
      case '/api/recent':
        await handleRecent(res);
        break;
      case '/api/stats':
        await handleStats(res);
        break;
      case '/api/health':
        await handleHealth(res);
        break;
      default:
        sendError(res, 404, `Unknown endpoint: ${path}`);
    }
  } catch (err) {
    console.error('API error:', err.message);
    sendError(res, 500, `Internal server error: ${err.message}`);
  }
});

server.listen(PORT, () => {
  console.log(`HF Catalog API listening on http://localhost:${PORT}`);
  console.log(`Database: ${DB_PATH}`);
  console.log('Endpoints: /api/modalities, /api/models, /api/spaces, /api/search, /api/recent, /api/stats, /api/health');
});