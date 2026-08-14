#!/usr/bin/env node

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import https from 'https';
import { execFileSync } from 'child_process';

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
const DB_PATH = process.env.HF_DB_PATH || join(__dirname, 'hf_catalog.db');

if (!apiKey) {
  console.error('Missing HF_API_KEY. Set it in your environment or .env file.');
  process.exit(1);
}

// --- HTTP helper using built-in https module ---
function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: options.method || 'GET',
      family: 4,
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
          try { resolve(JSON.parse(data)); } catch { resolve(data); }
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

// --- SQLite helper using sqlite3 CLI (no shell, avoids injection) ---
function sql(query) {
  try {
    return execFileSync('sqlite3', [DB_PATH, query], { encoding: 'utf8' }).trim();
  } catch (e) {
    console.error('SQLite error:', e.message);
    return '';
  }
}

// Escape single quotes for SQL string literals
const esc = (s) => String(s).replace(/'/g, "''");

// --- Modalities / use cases to sync ---
const MODALITIES = [
  { name: 'text-to-speech', pipeline: 'text-to-speech', search: 'text to speech' },
  { name: 'speech-to-text', pipeline: 'automatic-speech-recognition', search: 'speech to text' },
  { name: 'text-to-image', pipeline: 'text-to-image', search: 'text to image' },
  { name: 'image-to-text', pipeline: 'image-to-text', search: 'image to text' },
  { name: 'text-generation', pipeline: 'text-generation', search: 'text generation' },
  { name: 'text-embedding', pipeline: 'feature-extraction', search: 'sentence transformer' },
  { name: 'text-classification', pipeline: 'text-classification', search: 'text classification' },
  { name: 'summarization', pipeline: 'summarization', search: 'summarization' },
  { name: 'translation', pipeline: 'translation', search: 'translation' },
  { name: 'image-classification', pipeline: 'image-classification', search: 'image classification' },
  { name: 'object-detection', pipeline: 'object-detection', search: 'object detection' },
  { name: 'image-segmentation', pipeline: 'image-segmentation', search: 'image segmentation' },
  { name: 'audio-classification', pipeline: 'audio-classification', search: 'audio classification' },
  { name: 'question-answering', pipeline: 'question-answering', search: 'question answering' },
  { name: 'fill-mask', pipeline: 'fill-mask', search: 'fill mask' },
  { name: 'text-to-video', pipeline: 'text-to-video', search: 'text to video' },
  { name: 'image-to-image', pipeline: 'image-to-image', search: 'image to image' },
  { name: 'zero-shot-classification', pipeline: 'zero-shot-classification', search: 'zero shot classification' },
  { name: 'token-classification', pipeline: 'token-classification', search: 'token classification' },
  { name: 'table-question-answering', pipeline: 'table-question-answering', search: 'table question answering' }
];

// --- Helper: check if a column exists in a table ---
function columnExists(table, column) {
  const cols = sql(`PRAGMA table_info(${table});`);
  return cols.includes(column);
}

// --- Helper: add a column if it doesn't exist ---
function addColumnIfMissing(table, column, definition) {
  if (!columnExists(table, column)) {
    sql(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`);
    console.log(`  [migration] added column ${table}.${column}`);
  }
}

// --- Init DB schema (with migrations for existing DBs) ---
function initDb() {
  sql(`
    CREATE TABLE IF NOT EXISTS models (
      id TEXT,
      modality TEXT,
      pipeline_tag TEXT,
      likes INTEGER,
      downloads INTEGER,
      trending_score REAL,
      tags TEXT,
      inference_providers TEXT,
      created_at TEXT,
      library_name TEXT,
      rank INTEGER,
      prev_rank INTEGER,
      status TEXT DEFAULT 'active',
      updated_at TEXT,
      PRIMARY KEY (id, modality)
    );
  `);
  sql(`
    CREATE TABLE IF NOT EXISTS spaces (
      id TEXT,
      modality TEXT,
      title TEXT,
      sdk TEXT,
      likes INTEGER,
      hardware TEXT,
      stage TEXT,
      host TEXT,
      models TEXT,
      model_id TEXT,
      rank INTEGER,
      prev_rank INTEGER,
      status TEXT DEFAULT 'active',
      updated_at TEXT,
      PRIMARY KEY (id, modality)
    );
  `);
  sql(`
    CREATE TABLE IF NOT EXISTS sync_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      modality TEXT,
      type TEXT,
      count INTEGER,
      synced_at TEXT
    );
  `);
  sql(`
    CREATE TABLE IF NOT EXISTS sync_changes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      modality TEXT,
      type TEXT,
      entity_id TEXT,
      change TEXT,
      rank INTEGER,
      prev_rank INTEGER,
      synced_at TEXT
    );
  `);
  sql(`
    CREATE TABLE IF NOT EXISTS model_history (
      id TEXT,
      modality TEXT,
      synced_at TEXT,
      pipeline_tag TEXT,
      likes INTEGER,
      downloads INTEGER,
      trending_score REAL,
      tags TEXT,
      inference_providers TEXT,
      created_at TEXT,
      library_name TEXT,
      rank INTEGER,
      status TEXT,
      PRIMARY KEY (id, modality, synced_at)
    );
  `);
  sql(`
    CREATE TABLE IF NOT EXISTS space_history (
      id TEXT,
      modality TEXT,
      synced_at TEXT,
      title TEXT,
      sdk TEXT,
      likes INTEGER,
      hardware TEXT,
      stage TEXT,
      host TEXT,
      models TEXT,
      model_id TEXT,
      rank INTEGER,
      status TEXT,
      PRIMARY KEY (id, modality, synced_at)
    );
  `);

  // Migrations for existing DBs (add missing columns)
  addColumnIfMissing('models', 'created_at', 'TEXT');
  addColumnIfMissing('models', 'library_name', 'TEXT');
  addColumnIfMissing('models', 'rank', 'INTEGER');
  addColumnIfMissing('models', 'prev_rank', 'INTEGER');
  addColumnIfMissing('models', 'status', "TEXT DEFAULT 'active'");
  addColumnIfMissing('spaces', 'model_id', 'TEXT');
  addColumnIfMissing('spaces', 'rank', 'INTEGER');
  addColumnIfMissing('spaces', 'prev_rank', 'INTEGER');
  addColumnIfMissing('spaces', 'status', "TEXT DEFAULT 'active'");

  console.log('DB initialized:', DB_PATH);
}

// --- Log a change to sync_changes ---
function logChange(modality, type, entityId, change, rank, prevRank) {
  const now = new Date().toISOString();
  sql(`INSERT INTO sync_changes (modality, type, entity_id, change, rank, prev_rank, synced_at)
       VALUES ('${esc(modality)}', '${esc(type)}', '${esc(entityId)}', '${esc(change)}', ${rank === null || rank === undefined ? 'NULL' : rank}, ${prevRank === null || prevRank === undefined ? 'NULL' : prevRank}, '${esc(now)}');`);
}

// --- Sync models for a modality ---
async function syncModels(modality) {
  const baseUrl = `https://huggingface.co/api/models?pipeline_tag=${encodeURIComponent(modality.pipeline)}&sort=trendingScore&direction=-1&limit=20`;
  try {
    // Two calls: basic data + provider mapping, merged by id
    const [models, providerModels] = await Promise.all([
      request(baseUrl),
      request(`${baseUrl}&expand=inferenceProviderMapping`)
    ]);
    const providerMap = {};
    for (const pm of providerModels) {
      providerMap[pm.id] = pm.inferenceProviderMapping || [];
    }

    // Track which ids are present in this sync (for drop detection)
    const syncedIds = new Set();
    let count = 0;

    for (let i = 0; i < models.length; i++) {
      const m = models[i];
      const rank = i + 1; // 1-based rank position
      syncedIds.add(m.id);

      const providers = (providerMap[m.id] || [])
        .filter(p => p.status === 'live')
        .map(p => `${p.provider}:${p.providerId || p.provider_id || ''}`)
        .join(',');
      const tags = (m.tags || []).join(',');
      const now = new Date().toISOString();

      // Get previous rank for this entity (if it exists)
      const prevRow = sql(`SELECT rank, status FROM models WHERE id='${esc(m.id)}' AND modality='${esc(modality.name)}';`);
      let prevRank = null;
      let prevStatus = null;
      if (prevRow) {
        const parts = prevRow.split('|');
        prevRank = parts[0] ? Number(parts[0]) : null;
        prevStatus = parts[1] || null;
      }

      const sqlQuery = `INSERT OR REPLACE INTO models (id, modality, pipeline_tag, likes, downloads, trending_score, tags, inference_providers, created_at, library_name, rank, prev_rank, status, updated_at)
           VALUES ('${esc(m.id)}', '${esc(modality.name)}', '${esc(m.pipeline_tag || modality.pipeline)}', ${m.likes || 0}, ${m.downloads || 0}, ${m.trendingScore || 0}, '${esc(tags)}', '${esc(providers)}', '${esc(m.createdAt || '')}', '${esc(m.library_name || '')}', ${rank}, ${prevRank === null ? 'NULL' : prevRank}, 'active', '${esc(now)}');`;
      sql(sqlQuery);

      // Store a historical snapshot for this sync
      sql(`INSERT OR REPLACE INTO model_history (id, modality, synced_at, pipeline_tag, likes, downloads, trending_score, tags, inference_providers, created_at, library_name, rank, status)
           VALUES ('${esc(m.id)}', '${esc(modality.name)}', '${esc(now)}', '${esc(m.pipeline_tag || modality.pipeline)}', ${m.likes || 0}, ${m.downloads || 0}, ${m.trendingScore || 0}, '${esc(tags)}', '${esc(providers)}', '${esc(m.createdAt || '')}', '${esc(m.library_name || '')}', ${rank}, 'active');`);

      // Log change
      if (prevRank === null) {
        logChange(modality.name, 'models', m.id, 'added', rank, null);
      } else if (prevRank !== rank) {
        const change = rank < prevRank ? 'moved_up' : 'moved_down';
        logChange(modality.name, 'models', m.id, change, rank, prevRank);
      } else {
        logChange(modality.name, 'models', m.id, 'updated', rank, prevRank);
      }

      count++;
    }

    // Detect dropped entities: present in DB for this modality but not in this sync
    const existing = sql(`SELECT id FROM models WHERE modality='${esc(modality.name)}' AND status='active';`);
    if (existing) {
      for (const line of existing.split('\n')) {
        const id = line.trim();
        if (id && !syncedIds.has(id)) {
          sql(`UPDATE models SET status='dropped', updated_at='${esc(new Date().toISOString())}' WHERE id='${esc(id)}' AND modality='${esc(modality.name)}';`);
          logChange(modality.name, 'models', id, 'dropped', null, null);
          console.log(`  models[${modality.name}]: dropped ${id}`);
        }
      }
    }

    sql(`INSERT INTO sync_log (modality, type, count, synced_at) VALUES ('${esc(modality.name)}', 'models', ${count}, '${esc(new Date().toISOString())}');`);
    console.log(`  models[${modality.name}]: ${count} synced`);
  } catch (e) {
    console.error(`  models[${modality.name}] error: ${e.message}`);
  }
}

// --- Sync spaces for a modality ---
async function syncSpaces(modality) {
  const baseUrl = `https://huggingface.co/api/spaces?search=${encodeURIComponent(modality.search)}&sort=likes&direction=-1&limit=20`;
  try {
    // Two calls: basic data + runtime info, merged by id
    const [spaces, runtimeSpaces] = await Promise.all([
      request(baseUrl),
      request(`${baseUrl}&expand=runtime`)
    ]);
    const runtimeMap = {};
    for (const rs of runtimeSpaces) {
      runtimeMap[rs.id] = rs.runtime || {};
    }

    // Track which ids are present in this sync (for drop detection)
    const syncedIds = new Set();
    let count = 0;

    for (let i = 0; i < spaces.length; i++) {
      const s = spaces[i];
      const rank = i + 1; // 1-based rank position
      syncedIds.add(s.id);

      const now = new Date().toISOString();
      const runtime = runtimeMap[s.id] || {};
      const hardware = typeof runtime.hardware === 'object' ? (runtime.hardware?.current || '') : (runtime.hardware || '');
      const host = runtime.domains?.[0]?.domain || '';

      // Get previous rank for this entity (if it exists)
      const prevRow = sql(`SELECT rank, status FROM spaces WHERE id='${esc(s.id)}' AND modality='${esc(modality.name)}';`);
      let prevRank = null;
      let prevStatus = null;
      if (prevRow) {
        const parts = prevRow.split('|');
        prevRank = parts[0] ? Number(parts[0]) : null;
        prevStatus = parts[1] || null;
      }

      const sqlQuery = `INSERT OR REPLACE INTO spaces (id, modality, title, sdk, likes, hardware, stage, host, models, model_id, rank, prev_rank, status, updated_at)
           VALUES ('${esc(s.id)}', '${esc(modality.name)}', '${esc(s.title || '')}', '${esc(s.sdk || '')}', ${s.likes || 0}, '${esc(hardware)}', '${esc(runtime.stage || '')}', '${esc(host)}', '${esc((s.models || []).join(','))}', '${esc(s.modelId || '')}', ${rank}, ${prevRank === null ? 'NULL' : prevRank}, 'active', '${esc(now)}');`;
      sql(sqlQuery);

      // Store a historical snapshot for this sync
      sql(`INSERT OR REPLACE INTO space_history (id, modality, synced_at, title, sdk, likes, hardware, stage, host, models, model_id, rank, status)
           VALUES ('${esc(s.id)}', '${esc(modality.name)}', '${esc(now)}', '${esc(s.title || '')}', '${esc(s.sdk || '')}', ${s.likes || 0}, '${esc(hardware)}', '${esc(runtime.stage || '')}', '${esc(host)}', '${esc((s.models || []).join(','))}', '${esc(s.modelId || '')}', ${rank}, 'active');`);

      // Log change
      if (prevRank === null) {
        logChange(modality.name, 'spaces', s.id, 'added', rank, null);
      } else if (prevRank !== rank) {
        const change = rank < prevRank ? 'moved_up' : 'moved_down';
        logChange(modality.name, 'spaces', s.id, change, rank, prevRank);
      } else {
        logChange(modality.name, 'spaces', s.id, 'updated', rank, prevRank);
      }

      count++;
    }

    // Detect dropped entities: present in DB for this modality but not in this sync
    const existing = sql(`SELECT id FROM spaces WHERE modality='${esc(modality.name)}' AND status='active';`);
    if (existing) {
      for (const line of existing.split('\n')) {
        const id = line.trim();
        if (id && !syncedIds.has(id)) {
          sql(`UPDATE spaces SET status='dropped', updated_at='${esc(new Date().toISOString())}' WHERE id='${esc(id)}' AND modality='${esc(modality.name)}';`);
          logChange(modality.name, 'spaces', id, 'dropped', null, null);
          console.log(`  spaces[${modality.name}]: dropped ${id}`);
        }
      }
    }

    sql(`INSERT INTO sync_log (modality, type, count, synced_at) VALUES ('${esc(modality.name)}', 'spaces', ${count}, '${esc(new Date().toISOString())}');`);
    console.log(`  spaces[${modality.name}]: ${count} synced`);
  } catch (e) {
    console.error(`  spaces[${modality.name}] error: ${e.message}`);
  }
}

// --- Main ---
async function main() {
  console.log('=== HF Catalog Sync ===');
  console.log('Time:', new Date().toISOString());
  initDb();

  for (const modality of MODALITIES) {
    console.log(`\nSyncing modality: ${modality.name}`);
    await syncModels(modality);
    await syncSpaces(modality);
  }

  console.log('\n=== Sync complete ===');
  console.log('DB:', DB_PATH);
}

main().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});