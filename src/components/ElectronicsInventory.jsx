import { Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { seededElectronicsStock } from '../lib/electronicsDefaults.js';

function emptySalvageDraft() {
  return { part_number: '', description: '', source_appliance: '', notes: '', photo: '', in_stock: true };
}

export default function ElectronicsInventory({ stock, salvagedComponents, onSave }) {
  const seededStock = useMemo(() => seededElectronicsStock(stock), [stock]);
  const componentTypes = useMemo(() => Object.keys(seededStock).sort((a, b) => a.localeCompare(b)), [seededStock]);
  const [selectedType, setSelectedType] = useState(componentTypes[0] || 'Resistors');
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState(emptySalvageDraft());
  const [message, setMessage] = useState('');

  const visibleType = seededStock[selectedType] ? selectedType : componentTypes[0] || '';
  const entries = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return Object.entries(seededStock[visibleType] || {}).filter(([value]) => !needle || value.toLowerCase().includes(needle));
  }, [query, seededStock, visibleType]);

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
    if (!value || !visibleType) return;
    await setStockValue(visibleType, value, true);
    event.currentTarget.reset();
  }

  async function addSalvaged(event) {
    event.preventDefault();
    if (!draft.part_number.trim() && !draft.description.trim()) {
      setMessage('Part number or description is required.');
      return;
    }
    const nextSalvage = [{ id: crypto.randomUUID(), ...draft }, ...(salvagedComponents || [])];
    await saveStock(seededStock, nextSalvage);
    setDraft(emptySalvageDraft());
  }

  async function updateSalvaged(id, inStock) {
    const nextSalvage = (salvagedComponents || []).map((component) => (component.id === id ? { ...component, in_stock: inStock } : component));
    await saveStock(seededStock, nextSalvage);
  }

  return (
    <section className="electronics-layout">
      <aside className="panel electronics-types">
        <div className="panel-title">Electronics</div>
        {componentTypes.map((type) => {
          const values = Object.values(seededStock[type] || {});
          const inStockCount = values.filter(Boolean).length;
          return (
            <button className={visibleType === type ? 'category-card selected' : 'category-card'} type="button" key={type} onClick={() => setSelectedType(type)}>
              <strong>{type}</strong>
              <span>{inStockCount} in stock / {values.length} values</span>
            </button>
          );
        })}
      </aside>

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
              <span className={inStock ? 'stock-state in' : 'stock-state out'}>{inStock ? 'In Stock' : 'Out of Stock'}</span>
              <strong>{value}</strong>
              <button className="primary stock-button" type="button" onClick={() => setStockValue(visibleType, value, true)}>+</button>
            </div>
          ))}
        </div>
        {message && <p className="status-line">{message}</p>}
      </section>

      <aside className="panel detail-panel">
        <div className="panel-head">
          <div>
            <h2>Salvaged Components</h2>
            <p>Oddball parts, unknown ICs, appliance pulls, and one-off modules.</p>
          </div>
        </div>
        <form onSubmit={addSalvaged}>
          <label>
            Part Number
            <input value={draft.part_number} onChange={(event) => setDraft((current) => ({ ...current, part_number: event.target.value }))} placeholder="Unknown IC, LM358, relay board" />
          </label>
          <label>
            Description
            <input value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} />
          </label>
          <label>
            Source Appliance
            <input value={draft.source_appliance} onChange={(event) => setDraft((current) => ({ ...current, source_appliance: event.target.value }))} />
          </label>
          <label>
            Photo Reference
            <input value={draft.photo} onChange={(event) => setDraft((current) => ({ ...current, photo: event.target.value }))} placeholder="Filename or note, no upload yet" />
          </label>
          <label>
            Notes
            <textarea rows="3" value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} />
          </label>
          <label className="toggle-row">
            <input type="checkbox" checked={draft.in_stock} onChange={(event) => setDraft((current) => ({ ...current, in_stock: event.target.checked }))} />
            In Stock
          </label>
          <button className="primary" type="submit">Add Salvaged Part</button>
        </form>

        <div className="salvage-list">
          {(salvagedComponents || []).map((component) => (
            <article className="capability-card" key={component.id}>
              <div>
                <h3>{component.part_number || 'Unknown component'}</h3>
                <p>{component.description || component.notes}</p>
                <span className="muted">{component.source_appliance}</span>
              </div>
              <div className="capability-side">
                <span className={component.in_stock ? 'stock-state in' : 'stock-state out'}>{component.in_stock ? 'In Stock' : 'Out of Stock'}</span>
                <button className="secondary" type="button" onClick={() => updateSalvaged(component.id, !component.in_stock)}>
                  Toggle
                </button>
              </div>
            </article>
          ))}
        </div>
      </aside>
    </section>
  );
}
