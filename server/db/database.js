import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..', '..');
const dataDir = path.join(root, 'data');
const dbPath = path.join(dataDir, 'garage-inventory.sqlite');
const schemaPath = path.join(__dirname, 'schema.sql');

fs.mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(dbPath);
db.exec('PRAGMA foreign_keys = ON;');
db.exec(fs.readFileSync(schemaPath, 'utf8'));

const capabilityColumns = db.prepare('PRAGMA table_info(capability_upgrades)').all().map((column) => column.name);
if (!capabilityColumns.includes('related_item_ids')) {
  db.exec("ALTER TABLE capability_upgrades ADD COLUMN related_item_ids TEXT DEFAULT '[]';");
}

export function nowIso() {
  return new Date().toISOString();
}

export function makeId(prefix) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

export function parseJson(value, fallback) {
  if (value == null || value === '') return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function stringifyJson(value, fallback) {
  return JSON.stringify(value ?? fallback);
}
