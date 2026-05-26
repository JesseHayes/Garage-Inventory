import { browserStoreApi } from './browserStore.js';

const USE_BROWSER_STORE = import.meta.env.VITE_STORAGE_MODE === 'browser';
const API_BASE = import.meta.env.DEV
  ? '/api'
  : window.location.port === '4173'
    ? `${window.location.protocol}//${window.location.hostname}:3107/api`
    : '/api';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || 'Request failed');
  }
  if (response.status === 204) return null;
  return response.json();
}

export const api = {
  items: () => USE_BROWSER_STORE ? browserStoreApi.items() : request('/items'),
  createItem: (payload) => USE_BROWSER_STORE ? browserStoreApi.createItem(payload) : request('/items', { method: 'POST', body: JSON.stringify(payload) }),
  updateItem: (id, payload) => USE_BROWSER_STORE ? browserStoreApi.updateItem(id, payload) : request(`/items/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteItem: (id) => USE_BROWSER_STORE ? browserStoreApi.deleteItem(id) : request(`/items/${id}`, { method: 'DELETE' }),
  locations: () => USE_BROWSER_STORE ? browserStoreApi.locations() : request('/locations'),
  createLocation: (payload) => USE_BROWSER_STORE ? browserStoreApi.createLocation(payload) : request('/locations', { method: 'POST', body: JSON.stringify(payload) }),
  deleteLocation: (id) => USE_BROWSER_STORE ? browserStoreApi.deleteLocation(id) : request(`/locations/${id}`, { method: 'DELETE' }),
  capabilities: () => USE_BROWSER_STORE ? browserStoreApi.capabilities() : request('/capabilities'),
  createCapability: (payload) => USE_BROWSER_STORE ? browserStoreApi.createCapability(payload) : request('/capabilities', { method: 'POST', body: JSON.stringify(payload) }),
  updateCapability: (id, payload) => USE_BROWSER_STORE ? browserStoreApi.updateCapability(id, payload) : request(`/capabilities/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteCapability: (id) => USE_BROWSER_STORE ? browserStoreApi.deleteCapability(id) : request(`/capabilities/${id}`, { method: 'DELETE' }),
  tags: () => USE_BROWSER_STORE ? browserStoreApi.tags() : request('/tags'),
  createTag: (payload) => USE_BROWSER_STORE ? browserStoreApi.createTag(payload) : request('/tags', { method: 'POST', body: JSON.stringify(payload) }),
  exportAll: () => USE_BROWSER_STORE ? browserStoreApi.exportAll() : request('/export'),
  importAll: (payload) => USE_BROWSER_STORE ? browserStoreApi.importAll(payload) : request('/import', { method: 'POST', body: JSON.stringify(payload) })
};
