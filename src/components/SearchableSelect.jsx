import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';

export default function SearchableSelect({ label, value, onChange, options, placeholder = 'Search or create' }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const normalized = query.trim().toLowerCase();
  const filtered = useMemo(
    () => options.filter((option) => !normalized || option.toLowerCase().includes(normalized)).slice(0, 8),
    [normalized, options]
  );
  const canCreate = normalized && !options.some((option) => option.toLowerCase() === normalized);

  function select(option) {
    onChange(option);
    setQuery('');
    setOpen(false);
  }

  return (
    <label className="dropdown-field">
      {label}
      <button className="dropdown-value" type="button" onClick={() => setOpen((current) => !current)}>
        {value || placeholder}
      </button>
      {open && (
        <div className="dropdown-menu">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={placeholder} autoFocus />
          <div className="dropdown-options">
            {filtered.map((option) => (
              <button type="button" key={option} onClick={() => select(option)}>
                {option}
              </button>
            ))}
            {canCreate && (
              <button type="button" onClick={() => select(query.trim())}>
                <Plus size={14} />
                {query.trim()}
              </button>
            )}
          </div>
        </div>
      )}
    </label>
  );
}
