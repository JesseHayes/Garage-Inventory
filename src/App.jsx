import { useCallback, useEffect, useMemo, useState } from 'react';
import { Boxes, Database, FolderKanban, Hammer, LogOut, Map, Search, Tags, Wrench } from 'lucide-react';
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
import CategoryOverview from './components/CategoryOverview.jsx';
import ProjectsTracker from './components/ProjectsTracker.jsx';

const pages = [
  { id: 'inventory', label: 'Inventory', icon: Boxes },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'tags', label: 'Tags', icon: Tags },
  { id: 'storage', label: 'Storage', icon: Map },
  { id: 'capabilities', label: 'Capabilities', icon: Hammer },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'export', label: 'JSON', icon: Database }
];

export default function App() {
  const [page, setPage] = useState('inventory');
  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [capabilities, setCapabilities] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tags, setTags] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [selectedCapabilityId, setSelectedCapabilityId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [session, setSession] = useState(() => api.auth.session());
  const [queueStatus, setQueueStatus] = useState(() => api.queueStatus());

  const loadAll = useCallback(async () => {
    try {
      const snapshot = await api.loadAll();
      setItems(snapshot.items);
      setLocations(snapshot.locations);
      setCapabilities(snapshot.capabilities);
      setProjects(snapshot.projects);
      setTags(snapshot.tags);
      setSelectedId((current) => current || snapshot.items[0]?.id || '');
      setSelectedCapabilityId((current) => current || snapshot.capabilities[0]?.id || '');
      setSelectedProjectId((current) => current || snapshot.projects[0]?.id || '');
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

  const categories = useMemo(() => {
    const counts = new window.Map();
    for (const item of items) {
      const category = item.category || 'Uncategorized';
      counts.set(category, (counts.get(category) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  const categoryNames = useMemo(() => categories.map((category) => category.name), [categories]);

  const filteredItems = useMemo(() => {
    const categoryScoped = selectedCategory ? items.filter((item) => (item.category || 'Uncategorized') === selectedCategory) : items;
    const terms = query
      .toLowerCase()
      .split(/\s+/)
      .map((term) => term.trim())
      .filter(Boolean);
    if (!terms.length) return categoryScoped;
    return categoryScoped.filter((item) => {
      const haystack = itemHaystack(item);
      return terms.every((term) => haystack.includes(term));
    });
  }, [items, query, selectedCategory]);

  const selectedItem = items.find((item) => item.id === selectedId);

  async function createItem(payload) {
    const item = await api.createItem(payload);
    setItems((current) => [item, ...current.filter((existing) => existing.id !== item.id)]);
    setSelectedId(item.id);
    setSelectedCategory(item.category || 'Uncategorized');
    setMobileDetailOpen(true);
  }

  async function updateItem(id, payload) {
    const item = await api.updateItem(id, payload);
    setItems((current) => current.map((existing) => (existing.id === id ? { ...existing, ...item } : existing)));
    setSelectedId(id);
  }

  async function deleteItem(id) {
    await api.deleteItem(id);
    setItems((current) => current.filter((item) => item.id !== id));
    setSelectedId('');
    setMobileDetailOpen(false);
  }

  async function createLocation(payload) {
    const location = await api.createLocation(payload);
    setLocations((current) => [...current, location]);
  }

  async function deleteLocation(id) {
    await api.deleteLocation(id);
    setLocations((current) => current.filter((location) => location.id !== id));
  }

  async function createCapability(payload) {
    const created = await api.createCapability(payload);
    setCapabilities((current) => [created, ...current.filter((capability) => capability.id !== created.id)]);
    setSelectedCapabilityId(created.id);
    return created;
  }

  async function updateCapability(id, payload) {
    const updated = await api.updateCapability(id, payload);
    setCapabilities((current) => current.map((capability) => (capability.id === id ? { ...capability, ...updated } : capability)));
  }

  async function deleteCapability(id) {
    await api.deleteCapability(id);
    setCapabilities((current) => current.filter((capability) => capability.id !== id));
    setSelectedCapabilityId('');
  }

  async function createTag(name) {
    const tag = await api.createTag({ name });
    setTags((current) => [tag, ...current.filter((existing) => existing.normalized_name !== tag.normalized_name)]);
  }

  async function createProject(payload) {
    const created = await api.createProject(payload);
    setProjects((current) => [created, ...current.filter((project) => project.id !== created.id)]);
    setSelectedProjectId(created.id);
    return created;
  }

  async function updateProject(id, payload) {
    const updated = await api.updateProject(id, payload);
    setProjects((current) => current.map((project) => (project.id === id ? { ...project, ...updated } : project)));
  }

  async function deleteProject(id) {
    await api.deleteProject(id);
    setProjects((current) => current.filter((project) => project.id !== id));
    setSelectedProjectId('');
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
    setProjects([]);
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
          <button
            className={queueStatus.online ? 'sync-chip' : 'sync-chip offline'}
            type="button"
            onClick={syncNow}
            title={
              queueStatus.pending
                ? `${queueStatus.pending} local change${queueStatus.pending === 1 ? '' : 's'} waiting to sync with Supabase.`
                : queueStatus.online
                  ? 'All local changes are synced with Supabase.'
                  : 'Offline. New edits will be queued on this device.'
            }
          >
            {queueStatus.pending ? `${queueStatus.pending} pending sync` : queueStatus.online ? 'Synced' : 'Offline'}
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
          <QuickAddForm locations={locations} tags={tags} categories={categoryNames} onCreate={createItem} />
          {!selectedCategory ? (
            <CategoryOverview categories={categories} onSelect={setSelectedCategory} />
          ) : (
            <InventoryList
              items={filteredItems}
              selectedId={selectedId}
              onSelect={(id) => {
                setSelectedId(id);
                setMobileDetailOpen(true);
              }}
              query={query}
              onQuery={setQuery}
              onTagClick={setQuery}
              title={selectedCategory}
              onBack={() => setSelectedCategory('')}
            />
          )}
          <div className={mobileDetailOpen ? 'mobile-detail-open' : ''}>
            <ItemDetail
              item={selectedItem}
              locations={locations}
              tags={tags}
              categories={categoryNames}
              onSave={updateItem}
              onDelete={deleteItem}
              onClose={() => setMobileDetailOpen(false)}
            />
          </div>
        </main>
      )}

      {page === 'search' && (
        <main>
          <SearchView items={items} categories={categoryNames} tags={tags} selectedId={selectedId} onSelect={setSelectedId} />
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

      {page === 'projects' && (
        <main>
          <ProjectsTracker
            projects={projects}
            items={items}
            tags={tags}
            selectedId={selectedProjectId}
            onSelect={setSelectedProjectId}
            onCreate={createProject}
            onUpdate={updateProject}
            onDelete={deleteProject}
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
