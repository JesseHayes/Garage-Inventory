CREATE TABLE IF NOT EXISTS locations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT,
  type TEXT DEFAULT 'bin',
  parent_id TEXT REFERENCES locations(id) ON DELETE SET NULL,
  notes TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  base_type TEXT DEFAULT 'unknown',
  category TEXT DEFAULT '',
  tags TEXT DEFAULT '[]',
  attributes TEXT DEFAULT '{}',
  quantity REAL DEFAULT 1,
  units TEXT DEFAULT 'each',
  dimensions TEXT DEFAULT '{}',
  material_composition TEXT DEFAULT '[]',
  condition TEXT DEFAULT 'unknown',
  location_id TEXT REFERENCES locations(id) ON DELETE SET NULL,
  notes TEXT DEFAULT '',
  photos TEXT DEFAULT '[]',
  source_origin TEXT DEFAULT '',
  tested_status TEXT DEFAULT 'not tested',
  confidence_level TEXT DEFAULT 'unknown',
  salvage_status TEXT DEFAULT 'intake',
  date_added TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL UNIQUE,
  use_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS capability_upgrades (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  estimated_cost REAL,
  capabilities_unlocked TEXT DEFAULT '[]',
  related_item_ids TEXT DEFAULT '[]',
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'desired',
  notes TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_inventory_name ON inventory_items(name);
CREATE INDEX IF NOT EXISTS idx_inventory_base_type ON inventory_items(base_type);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_inventory_location ON inventory_items(location_id);
CREATE INDEX IF NOT EXISTS idx_inventory_salvage ON inventory_items(salvage_status);
CREATE INDEX IF NOT EXISTS idx_locations_parent ON locations(parent_id);
CREATE INDEX IF NOT EXISTS idx_tags_normalized_name ON tags(normalized_name);
CREATE INDEX IF NOT EXISTS idx_tags_use_count ON tags(use_count);
