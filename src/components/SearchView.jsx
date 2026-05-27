import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import InventoryList from './InventoryList.jsx';
import SearchableSelect from './SearchableSelect.jsx';
import TagDropdown from './TagDropdown.jsx';
import { normalizeTag } from '../lib/format.js';

export default function SearchView({ items, categories, tags, selectedId, onSelect }) {
  const [category, setCategory] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);

  const filtered = useMemo(() => {
    const selected = selectedTags.map(normalizeTag);
    return items.filter((item) => {
      const categoryMatch = !category || (item.category || 'Uncategorized') === category;
      const itemTags = new Set((item.tags || []).map(normalizeTag));
      const tagMatch = !selected.length || selected.every((tag) => itemTags.has(tag));
      return categoryMatch && tagMatch;
    });
  }, [category, items, selectedTags]);

  return (
    <section className="search-layout">
      <div className="panel search-strip">
        <div className="panel-title">
          <Search size={18} />
          Filter Inventory
        </div>
        <SearchableSelect label="Category" value={category} onChange={setCategory} options={categories} placeholder="All categories" />
        <TagDropdown value={selectedTags} onChange={setSelectedTags} tags={tags} />
        <button className="secondary" type="button" onClick={() => { setCategory(''); setSelectedTags([]); }}>
          Clear
        </button>
      </div>
      <InventoryList items={filtered} selectedId={selectedId} onSelect={onSelect} query="" onQuery={() => {}} onTagClick={(tag) => setSelectedTags([tag])} />
    </section>
  );
}
