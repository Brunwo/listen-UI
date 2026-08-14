#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execFileSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.HF_DB_PATH || join(__dirname, 'hf_catalog.db');

function sql(query) {
  try {
    return execFileSync('sqlite3', ['-header', '-column', DB_PATH, query], { encoding: 'utf8' });
  } catch (e) {
    console.error('SQLite error:', e.message);
    return '';
  }
}

function showHelp() {
  console.log(`HF Catalog Query

Usage:
  node query-db.js <command> [args]

Commands:
  modalities                    List all synced modalities
  best-models <modality>        Top models for a modality (by trending)
  best-spaces <modality>        Top spaces for a modality (by likes)
  zero-gpu <modality>           ZeroGPU spaces for a modality
  providers <modality>          Models with live inference providers
  search <query>                Search models by keyword
  recent                        Recent sync log
  changes [modality]            Recent sync changes (added/updated/moved/dropped)
  help                          Show this help

Examples:
  node query-db.js best-models text-to-speech
  node query-db.js best-spaces text-to-speech
  node query-db.js zero-gpu text-to-speech
  node query-db.js providers text-embedding
  node query-db.js search whisper
  node query-db.js changes text-to-speech
`);
}

const command = process.argv[2];
const arg = process.argv[3];

switch (command) {
  case 'modalities':
    console.log(sql(`SELECT DISTINCT modality FROM models ORDER BY modality;`));
    break;

  case 'best-models':
    if (!arg) { showHelp(); break; }
    console.log(sql(`SELECT id, likes, downloads, trending_score, rank, prev_rank, status, created_at, library_name, inference_providers
      FROM models WHERE modality='${arg}'
      ORDER BY trending_score DESC LIMIT 10;`));
    break;

  case 'best-spaces':
    if (!arg) { showHelp(); break; }
    console.log(sql(`SELECT id, title, likes, hardware, stage, host, model_id, rank, prev_rank, status
      FROM spaces WHERE modality='${arg}'
      ORDER BY likes DESC LIMIT 10;`));
    break;

  case 'zero-gpu':
    if (!arg) { showHelp(); break; }
    console.log(sql(`SELECT id, title, likes, hardware, host
      FROM spaces WHERE modality='${arg}' AND hardware LIKE 'zero-%'
      ORDER BY likes DESC LIMIT 10;`));
    break;

  case 'providers':
    if (!arg) { showHelp(); break; }
    console.log(sql(`SELECT id, likes, inference_providers
      FROM models WHERE modality='${arg}' AND inference_providers != ''
      ORDER BY likes DESC LIMIT 10;`));
    break;

  case 'search':
    if (!arg) { showHelp(); break; }
    console.log(sql(`SELECT id, modality, likes, trending_score, rank, status
      FROM models WHERE id LIKE '%${arg}%'
      ORDER BY trending_score DESC LIMIT 10;`));
    break;

  case 'recent':
    console.log(sql(`SELECT modality, type, count, synced_at
      FROM sync_log ORDER BY id DESC LIMIT 20;`));
    break;

  case 'changes':
    if (arg) {
      console.log(sql(`SELECT modality, type, entity_id, change, rank, prev_rank, synced_at
        FROM sync_changes WHERE modality='${arg}'
        ORDER BY id DESC LIMIT 30;`));
    } else {
      console.log(sql(`SELECT modality, type, entity_id, change, rank, prev_rank, synced_at
        FROM sync_changes ORDER BY id DESC LIMIT 30;`));
    }
    break;

  default:
    showHelp();
}