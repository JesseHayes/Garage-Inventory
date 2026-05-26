const STORAGE_KEY = 'garage-lab-inventory:v2';

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
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

function defaultStore() {
  return {
    schema_version: 2,
    inventory_items: [],
    locations: [],
    tags: [],
    capability_upgrades: []
  };
}

function readStore() {
  try {
    return { ...defaultStore(), ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') };
  } catch {
    return defaultStore();
  }
}

function writeStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

async function ensureStore() {
  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing) return readStore();
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}seed-data.json`);
    if (response.ok) {
      const seed = await response.json();
      const seeded = {
        ...defaultStore(),
        ...seed,
        inventory_items: seed.inventory_items || [],
        locations: seed.locations || [],
        tags: seed.tags || [],
        capability_upgrades: seed.capability_upgrades || []
      };
      writeStore(seeded);
      return seeded;
    }
  } catch {
    // Empty store is fine; JSON import can populate later.
  }
  const empty = defaultStore();
  writeStore(empty);
  return empty;
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

function refreshTags(store) {
  const counts = new Map();
  for (const item of store.inventory_items) {
    for (const tag of cleanTags(item.tags || [])) {
      const normalized = normalizeTag(tag);
      const current = counts.get(normalized) || { name: tag, count: 0 };
      current.count += 1;
      if (tag.length > current.name.length) current.name = tag;
      counts.set(normalized, current);
    }
  }
  const existingByNormalized = new Map((store.tags || []).map((tag) => [tag.normalized_name, tag]));
  store.tags = Array.from(counts.entries())
    .map(([normalized, value]) => ({
      id: existingByNormalized.get(normalized)?.id || makeId('tag'),
      name: value.name,
      normalized_name: normalized,
      use_count: value.count,
      created_at: existingByNormalized.get(normalized)?.created_at || nowIso(),
      updated_at: nowIso()
    }))
    .sort((a, b) => b.use_count - a.use_count || a.name.localeCompare(b.name));
  return store;
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
    photos: body.photos || [],
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

async function mutate(fn) {
  const store = await ensureStore();
  const result = fn(store);
  refreshTags(store);
  writeStore(store);
  return result;
}

export const browserStoreApi = {
  async items() {
    const store = await ensureStore();
    return withLocationPaths(store.inventory_items, store.locations).sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  },
  async createItem(payload) {
    return mutate((store) => {
      const item = itemPayload(payload);
      store.inventory_items.unshift(item);
      return item;
    });
  },
  async updateItem(id, payload) {
    return mutate((store) => {
      const index = store.inventory_items.findIndex((item) => item.id === id);
      if (index < 0) throw new Error('Item not found');
      const item = itemPayload({ ...store.inventory_items[index], ...payload, id }, store.inventory_items[index]);
      store.inventory_items[index] = item;
      return item;
    });
  },
  async deleteItem(id) {
    return mutate((store) => {
      store.inventory_items = store.inventory_items.filter((item) => item.id !== id);
      return null;
    });
  },
  async locations() {
    const store = await ensureStore();
    const paths = locationPaths(store.locations);
    return [...store.locations].sort((a, b) => a.name.localeCompare(b.name)).map((location) => ({ ...location, path: paths[location.id] }));
  },
  async createLocation(payload) {
    return mutate((store) => {
      const location = locationPayload(payload);
      store.locations.push(location);
      return location;
    });
  },
  async deleteLocation(id) {
    return mutate((store) => {
      store.locations = store.locations.filter((location) => location.id !== id);
      store.inventory_items = store.inventory_items.map((item) => (item.location_id === id ? { ...item, location_id: null } : item));
      return null;
    });
  },
  async capabilities() {
    const store = await ensureStore();
    return [...store.capability_upgrades].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  },
  async createCapability(payload) {
    return mutate((store) => {
      const capability = capabilityPayload(payload);
      store.capability_upgrades.unshift(capability);
      return capability;
    });
  },
  async updateCapability(id, payload) {
    return mutate((store) => {
      const index = store.capability_upgrades.findIndex((capability) => capability.id === id);
      if (index < 0) throw new Error('Capability not found');
      const capability = capabilityPayload({ ...store.capability_upgrades[index], ...payload, id }, store.capability_upgrades[index]);
      store.capability_upgrades[index] = capability;
      return capability;
    });
  },
  async deleteCapability(id) {
    return mutate((store) => {
      store.capability_upgrades = store.capability_upgrades.filter((capability) => capability.id !== id);
      return null;
    });
  },
  async tags() {
    const store = await ensureStore();
    refreshTags(store);
    writeStore(store);
    return store.tags;
  },
  async createTag(payload) {
    return mutate((store) => {
      const name = String(payload.name || '').trim();
      const normalized = normalizeTag(name);
      if (!normalized) throw new Error('Tag name is required');
      const existing = store.tags.find((tag) => tag.normalized_name === normalized);
      if (existing) {
        existing.name = name;
        existing.updated_at = nowIso();
        return existing;
      }
      const tag = {
        id: makeId('tag'),
        name,
        normalized_name: normalized,
        use_count: 0,
        created_at: nowIso(),
        updated_at: nowIso()
      };
      store.tags.push(tag);
      return tag;
    });
  },
  async exportAll() {
    const store = await ensureStore();
    refreshTags(store);
    writeStore(store);
    return {
      exported_at: nowIso(),
      app: 'garage-lab-inventory',
      storage_mode: 'browser',
      schema_version: 2,
      inventory_items: withLocationPaths(store.inventory_items, store.locations),
      locations: store.locations,
      tags: store.tags,
      capability_upgrades: store.capability_upgrades
    };
  },
  async importAll(payload) {
    const next = {
      ...defaultStore(),
      inventory_items: payload.inventory_items || [],
      locations: payload.locations || [],
      tags: payload.tags || [],
      capability_upgrades: payload.capability_upgrades || []
    };
    refreshTags(next);
    writeStore(next);
    return {
      imported: {
        inventory_items: next.inventory_items.length,
        locations: next.locations.length,
        capability_upgrades: next.capability_upgrades.length,
        tags: next.tags.length
      }
    };
  }
};
