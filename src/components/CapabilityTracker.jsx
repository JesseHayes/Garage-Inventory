import { Hammer, Plus, Save, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { listToText, splitList } from '../lib/format.js';
import TagPill from './TagPill.jsx';

const statuses = ['desired', 'researching', 'sourcing', 'in progress', 'built', 'deferred'];
const priorities = ['low', 'medium', 'high', 'critical'];

function emptyDraft() {
  return {
    name: '',
    estimated_cost: '',
    capabilities_unlocked: '',
    related_item_ids: [],
    priority: 'medium',
    status: 'desired',
    notes: ''
  };
}

function draftFromCapability(capability) {
  if (!capability) return emptyDraft();
  return {
    name: capability.name || '',
    estimated_cost: capability.estimated_cost ?? '',
    capabilities_unlocked: listToText(capability.capabilities_unlocked),
    related_item_ids: capability.related_item_ids || [],
    priority: capability.priority || 'medium',
    status: capability.status || 'desired',
    notes: capability.notes || ''
  };
}

export default function CapabilityTracker({ capabilities, items, selectedId, onSelect, onCreate, onUpdate, onDelete }) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('priority');
  const [draft, setDraft] = useState(emptyDraft());
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const selected = capabilities.find((capability) => capability.id === selectedId);

  useEffect(() => {
    setDraft(draftFromCapability(selected));
    setMessage('');
  }, [selected?.id]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const priorityScore = { critical: 4, high: 3, medium: 2, low: 1 };
    return [...capabilities]
      .filter((capability) => {
        if (!needle) return true;
        return [capability.name, capability.status, capability.priority, capability.notes, JSON.stringify(capability.capabilities_unlocked || [])]
          .join(' ')
          .toLowerCase()
          .includes(needle);
      })
      .sort((a, b) => {
        if (sort === 'name') return a.name.localeCompare(b.name);
        if (sort === 'status') return a.status.localeCompare(b.status);
        if (sort === 'cost') return (b.estimated_cost || 0) - (a.estimated_cost || 0);
        return (priorityScore[b.priority] || 0) - (priorityScore[a.priority] || 0);
      });
  }, [capabilities, query, sort]);

  function setField(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function startNew() {
    onSelect('');
    setDraft(emptyDraft());
  }

  async function submit(event) {
    event.preventDefault();
    if (!draft.name.trim()) {
      setMessage('Name is required.');
      return;
    }
    const payload = {
      ...draft,
      capabilities_unlocked: splitList(draft.capabilities_unlocked),
      related_item_ids: draft.related_item_ids,
      estimated_cost: draft.estimated_cost
    };
    setIsSaving(true);
    setMessage('');
    try {
      if (selected) {
        await onUpdate(selected.id, payload);
        setMessage('Saved.');
      } else {
        const created = await onCreate(payload);
        onSelect(created.id);
        setMessage('Created.');
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function remove() {
    if (!selected) return;
    await onDelete(selected.id);
    startNew();
  }

  return (
    <section className="capability-layout">
      <section className="panel main-panel capability-list">
        <div className="panel-head">
          <div>
            <h2>Capabilities</h2>
            <p>{capabilities.length} goals and upgrades</p>
          </div>
          <button className="secondary" type="button" onClick={startNew}>
            <Plus size={16} />
            New
          </button>
        </div>
        <div className="filter-row">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter upgrades" />
          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="priority">Priority</option>
            <option value="status">Status</option>
            <option value="cost">Cost</option>
            <option value="name">Name</option>
          </select>
        </div>
        {filtered.map((capability) => (
          <article
            className={selectedId === capability.id ? 'capability-card selected' : 'capability-card'}
            key={capability.id}
            onClick={() => onSelect(capability.id)}
          >
            <div>
              <h3>{capability.name}</h3>
              <p>{capability.notes}</p>
              <div className="tag-cell">
                {(capability.capabilities_unlocked || []).slice(0, 5).map((capabilityName) => (
                  <TagPill key={capabilityName}>{capabilityName}</TagPill>
                ))}
              </div>
            </div>
            <div className="capability-side">
              <span>{capability.status}</span>
              <span>{capability.priority} priority</span>
              <span>{capability.estimated_cost == null ? 'cost unknown' : `$${capability.estimated_cost}`}</span>
            </div>
          </article>
        ))}
      </section>

      <aside className="panel detail-panel">
        <h2>{selected ? 'Capability Detail' : 'New Capability'}</h2>
        <form onSubmit={submit}>
          <details open>
            <summary>Upgrade</summary>
            <label>
              Name
              <input value={draft.name} onChange={(event) => setField('name', event.target.value)} placeholder="Propane furnace, drill press, fume hood" />
            </label>
            <label>
              Capabilities Unlocked
              <input value={draft.capabilities_unlocked} onChange={(event) => setField('capabilities_unlocked', event.target.value)} placeholder="aluminum casting, heat treatment" />
            </label>
            <div className="two-col compact">
              <label>
                Cost
                <input value={draft.estimated_cost} type="number" step="any" onChange={(event) => setField('estimated_cost', event.target.value)} placeholder="0" />
              </label>
              <label>
                Priority
                <select value={draft.priority} onChange={(event) => setField('priority', event.target.value)}>
                  {priorities.map((priority) => (
                    <option key={priority}>{priority}</option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Status
              <select value={draft.status} onChange={(event) => setField('status', event.target.value)}>
                {statuses.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
          </details>

          <details open>
            <summary>Related Inventory</summary>
            <label>
              Related Items
              <select
                multiple
                value={draft.related_item_ids}
                onChange={(event) => setField('related_item_ids', Array.from(event.target.selectedOptions).map((option) => option.value))}
              >
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          </details>

          <details open>
            <summary>Notes</summary>
            <label>
              Notes
              <textarea value={draft.notes} rows="6" onChange={(event) => setField('notes', event.target.value)} />
            </label>
          </details>

          <div className="button-row sticky-actions">
            <button className="primary" type="submit" disabled={isSaving}>
              <Save size={16} />
              {isSaving ? 'Saving' : 'Save'}
            </button>
            {selected && (
              <button className="danger" type="button" onClick={remove}>
                <Trash2 size={16} />
                Delete
              </button>
            )}
            {message && <span className="status-line inline-status">{message}</span>}
          </div>
        </form>
      </aside>
    </section>
  );
}
