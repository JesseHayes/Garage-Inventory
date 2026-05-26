import { authApi, authHeaders, readSession, SUPABASE_REST_URL } from './supabaseClient.js';

const CACHE_KEY = 'garage-lab:supabase-cache:v1';
const QUEUE_KEY = 'garage-lab:sync-queue:v1';

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function readCache() {
  return {
    items: [],
    locations: [],
    tags: [],
    capabilities: [],
    ...readJson(CACHE_KEY, {})
  };
}

function writeCache(cache) {
  writeJson(CACHE_KEY, cache);
}

function readQueue() {
  return readJson(QUEUE_KEY, []);
}

function writeQueue(queue) {
  writeJson(QUEUE_KEY, queue);
  window.dispatchEvent(new CustomEvent('garage-sync-queue', { detail: queue.length }));
}

function enqueue(operation) {
  const queue = readQueue();
  queue.push({
    id: makeId('queue'),
    created_at: nowIso(),
    ...operation
  });
  writeQueue(queue);
}

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

function locationPaths(locations) {
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

function withLocationPaths(items, locations) {
  const paths = locationPaths(locations);
  return items.map((item) => ({
    ...item,
    location_path: item.location_id ? paths[item.location_id] || '' : ''
  }));
}

function refreshTagCache(cache) {
  const counts = new Map();
  for (const item of cache.items) {
    for (const tag of cleanTags(item.tags || [])) {
      const normalized = normalizeTag(tag);
      const current = counts.get(normalized) || { name: tag, count: 0 };
      current.count += 1;
      if (tag.length > current.name.length) current.name = tag;
      counts.set(normalized, current);
    }
  }
  cache.tags = Array.from(counts.entries())
    .map(([normalized, tag]) => ({
      id: normalized,
      name: tag.name,
      normalized_name: normalized,
      use_count: tag.count
    }))
    .sort((a, b) => b.use_count - a.use_count || a.name.localeCompare(b.name));
  return cache;
}

function itemPayload(body, existing = {}) {
  const now = nowIso();
  return {
    id: existing.id || body.id || makeId('item'),
    name: body.name?.trim() || 'Unknown object',
    base_type: body.base_type || 'unknown',
    category: body.category || '',
    tags: cleanTags(body.tags || []),
    attributes: body.attributes || {},
    quantity: Number(body.quantity ?? 1),
    units: body.units || 'each',
    dimensions: body.dimensions || {},
    material_composition: body.material_composition || [],
    condition: body.condition || 'unknown',
    location_id: body.location_id || null,
    notes: body.notes || '',
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
    capabilities_unlocked: body.capabilities_unlocked || [],
    related_item_ids: body.related_item_ids || [],
    priority: body.priority || 'medium',
    status: body.status || 'desired',
    notes: body.notes || '',
    created_at: existing.created_at || now,
    updated_at: now
  };
}

async function supabaseFetch(table, options = {}) {
  const session = readSession();
  if (!session?.access_token) throw new Error('Please sign in.');
  const response = await fetch(`${SUPABASE_REST_URL}/${table}${options.query || ''}`, {
    headers: {
      ...authHeaders(session),
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(options.headers || {})
    },
    method: options.method || 'GET',
    body: options.body == null ? undefined : JSON.stringify(options.body)
  });
  if (response.status === 401) {
    await authApi.refresh();
    return supabaseFetch(table, options);
  }
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(payload?.message || payload?.hint || response.statusText);
  return payload;
}

async function fetchAll(table, order = 'updated_at.desc') {
  return supabaseFetch(table, { query: `?select=*&order=${order}` });
}

async function tryOnline(action, offlineAction) {
  if (!navigator.onLine) return offlineAction();
  try {
    return await action();
  } catch (error) {
    if (error.message === 'Please sign in.') throw error;
    return offlineAction(error);
  }
}

async function loadAllOnline() {
  const [items, locations, tags, capabilities] = await Promise.all([
    fetchAll('inventory_items'),
    fetchAll('locations', 'name.asc'),
    fetchAll('tags', 'use_count.desc'),
    fetchAll('capability_upgrades')
  ]);
  const cache = {
    items: items || [],
    locations: locations || [],
    tags: tags || [],
    capabilities: capabilities || []
  };
  writeCache(cache);
  return cache;
}

async function flushQueue() {
  if (!navigator.onLine || !readSession()?.access_token) return { flushed: 0, remaining: readQueue().length };
  const queue = readQueue();
  const remaining = [];
  let flushed = 0;
  for (const operation of queue) {
    try {
      await supabaseFetch(operation.table, {
        method: operation.method,
        query: operation.query || '',
        body: operation.body,
        headers: operation.headers || {}
      });
      flushed += 1;
    } catch (error) {
      remaining.push({ ...operation, last_error: error.message });
    }
  }
  writeQueue(remaining);
  if (flushed) await loadAllOnline();
  return { flushed, remaining: remaining.length };
}

function upsertCache(collection, row) {
  const cache = readCache();
  const list = cache[collection] || [];
  const index = list.findIndex((item) => item.id === row.id);
  if (index >= 0) list[index] = row;
  else list.unshift(row);
  cache[collection] = list;
  refreshTagCache(cache);
  writeCache(cache);
}

function deleteFromCache(collection, id) {
  const cache = readCache();
  cache[collection] = (cache[collection] || []).filter((item) => item.id !== id);
  refreshTagCache(cache);
  writeCache(cache);
}

async function upsert(table, collection, row) {
  upsertCache(collection, row);
  return tryOnline(
    async () => {
      const result = await supabaseFetch(table, {
        method: 'POST',
        query: '?on_conflict=id',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: row
      });
      await loadAllOnline();
      return result?.[0] || row;
    },
    () => {
      enqueue({
        table,
        method: 'POST',
        query: '?on_conflict=id',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: row
      });
      return row;
    }
  );
}

async function syncTagsFromCache() {
  const cache = readCache();
  refreshTagCache(cache);
  writeCache(cache);
  for (const tag of cache.tags) {
    await upsert('tags', 'tags', {
      id: tag.id || `tag_${tag.normalized_name}`,
      name: tag.name,
      normalized_name: tag.normalized_name,
      use_count: tag.use_count,
      created_at: tag.created_at || nowIso(),
      updated_at: nowIso()
    });
  }
}

async function remove(table, collection, id) {
  deleteFromCache(collection, id);
  return tryOnline(
    async () => {
      await supabaseFetch(table, { method: 'DELETE', query: `?id=eq.${encodeURIComponent(id)}` });
      await loadAllOnline();
      return null;
    },
    () => {
      enqueue({ table, method: 'DELETE', query: `?id=eq.${encodeURIComponent(id)}` });
      return null;
    }
  );
}

window.addEventListener('online', () => {
  flushQueue().catch(() => {});
});

export const api = {
  auth: authApi,
  queueStatus: () => ({ pending: readQueue().length, online: navigator.onLine }),
  flushQueue,
  async items() {
    const cache = await tryOnline(loadAllOnline, () => readCache());
    return withLocationPaths(cache.items, cache.locations).sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
  },
  async createItem(payload) {
    const item = await upsert('inventory_items', 'items', itemPayload(payload));
    await syncTagsFromCache();
    return item;
  },
  async updateItem(id, payload) {
    const existing = readCache().items.find((item) => item.id === id) || {};
    const item = await upsert('inventory_items', 'items', itemPayload({ ...existing, ...payload, id }, existing));
    await syncTagsFromCache();
    return item;
  },
  async deleteItem(id) {
    const result = await remove('inventory_items', 'items', id);
    await syncTagsFromCache();
    return result;
  },
  async locations() {
    const cache = await tryOnline(loadAllOnline, () => readCache());
    const paths = locationPaths(cache.locations);
    return [...cache.locations].sort((a, b) => a.name.localeCompare(b.name)).map((location) => ({ ...location, path: paths[location.id] }));
  },
  async createLocation(payload) {
    return upsert('locations', 'locations', locationPayload(payload));
  },
  async deleteLocation(id) {
    return remove('locations', 'locations', id);
  },
  async capabilities() {
    const cache = await tryOnline(loadAllOnline, () => readCache());
    return cache.capabilities.sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
  },
  async createCapability(payload) {
    return upsert('capability_upgrades', 'capabilities', capabilityPayload(payload));
  },
  async updateCapability(id, payload) {
    const existing = readCache().capabilities.find((capability) => capability.id === id) || {};
    return upsert('capability_upgrades', 'capabilities', capabilityPayload({ ...existing, ...payload, id }, existing));
  },
  async deleteCapability(id) {
    return remove('capability_upgrades', 'capabilities', id);
  },
  async tags() {
    const cache = await tryOnline(loadAllOnline, () => readCache());
    refreshTagCache(cache);
    writeCache(cache);
    return cache.tags;
  },
  async createTag(payload) {
    const now = nowIso();
    const name = String(payload.name || '').trim();
    const normalized = normalizeTag(name);
    if (!normalized) throw new Error('Tag name is required');
    const tag = {
      id: `tag_${normalized}`,
      name,
      normalized_name: normalized,
      use_count: 0,
      created_at: now,
      updated_at: now
    };
    return upsert('tags', 'tags', tag);
  },
  async exportAll() {
    const cache = readCache();
    refreshTagCache(cache);
    return {
      exported_at: nowIso(),
      app: 'garage-lab-inventory',
      storage_mode: 'supabase',
      schema_version: 3,
      inventory_items: withLocationPaths(cache.items, cache.locations),
      locations: cache.locations,
      tags: cache.tags,
      capability_upgrades: cache.capabilities
    };
  },
  async importAll(payload) {
    const items = payload.inventory_items || [];
    const locations = payload.locations || [];
    const capabilities = payload.capability_upgrades || [];
    const tags = payload.tags || [];
    const cache = { items, locations, capabilities, tags };
    refreshTagCache(cache);
    writeCache(cache);
    for (const location of locations) await upsert('locations', 'locations', locationPayload(location, location));
    for (const item of items) await upsert('inventory_items', 'items', itemPayload(item, item));
    for (const capability of capabilities) await upsert('capability_upgrades', 'capabilities', capabilityPayload(capability, capability));
    for (const tag of cache.tags) await upsert('tags', 'tags', tag);
    return {
      imported: {
        inventory_items: items.length,
        locations: locations.length,
        capability_upgrades: capabilities.length,
        tags: cache.tags.length
      }
    };
  }
};
