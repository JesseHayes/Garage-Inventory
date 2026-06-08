import { Plus, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { seededElectronicsStock } from '../lib/electronicsDefaults.js';

const salvagedCategory = 'Salvaged Components';

function emptySalvageDraft() {
  return { part_number: '', description: '', source_appliance: '', notes: '', photo: '', in_stock: true };
}

function searchableText(component) {
  return [component.part_number, component.description, component.source_appliance, component.notes].filter(Boolean).join(' ').toLowerCase();
}

export default function ElectronicsInventory({ stock, salvagedComponents = [], onSave }) {
  const seededStock = useMemo(() => seededElectronicsStock(stock), [stock]);
  const componentTypes = useMemo(() => [...Object.keys(seededStock).sort((a, b) => a.localeCompare(b)), salvagedCategory], [seededStock]);
  const [selectedType, setSelectedType] = useState('Resistors');
  const [query, setQuery] = useState('');
  const [salvageQuery, setSalvageQuery] = useState('');
  const [draft, setDraft] = useState(emptySalvageDraft());
  const [message, setMessage] = useState('');

  const visibleType = componentTypes.includes(selectedType) ? selectedType : componentTypes[0] || salvagedCategory;
  const isSalvage = visibleType === salvagedCategory;
  const entries = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return Object.entries(seededStock[visibleType] || {}).filter(([value]) => !needle || value.toLowerCase().includes(needle));
  }, [query, seededStock, visibleType]);
  const visibleSalvaged = useMemo(() => {
    const needle = salvageQuery.trim().toLowerCase();
    if (!needle) return salvagedComponents;
    return salvagedComponents.filter((component) => searchableText(component).includes(needle));
  }, [salvageQuery, salvagedComponents]);

  async function saveStock(nextStock, nextSalvage = salvagedComponents) {
    try {
      await onSave({ stock: nextStock, salvaged_components: nextSalvage });
      setMessage('Saved.');
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function setStockValue(type, value, inStock) {
    const nextStock = {
      ...seededStock,
      [type]: {
        ...(seededStock[type] || {}),
        [value]: inStock
      }
    };
    await saveStock(nextStock);
  }

  async function addValue(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = String(form.get('value') || '').trim();
    if (!value || isSalvage) return;
    await setStockValue(visibleType, value, true);
    event.currentTarget.reset();
  }

  async function addSalvaged(event) {
    event.preventDefault();
    if (!draft.part_number.trim() && !draft.description.trim()) {
      setMessage('Part number or description is required.');
      return;
    }
    const nextSalvage = [{ id: crypto.randomUUID(), ...draft }, ...salvagedComponents];
    await saveStock(seededStock, nextSalvage);
    setDraft(emptySalvageDraft());
  }

  async function updateSalvaged(id, inStock) {
    const nextSalvage = salvagedComponents.map((component) => (component.id === id ? { ...component, in_stock: inStock } : component));
    await saveStock(seededStock, nextSalvage);
  }

  async function deleteSalvaged(id) {
    if (!window.confirm('Delete component?')) return;
    await saveStock(seededStock, salvagedComponents.filter((component) => component.id !== id));
  }

  return (
    <section className="electronics-layout">
      <aside className="panel electronics-types">
        <div className="panel-title">Electronics</div>
        <div className="electronics-type-list">
          {componentTypes.map((type) => {
            const values = type === salvagedCategory ? salvagedComponents.map((component) => component.in_stock) : Object.values(seededStock[type] || {});
            const inStockCount = values.filter(Boolean).length;
            return (
              <button className={visibleType === type ? 'category-card selected' : 'category-card'} type="button" key={type} onClick={() => setSelectedType(type)}>
                <strong>{type}</strong>
                <span>{inStockCount} in stock / {values.length} values</span>
              </button>
            );
          })}
        </div>
      </aside>

      {isSalvage ? (
        <section className="panel main-panel electronics-values">
          <div className="panel-head">
            <div>
              <h2>Salvaged Components</h2>
              <p>Searchable harvested electronics, appliance pulls, unknown parts, and one-off modules.</p>
            </div>
            <label className="table-search">
              <Search size={16} />
              <input value={salvageQuery} onChange={(event) => setSalvageQuery(event.target.value)} placeholder="Search salvaged parts" />
            </label>
          </div>

          <form className="salvage-form" onSubmit={addSalvaged}>
            <div className="two-col">
              <label>
                Part Number
                <input value={draft.part_number} onChange={(event) => setDraft((current) => ({ ...current, part_number: event.target.value }))} placeholder="Unknown IC, LM358, relay board" />
              </label>
              <label>
                Source Appliance
                <input value={draft.source_appliance} onChange={(event) => setDraft((current) => ({ ...current, source_appliance: event.target.value }))} />
              </label>
            </div>
            <label>
              Description
              <input value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} />
            </label>
            <label>
              Photo Reference
              <input value={draft.photo} onChange={(event) => setDraft((current) => ({ ...current, photo: event.target.value }))} placeholder="Filename or note, no upload yet" />
            </label>
            <label>
              Notes
              <textarea rows="3" value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} />
            </label>
            <div className="button-row">
              <label className="toggle-row">
                <input type="checkbox" checked={draft.in_stock} onChange={(event) => setDraft((current) => ({ ...current, in_stock: event.target.checked }))} />
                In Stock
              </label>
              <button className="primary" type="submit">
                <Plus size={16} />
                Add Salvaged Component
              </button>
            </div>
          </form>

          <div className="salvage-list">
            {visibleSalvaged.map((component) => (
              <article className="salvage-card" key={component.id}>
                <div className="salvage-main">
                  <h3>{component.part_number || 'Unknown component'}</h3>
                  <p>{component.description || component.notes}</p>
                  <span>{component.source_appliance || 'No source recorded'}</span>
                  {component.notes && <p>{component.notes}</p>}
                </div>
                <div className="salvage-actions">
                  <span className={component.in_stock ? 'stock-state in' : 'stock-state out'}>{component.in_stock ? 'In Stock' : 'Out of Stock'}</span>
                  <button className="secondary" type="button" onClick={() => updateSalvaged(component.id, !component.in_stock)}>
                    Toggle
                  </button>
                  <button className="danger" type="button" onClick={() => deleteSalvaged(component.id)}>
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </article>
            ))}
            {!visibleSalvaged.length && <p className="empty-cell">No salvaged components match the current filter.</p>}
          </div>
          {message && <p className="status-line">{message}</p>}
        </section>
      ) : (
        <section className="panel main-panel electronics-values">
          <div className="panel-head">
            <div>
              <h2>{visibleType}</h2>
              <p>Track common components as value availability, not inventory rows.</p>
            </div>
            <label className="table-search">
              <Search size={16} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter values" />
            </label>
          </div>

          <form className="filter-row" onSubmit={addValue}>
            <input name="value" placeholder={`Add value to ${visibleType}`} />
            <button className="secondary" type="submit">
              <Plus size={16} />
              Add Value
            </button>
          </form>

          <div className="component-grid">
            {entries.map(([value, inStock]) => (
              <div className="component-row" key={value}>
                <button className="secondary stock-button" type="button" onClick={() => setStockValue(visibleType, value, false)}>-</button>
                <strong title={value}>{value}</strong>
                <span className={inStock ? 'stock-state in' : 'stock-state out'}>{inStock ? 'In Stock' : 'Out of Stock'}</span>
                <button className="primary stock-button" type="button" onClick={() => setStockValue(visibleType, value, true)}>+</button>
              </div>
            ))}
          </div>
          {message && <p className="status-line">{message}</p>}
        </section>
      )}
    </section>
  );
}
