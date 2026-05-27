import { Save, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { listToText, objectToText, parseObjectText, splitList } from '../lib/format.js';
import TagDropdown from './TagDropdown.jsx';
import SearchableSelect from './SearchableSelect.jsx';

const salvageStatuses = ['intake', 'to disassemble', 'to identify', 'to test', 'processed', 'stored', 'scrap'];
const testedStatuses = ['not tested', 'tested', 'partially tested', 'unsafe', 'unknown'];
const confidenceLevels = ['unknown', 'low', 'medium', 'high'];

function draftFromItem(item) {
  return {
    name: item?.name || '',
    category: item?.category || '',
    tags: item?.tags || [],
    attributes: objectToText(item?.attributes),
    quantity: item?.quantity ?? '',
    units: item?.units || 'each',
    in_stock: item?.in_stock ?? true,
    dimensions: objectToText(item?.dimensions),
    material_composition: listToText(item?.material_composition),
    condition: item?.condition || 'unknown',
    location_id: item?.location_id || '',
    notes: item?.notes || '',
    source_origin: item?.source_origin || '',
    tested_status: item?.tested_status || 'not tested',
    confidence_level: item?.confidence_level || 'unknown',
    salvage_status: item?.salvage_status || 'intake'
  };
}

export default function ItemDetail({ item, locations, tags, categories, onSave, onDelete, onClose }) {
  const [draft, setDraft] = useState(draftFromItem(item));
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDraft(draftFromItem(item));
    setMessage('');
  }, [item?.id]);

  if (!item) {
    return (
      <aside className="panel detail-panel">
        <h2>Item Detail</h2>
        <p className="muted">Select an inventory entry to refine its data.</p>
      </aside>
    );
  }

  function setField(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    if (!draft.name.trim()) {
      setMessage('Name is required.');
      return;
    }
    setIsSaving(true);
    setMessage('');
    try {
      await onSave(item.id, {
        name: draft.name,
        category: draft.category,
        tags: draft.tags,
        attributes: parseObjectText(draft.attributes),
        quantity: draft.quantity,
        units: draft.units,
        in_stock: draft.in_stock,
        dimensions: parseObjectText(draft.dimensions),
        material_composition: splitList(draft.material_composition),
        condition: draft.condition,
        location_id: draft.location_id,
        notes: draft.notes,
        source_origin: draft.source_origin,
        tested_status: draft.tested_status,
        confidence_level: draft.confidence_level,
        salvage_status: draft.salvage_status
      });
      setMessage('Saved.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <aside className="panel detail-panel">
      <div className="panel-head">
        <h2>Item Detail</h2>
        {onClose && <button className="secondary mobile-only" type="button" onClick={onClose}>Close</button>}
      </div>
      <form onSubmit={submit}>
        <details open>
          <summary>Identity</summary>
          <label>
            Name
            <input value={draft.name} onChange={(event) => setField('name', event.target.value)} />
          </label>
          <SearchableSelect label="Category" value={draft.category} onChange={(value) => setField('category', value)} options={categories} />
          <TagDropdown value={draft.tags} onChange={(value) => setField('tags', value)} tags={tags} />
        </details>

        <details open>
          <summary>Specifications</summary>
          <label>
            Attributes
            <textarea value={draft.attributes} rows="3" onChange={(event) => setField('attributes', event.target.value)} />
          </label>
          <label>
            Dimensions
            <input value={draft.dimensions} onChange={(event) => setField('dimensions', event.target.value)} placeholder="length: 8 in, bore: 8 mm" />
          </label>
          <label>
            Materials
            <input value={draft.material_composition} onChange={(event) => setField('material_composition', event.target.value)} placeholder="copper, steel, ceramic" />
          </label>
          <div className="two-col compact">
            <label>
              Quantity
              <input value={draft.quantity} type="number" step="any" placeholder="Optional" onChange={(event) => setField('quantity', event.target.value)} />
            </label>
            <label>
              Units
              <input value={draft.units} onChange={(event) => setField('units', event.target.value)} />
            </label>
          </div>
          <label className="toggle-row">
            <input type="checkbox" checked={draft.in_stock} onChange={(event) => setField('in_stock', event.target.checked)} />
            In Stock
          </label>
        </details>

        <details open>
          <summary>Workflow</summary>
          <label>
            Storage
            <select value={draft.location_id} onChange={(event) => setField('location_id', event.target.value)}>
              <option value="">Unassigned</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.path || location.name}
                </option>
              ))}
            </select>
          </label>
          <div className="two-col">
            <label>
              Tested
              <select value={draft.tested_status} onChange={(event) => setField('tested_status', event.target.value)}>
                {testedStatuses.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
            <label>
              Confidence
              <select value={draft.confidence_level} onChange={(event) => setField('confidence_level', event.target.value)}>
                {confidenceLevels.map((level) => (
                  <option key={level}>{level}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="two-col">
            <label>
              Condition
              <input value={draft.condition} onChange={(event) => setField('condition', event.target.value)} />
            </label>
            <label>
              Salvage
              <select value={draft.salvage_status} onChange={(event) => setField('salvage_status', event.target.value)}>
                {salvageStatuses.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
          </div>
        </details>

        <details open>
          <summary>Notes</summary>
          <label>
            Source / Origin
            <input value={draft.source_origin} onChange={(event) => setField('source_origin', event.target.value)} placeholder="washer motor, roadside scrap, creek clay" />
          </label>
          <label>
            Notes
            <textarea value={draft.notes} rows="5" onChange={(event) => setField('notes', event.target.value)} />
          </label>
        </details>

        <div className="button-row sticky-actions">
          <button className="primary" type="submit" disabled={isSaving}>
            <Save size={16} />
            {isSaving ? 'Saving' : 'Save'}
          </button>
          <button className="danger" type="button" onClick={() => onDelete(item.id)}>
            <Trash2 size={16} />
            Delete
          </button>
          {message && <span className="status-line inline-status">{message}</span>}
        </div>
      </form>
    </aside>
  );
}
