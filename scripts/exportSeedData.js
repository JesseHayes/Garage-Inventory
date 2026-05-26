import fs from 'node:fs';
import path from 'node:path';
import { db, nowIso, parseJson } from '../server/db/database.js';

const publicDir = path.resolve('public');
const seedPath = path.join(publicDir, 'seed-data.json');

fs.mkdirSync(publicDir, { recursive: true });

const itemJsonFields = {
  tags: [],
  attributes: {},
  dimensions: {},
  material_composition: [],
  photos: []
};

const capabilityJsonFields = {
  capabilities_unlocked: [],
  related_item_ids: []
};

function decode(row, jsonFields) {
  const next = { ...row };
  for (const [field, fallback] of Object.entries(jsonFields)) {
    next[field] = parseJson(next[field], fallback);
  }
  return next;
}

const inventoryCount = db.prepare('SELECT COUNT(*) AS count FROM inventory_items').get().count;

if (inventoryCount === 0 && fs.existsSync(seedPath)) {
  console.log(`Keeping existing ${seedPath}; SQLite inventory is empty.`);
  process.exit(0);
}

const payload = {
  exported_at: nowIso(),
  app: 'garage-lab-inventory',
  schema_version: 2,
  inventory_items: db.prepare('SELECT * FROM inventory_items ORDER BY name COLLATE NOCASE').all().map((row) => decode(row, itemJsonFields)),
  locations: db.prepare('SELECT * FROM locations ORDER BY name COLLATE NOCASE').all(),
  tags: db.prepare('SELECT * FROM tags ORDER BY use_count DESC, name COLLATE NOCASE').all(),
  capability_upgrades: db.prepare('SELECT * FROM capability_upgrades ORDER BY name COLLATE NOCASE').all().map((row) => decode(row, capabilityJsonFields))
};

fs.writeFileSync(seedPath, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Wrote ${seedPath}`);
