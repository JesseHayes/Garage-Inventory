import { Plus, Save } from 'lucide-react';
import { parseObjectText } from '../lib/format.js';
import { useState } from 'react';
import TagDropdown from './TagDropdown.jsx';
import SearchableSelect from './SearchableSelect.jsx';

const salvageStatuses = ['intake', 'to disassemble', 'to identify', 'to test', 'processed', 'stored', 'scrap'];

export default function QuickAddForm({ locations, onCreate, tags, categories }) {
  const [selectedTags, setSelectedTags] = useState([]);
  const [category, setCategory] = useState('');
  const [inStock, setInStock] = useState(true);

  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await onCreate({
      name: form.get('name'),
      category,
      tags: selectedTags,
      attributes: parseObjectText(form.get('attributes')),
      quantity: form.get('quantity'),
      units: form.get('units'),
      in_stock: inStock,
      location_id: form.get('location_id'),
      condition: form.get('condition'),
      salvage_status: form.get('salvage_status'),
      notes: form.get('notes')
    });
    event.currentTarget.reset();
    setSelectedTags([]);
    setCategory('');
    setInStock(true);
  }

  return (
    <form className="panel quick-add" onSubmit={submit}>
      <div className="panel-title">
        <Plus size={18} />
        Quick Add
      </div>
      <label>
        Name
        <input name="name" placeholder="Unknown transformer, 12V motor, oak board" autoComplete="off" />
      </label>
      <SearchableSelect label="Category" value={category} onChange={setCategory} options={categories} placeholder="electronics, stock, chemistry" />
      <TagDropdown value={selectedTags} onChange={setSelectedTags} tags={tags} />
      <label>
        Attributes
        <input name="attributes" placeholder="voltage: 12V, rpm: unknown" />
      </label>
      <div className="two-col compact">
        <label>
          Qty
          <input name="quantity" type="number" step="any" placeholder="Optional" />
        </label>
        <label>
          Units
          <input name="units" defaultValue="each" />
        </label>
      </div>
      <label className="toggle-row">
        <input type="checkbox" checked={inStock} onChange={(event) => setInStock(event.target.checked)} />
        In Stock
      </label>
      <label>
        Storage
        <select name="location_id" defaultValue="">
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
          Condition
          <input name="condition" placeholder="unknown, good, rough" />
        </label>
        <label>
          Salvage
          <select name="salvage_status" defaultValue="intake">
            {salvageStatuses.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Notes
        <textarea name="notes" rows="3" placeholder="Where it came from, what is uncertain, test ideas" />
      </label>
      <button className="primary" type="submit">
        <Save size={16} />
        Add Entry
      </button>
    </form>
  );
}
