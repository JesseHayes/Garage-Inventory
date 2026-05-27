export function splitList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizeTag(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function cleanTagList(value) {
  const seen = new Set();
  return splitList(value).filter((tag) => {
    const normalized = normalizeTag(tag);
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

export function listToText(value) {
  return Array.isArray(value) ? value.join(', ') : '';
}

function parseAttributeValue(value) {
  if (value && typeof value === 'object') return value;
  const text = String(value ?? '').trim();
  const numeric = text.match(/^(-?\d+(?:\.\d+)?)\s*([a-zA-Z%"/-]+)?$/);
  if (numeric) {
    return {
      value: Number(numeric[1]),
      unit: numeric[2] || ''
    };
  }
  return text;
}

export function parseObjectText(value) {
  const text = String(value || '').trim();
  if (!text) return {};
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).map(([key, val]) => [key, parseAttributeValue(val)]));
  } catch {
    return Object.fromEntries(
      text
        .split(',')
        .map((pair) => pair.split(':').map((part) => part.trim()))
        .filter(([key, val]) => key && val)
        .map(([key, val]) => [key, parseAttributeValue(val)])
    );
  }
}

function attributeValueToText(value) {
  if (value && typeof value === 'object' && 'value' in value) {
    return [value.value, value.unit].filter((part) => part !== '').join(' ');
  }
  if (value && typeof value === 'object') return JSON.stringify(value);
  return String(value ?? '');
}

export function objectToText(value) {
  if (!value || typeof value !== 'object') return '';
  return Object.entries(value)
    .map(([key, val]) => `${key}: ${attributeValueToText(val)}`)
    .join(', ');
}

export function itemHaystack(item) {
  return [
    item.name,
    item.category,
    item.in_stock ? 'in stock' : 'out of stock',
    item.condition,
    item.location_path,
    item.notes,
    item.source_origin,
    item.tested_status,
    item.confidence_level,
    item.salvage_status,
    JSON.stringify(item.tags || []),
    JSON.stringify(item.attributes || {}),
    JSON.stringify(item.dimensions || {}),
    JSON.stringify(item.material_composition || [])
  ]
    .join(' ')
    .toLowerCase();
}
