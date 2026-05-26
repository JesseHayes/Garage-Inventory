import { useCallback, useEffect, useMemo, useState } from 'react';
import { Boxes, Database, Hammer, LogOut, Map, Search, Tags, Wrench } from 'lucide-react';
import { api } from './lib/api.js';
import { itemHaystack } from './lib/format.js';
import QuickAddForm from './components/QuickAddForm.jsx';
import InventoryList from './components/InventoryList.jsx';
import ItemDetail from './components/ItemDetail.jsx';
import LocationManager from './components/LocationManager.jsx';
import CapabilityTracker from './components/CapabilityTracker.jsx';
import SearchView from './components/SearchView.jsx';
import ImportExport from './components/ImportExport.jsx';
import TagBrowser from './components/TagBrowser.jsx';
import AuthGate from './components/AuthGate.jsx';

const pages = [
  { id: 'inventory', label: 'Inventory', icon: Boxes },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'tags', label: 'Tags', icon: Tags },
  { id: 'storage', label: 'Storage', icon: Map },
  { id: 'capabilities', label: 'Capabilities', icon: Hammer },
  { id: 'export', label: 'JSON', icon: Database }
];

export default function App() {
  const [page, setPage] = useState('inventory');
  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [capabilities, setCapabilities] = useState([]);
  const [tags, setTags] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [selectedCapabilityId, setSelectedCapabilityId] = useState('');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [session, setSession] = useState(() => api.auth.session());
  const [queueStatus, setQueueStatus] = useState(() => api.queueStatus());

  const loadAll = useCallback(async () => {
    try {
      const [nextItems, nextLocations, nextCapabilities, nextTags] = await Promise.all([api.items(), api.locations(), api.capabilities(), api.tags()]);
      setItems(nextItems);
      setLocations(nextLocations);
      setCapabilities(nextCapabilities);
      setTags(nextTags);
      setSelectedId((current) => current || nextItems[0]?.id || '');
      setSelectedCapabilityId((current) => current || nextCapabilities[0]?.id || '');
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    if (session) loadAll();
  }, [loadAll, session]);

  useEffect(() => {
    function updateQueue() {
      setQueueStatus(api.queueStatus());
    }
    window.addEventListener('online', updateQueue);
    window.addEventListener('offline', updateQueue);
    window.addEventListener('garage-sync-queue', updateQueue);
    return () => {
      window.removeEventListener('online', updateQueue);
      window.removeEventListener('offline', updateQueue);
      window.removeEventListener('garage-sync-queue', updateQueue);
    };
  }, []);

  const filteredItems = useMemo(() => {
    const terms = query
      .toLowerCase()
      .split(/\s+/)
      .map((term) => term.trim())
      .filter(Boolean);
    if (!terms.length) return items;
    return items.filter((item) => {
      const haystack = itemHaystack(item);
      return terms.every((term) => haystack.includes(term));
    });
  }, [items, query]);

  const selectedItem = items.find((item) => item.id === selectedId);

  async function createItem(payload) {
    const item = await api.createItem(payload);
    await loadAll();
    setSelectedId(item.id);
  }

  async function updateItem(id, payload) {
    await api.updateItem(id, payload);
    await loadAll();
    setSelectedId(id);
  }

  async function deleteItem(id) {
    await api.deleteItem(id);
    await loadAll();
    setSelectedId('');
  }

  async function createLocation(payload) {
    await api.createLocation(payload);
    await loadAll();
  }

  async function deleteLocation(id) {
    await api.deleteLocation(id);
    await loadAll();
  }

  async function createCapability(payload) {
    const created = await api.createCapability(payload);
    await loadAll();
    setSelectedCapabilityId(created.id);
    return created;
  }

  async function updateCapability(id, payload) {
    await api.updateCapability(id, payload);
    await loadAll();
  }

  async function deleteCapability(id) {
    await api.deleteCapability(id);
    await loadAll();
    setSelectedCapabilityId('');
  }

  async function createTag(name) {
    await api.createTag({ name });
    await loadAll();
  }

  async function importAll(payload) {
    const result = await api.importAll(payload);
    await loadAll();
    return result;
  }

  async function login(email, password) {
    const nextSession = await api.auth.login(email, password);
    setSession(nextSession);
    await api.flushQueue();
    await loadAll();
  }

  async function logout() {
    await api.auth.logout();
    setSession(null);
    setItems([]);
    setLocations([]);
    setCapabilities([]);
    setTags([]);
  }

  async function syncNow() {
    const result = await api.flushQueue();
    setQueueStatus(api.queueStatus());
    await loadAll();
    setError(result.remaining ? `${result.remaining} changes still waiting to sync.` : '');
  }

  if (!session) {
    return <AuthGate onLogin={login} />;
  }

  return (
    <div className="app-shell">
      <header>
        <div className="brand">
          <Wrench size={22} />
          <div>
            <h1>Garage Lab Inventory</h1>
            <p>Materials, salvage, systems, stock, and workshop capability planning</p>
          </div>
        </div>
        <nav>
          {pages.map(({ id, label, icon: Icon }) => (
            <button key={id} className={page === id ? 'active' : ''} onClick={() => setPage(id)}>
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>
        <div className="session-tools">
          <button className={queueStatus.online ? 'sync-chip' : 'sync-chip offline'} type="button" onClick={syncNow}>
            {queueStatus.online ? 'Online' : 'Offline'}
            {queueStatus.pending ? ` · ${queueStatus.pending} queued` : ''}
          </button>
          <button className="secondary" type="button" onClick={logout}>
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </header>

      {error && <div className="error-bar">{error}</div>}

      {page === 'inventory' && (
        <main className="inventory-layout">
          <QuickAddForm locations={locations} tags={tags} onCreate={createItem} />
          <InventoryList items={filteredItems} selectedId={selectedId} onSelect={setSelectedId} query={query} onQuery={setQuery} onTagClick={setQuery} />
          <ItemDetail item={selectedItem} locations={locations} tags={tags} onSave={updateItem} onDelete={deleteItem} />
        </main>
      )}

      {page === 'search' && (
        <main>
          <SearchView items={filteredItems} query={query} onQuery={setQuery} selectedId={selectedId} onSelect={setSelectedId} />
        </main>
      )}

      {page === 'storage' && (
        <main>
          <LocationManager locations={locations} onCreate={createLocation} onDelete={deleteLocation} />
        </main>
      )}

      {page === 'tags' && (
        <main>
          <TagBrowser tags={tags} activeTag={query} onSelectTag={setQuery} onCreateTag={createTag} />
        </main>
      )}

      {page === 'capabilities' && (
        <main>
          <CapabilityTracker
            capabilities={capabilities}
            items={items}
            selectedId={selectedCapabilityId}
            onSelect={setSelectedCapabilityId}
            onCreate={createCapability}
            onUpdate={updateCapability}
            onDelete={deleteCapability}
          />
        </main>
      )}

      {page === 'export' && (
        <main>
          <ImportExport onExport={api.exportAll} onImport={importAll} />
        </main>
      )}
    </div>
  );
}
