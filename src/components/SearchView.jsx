import { Search } from 'lucide-react';
import InventoryList from './InventoryList.jsx';

export default function SearchView({ items, query, onQuery, selectedId, onSelect }) {
  return (
    <section className="search-layout">
      <div className="panel search-strip">
        <div className="panel-title">
          <Search size={18} />
          Structured Search
        </div>
        <input
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder='Try "12V motors", "copper wire", "bearing 8mm", "high temperature"'
        />
      </div>
      <InventoryList items={items} selectedId={selectedId} onSelect={onSelect} query={query} onQuery={onQuery} onTagClick={onQuery} />
    </section>
  );
}
