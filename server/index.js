import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { timingSafeEqual } from 'node:crypto';
import { db, makeId, nowIso, parseJson, stringifyJson } from './db/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const app = express();
const port = Number(process.env.PORT || 3107);
const host = process.env.HOST || '0.0.0.0';
const authUser = process.env.GARAGE_AUTH_USER || 'garage';
const authPassword = process.env.GARAGE_AUTH_PASSWORD || '';
const authRequired = process.env.GARAGE_REQUIRE_AUTH === 'true' || Boolean(authPassword);

if (authRequired && !authPassword) {
  throw new Error('GARAGE_AUTH_PASSWORD is required when GARAGE_REQUIRE_AUTH=true');
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function requireBasicAuth(req, res, next) {
  if (!authRequired) return next();
  const header = req.get('authorization') || '';
  const [scheme, encoded] = header.split(' ');
  if (scheme !== 'Basic' || !encoded) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Garage Lab Inventory"');
    return res.status(401).send('Authentication required');
  }
  const decoded = Buffer.from(encoded, 'base64').toString('utf8');
  const separator = decoded.indexOf(':');
  const user = separator >= 0 ? decoded.slice(0, separator) : '';
  const password = separator >= 0 ? decoded.slice(separator + 1) : '';
  if (!safeEqual(user, authUser) || !safeEqual(password, authPassword)) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Garage Lab Inventory"');
    return res.status(401).send('Authentication required');
  }
  next();
}

app.use(requireBasicAuth);
app.use(express.json({ limit: '25mb' }));
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

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

function normalizeTag(tag) {
  return String(tag || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function cleanTags(tags) {
  const seen = new Set();
  return (Array.isArray(tags) ? tags : [])
    .map((tag) => String(tag || '').trim())
    .filter(Boolean)
    .filter((tag) => {
      const normalized = normalizeTag(tag);
      if (!normalized || seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
}

function decodeRow(row, jsonFields) {
  if (!row) return null;
  const decoded = { ...row };
  for (const [field, fallback] of Object.entries(jsonFields)) {
    decoded[field] = parseJson(decoded[field], fallback);
  }
  return decoded;
}

function itemPayload(body, existing = {}) {
  const now = nowIso();
  return {
    id: existing.id || body.id || makeId('item'),
    name: body.name?.trim() || 'Unknown object',
    base_type: body.base_type || 'unknown',
    category: body.category || '',
    tags: stringifyJson(cleanTags(body.tags), []),
    attributes: stringifyJson(body.attributes, {}),
    quantity: Number(body.quantity ?? 1),
    units: body.units || 'each',
    dimensions: stringifyJson(body.dimensions, {}),
    material_composition: stringifyJson(body.material_composition, []),
    condition: body.condition || 'unknown',
    location_id: body.location_id || null,
    notes: body.notes || '',
    photos: stringifyJson(body.photos, []),
    source_origin: body.source_origin || '',
    tested_status: body.tested_status || 'not tested',
    confidence_level: body.confidence_level || 'unknown',
    salvage_status: body.salvage_status || 'intake',
    date_added: body.date_added || existing.date_added || now.slice(0, 10),
    created_at: existing.created_at || now,
    updated_at: now
  };
}

function locationPayload(body, existing = {}) {
  const now = nowIso();
  return {
    id: existing.id || body.id || makeId('loc'),
    name: body.name?.trim() || 'Unnamed location',
    code: body.code || '',
    type: body.type || 'bin',
    parent_id: body.parent_id || null,
    notes: body.notes || '',
    created_at: existing.created_at || now,
    updated_at: now
  };
}

function capabilityPayload(body, existing = {}) {
  const now = nowIso();
  return {
    id: existing.id || body.id || makeId('cap'),
    name: body.name?.trim() || 'Unnamed upgrade',
    estimated_cost: body.estimated_cost === '' || body.estimated_cost == null ? null : Number(body.estimated_cost),
    capabilities_unlocked: stringifyJson(body.capabilities_unlocked, []),
    related_item_ids: stringifyJson(body.related_item_ids, []),
    priority: body.priority || 'medium',
    status: body.status || 'desired',
    notes: body.notes || '',
    created_at: existing.created_at || now,
    updated_at: now
  };
}

function refreshTagRegistry() {
  const counts = new Map();
  for (const row of db.prepare('SELECT tags FROM inventory_items').all()) {
    for (const tag of cleanTags(parseJson(row.tags, []))) {
      const normalized = normalizeTag(tag);
      const current = counts.get(normalized) || { name: tag, count: 0 };
      current.count += 1;
      if (tag.length > current.name.length) current.name = tag;
      counts.set(normalized, current);
    }
  }

  const now = nowIso();
  db.exec('BEGIN');
  try {
    db.prepare('UPDATE tags SET use_count = 0, updated_at = ?').run(now);
    const upsert = db.prepare(`INSERT INTO tags (id, name, normalized_name, use_count, created_at, updated_at)
      VALUES (@id, @name, @normalized_name, @use_count, @created_at, @updated_at)
      ON CONFLICT(normalized_name) DO UPDATE SET name=@name, use_count=@use_count, updated_at=@updated_at`);
    for (const [normalized, tag] of counts) {
      upsert.run({
        id: makeId('tag'),
        name: tag.name,
        normalized_name: normalized,
        use_count: tag.count,
        created_at: now,
        updated_at: now
      });
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

function allTags() {
  refreshTagRegistry();
  return db.prepare('SELECT * FROM tags ORDER BY use_count DESC, name COLLATE NOCASE').all();
}

function pick(row, fields) {
  return Object.fromEntries(fields.map((field) => [field, row[field]]));
}

function allLocations() {
  return db.prepare('SELECT * FROM locations ORDER BY name COLLATE NOCASE').all();
}

function locationPaths() {
  const locations = allLocations();
  const byId = new Map(locations.map((location) => [location.id, location]));
  const pathFor = (location) => {
    const names = [];
    let current = location;
    const seen = new Set();
    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      names.unshift(current.code || current.name);
      current = current.parent_id ? byId.get(current.parent_id) : null;
    }
    return names.join(' > ');
  };
  return Object.fromEntries(locations.map((location) => [location.id, pathFor(location)]));
}

function listItems() {
  const paths = locationPaths();
  return db.prepare('SELECT * FROM inventory_items ORDER BY updated_at DESC').all().map((row) => {
    const item = decodeRow(row, itemJsonFields);
    item.location_path = item.location_id ? paths[item.location_id] || '' : '';
    return item;
  });
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/api/items', (req, res) => {
  res.json(listItems());
});

app.post('/api/items', (req, res) => {
  const item = itemPayload(req.body);
  db.prepare(`INSERT INTO inventory_items
    (id, name, base_type, category, tags, attributes, quantity, units, dimensions, material_composition, condition, location_id, notes, photos, source_origin, tested_status, confidence_level, salvage_status, date_added, created_at, updated_at)
    VALUES (@id, @name, @base_type, @category, @tags, @attributes, @quantity, @units, @dimensions, @material_composition, @condition, @location_id, @notes, @photos, @source_origin, @tested_status, @confidence_level, @salvage_status, @date_added, @created_at, @updated_at)`).run(item);
  refreshTagRegistry();
  res.status(201).json(decodeRow(item, itemJsonFields));
});

app.get('/api/items/:id', (req, res) => {
  const item = decodeRow(db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(req.params.id), itemJsonFields);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  res.json(item);
});

app.put('/api/items/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Item not found' });
  const item = itemPayload({ ...decodeRow(existing, itemJsonFields), ...req.body, id: req.params.id }, existing);
  db.prepare(`UPDATE inventory_items SET
    name=@name, base_type=@base_type, category=@category, tags=@tags, attributes=@attributes, quantity=@quantity, units=@units,
    dimensions=@dimensions, material_composition=@material_composition, condition=@condition, location_id=@location_id, notes=@notes,
    photos=@photos, source_origin=@source_origin, tested_status=@tested_status, confidence_level=@confidence_level, salvage_status=@salvage_status,
    date_added=@date_added, updated_at=@updated_at WHERE id=@id`).run(pick(item, [
      'id', 'name', 'base_type', 'category', 'tags', 'attributes', 'quantity', 'units', 'dimensions', 'material_composition', 'condition',
      'location_id', 'notes', 'photos', 'source_origin', 'tested_status', 'confidence_level', 'salvage_status', 'date_added', 'updated_at'
    ]));
  refreshTagRegistry();
  res.json(decodeRow(item, itemJsonFields));
});

app.delete('/api/items/:id', (req, res) => {
  db.prepare('DELETE FROM inventory_items WHERE id = ?').run(req.params.id);
  refreshTagRegistry();
  res.status(204).end();
});

app.get('/api/tags', (req, res) => {
  res.json(allTags());
});

app.post('/api/tags', (req, res) => {
  const name = String(req.body?.name || '').trim();
  const normalized = normalizeTag(name);
  if (!normalized) return res.status(400).json({ error: 'Tag name is required' });
  const now = nowIso();
  db.prepare(`INSERT INTO tags (id, name, normalized_name, use_count, created_at, updated_at)
    VALUES (@id, @name, @normalized_name, 0, @created_at, @updated_at)
    ON CONFLICT(normalized_name) DO UPDATE SET name=@name, updated_at=@updated_at`).run({
    id: makeId('tag'),
    name,
    normalized_name: normalized,
    created_at: now,
    updated_at: now
  });
  res.status(201).json(db.prepare('SELECT * FROM tags WHERE normalized_name = ?').get(normalized));
});

app.get('/api/locations', (req, res) => {
  const paths = locationPaths();
  res.json(allLocations().map((location) => ({ ...location, path: paths[location.id] })));
});

app.post('/api/locations', (req, res) => {
  const location = locationPayload(req.body);
  db.prepare(`INSERT INTO locations (id, name, code, type, parent_id, notes, created_at, updated_at)
    VALUES (@id, @name, @code, @type, @parent_id, @notes, @created_at, @updated_at)`).run(location);
  res.status(201).json(location);
});

app.put('/api/locations/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM locations WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Location not found' });
  const location = locationPayload({ ...existing, ...req.body, id: req.params.id }, existing);
  db.prepare(`UPDATE locations SET name=@name, code=@code, type=@type, parent_id=@parent_id, notes=@notes, updated_at=@updated_at WHERE id=@id`)
    .run(pick(location, ['id', 'name', 'code', 'type', 'parent_id', 'notes', 'updated_at']));
  res.json(location);
});

app.delete('/api/locations/:id', (req, res) => {
  db.prepare('DELETE FROM locations WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

app.get('/api/capabilities', (req, res) => {
  res.json(db.prepare('SELECT * FROM capability_upgrades ORDER BY updated_at DESC').all().map((row) => decodeRow(row, capabilityJsonFields)));
});

app.post('/api/capabilities', (req, res) => {
  const capability = capabilityPayload(req.body);
  db.prepare(`INSERT INTO capability_upgrades (id, name, estimated_cost, capabilities_unlocked, related_item_ids, priority, status, notes, created_at, updated_at)
    VALUES (@id, @name, @estimated_cost, @capabilities_unlocked, @related_item_ids, @priority, @status, @notes, @created_at, @updated_at)`).run(capability);
  res.status(201).json(decodeRow(capability, capabilityJsonFields));
});

app.put('/api/capabilities/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM capability_upgrades WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Capability not found' });
  const capability = capabilityPayload({ ...decodeRow(existing, capabilityJsonFields), ...req.body, id: req.params.id }, existing);
  db.prepare(`UPDATE capability_upgrades SET name=@name, estimated_cost=@estimated_cost, capabilities_unlocked=@capabilities_unlocked, related_item_ids=@related_item_ids,
    priority=@priority, status=@status, notes=@notes, updated_at=@updated_at WHERE id=@id`)
    .run(pick(capability, ['id', 'name', 'estimated_cost', 'capabilities_unlocked', 'related_item_ids', 'priority', 'status', 'notes', 'updated_at']));
  res.json(decodeRow(capability, capabilityJsonFields));
});

app.delete('/api/capabilities/:id', (req, res) => {
  db.prepare('DELETE FROM capability_upgrades WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

app.get('/api/export', (req, res) => {
  res.json({
    exported_at: nowIso(),
    app: 'garage-lab-inventory',
    schema_version: 2,
    inventory_items: listItems(),
    locations: allLocations(),
    tags: allTags(),
    capability_upgrades: db.prepare('SELECT * FROM capability_upgrades ORDER BY name COLLATE NOCASE').all().map((row) => decodeRow(row, capabilityJsonFields))
  });
});

app.post('/api/import', (req, res) => {
  const payload = req.body || {};
  const locations = payload.locations || [];
  const items = payload.inventory_items || [];
  const capabilities = payload.capability_upgrades || [];
  const tags = payload.tags || [];

  const insertLocation = db.prepare(`INSERT OR REPLACE INTO locations (id, name, code, type, parent_id, notes, created_at, updated_at)
    VALUES (@id, @name, @code, @type, @parent_id, @notes, @created_at, @updated_at)`);
  const insertItem = db.prepare(`INSERT OR REPLACE INTO inventory_items
    (id, name, base_type, category, tags, attributes, quantity, units, dimensions, material_composition, condition, location_id, notes, photos, source_origin, tested_status, confidence_level, salvage_status, date_added, created_at, updated_at)
    VALUES (@id, @name, @base_type, @category, @tags, @attributes, @quantity, @units, @dimensions, @material_composition, @condition, @location_id, @notes, @photos, @source_origin, @tested_status, @confidence_level, @salvage_status, @date_added, @created_at, @updated_at)`);
  const insertCapability = db.prepare(`INSERT OR REPLACE INTO capability_upgrades (id, name, estimated_cost, capabilities_unlocked, related_item_ids, priority, status, notes, created_at, updated_at)
    VALUES (@id, @name, @estimated_cost, @capabilities_unlocked, @related_item_ids, @priority, @status, @notes, @created_at, @updated_at)`);
  const insertTag = db.prepare(`INSERT OR REPLACE INTO tags (id, name, normalized_name, use_count, created_at, updated_at)
    VALUES (@id, @name, @normalized_name, @use_count, @created_at, @updated_at)`);

  db.exec('BEGIN');
  try {
    locations.forEach((location) => insertLocation.run(locationPayload(location, location)));
    items.forEach((item) => insertItem.run(itemPayload(item, item)));
    capabilities.forEach((capability) => insertCapability.run(capabilityPayload(capability, capability)));
    tags.forEach((tag) => {
      const name = String(tag.name || '').trim();
      const normalized = normalizeTag(tag.normalized_name || name);
      if (!name || !normalized) return;
      insertTag.run({
        id: tag.id || makeId('tag'),
        name,
        normalized_name: normalized,
        use_count: Number(tag.use_count || 0),
        created_at: tag.created_at || nowIso(),
        updated_at: nowIso()
      });
    });
    db.exec('COMMIT');
    refreshTagRegistry();
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }

  res.json({ imported: { locations: locations.length, inventory_items: items.length, capability_upgrades: capabilities.length, tags: tags.length } });
});

app.use(express.static(distDir));
app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
  res.sendFile(path.join(distDir, 'index.html'));
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: error.message || 'Unexpected server error' });
});

app.listen(port, host, () => {
  console.log(`Garage inventory API listening on http://${host}:${port}`);
});
