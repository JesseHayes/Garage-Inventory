import { Plus, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { normalizeTag } from '../lib/format.js';

export default function TagDropdown({ label = 'Tags', value, onChange, tags }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const selected = new Set((value || []).map(normalizeTag));
  const needle = normalizeTag(query);
  const filtered = useMemo(
    () =>
      tags
        .filter((tag) => !selected.has(tag.normalized_name || normalizeTag(tag.name)))
        .filter((tag) => !needle || tag.name.toLowerCase().includes(needle) || tag.normalized_name?.includes(needle))
        .slice(0, 10),
    [needle, selected, tags]
  );
  const canCreate = needle && !tags.some((tag) => (tag.normalized_name || normalizeTag(tag.name)) === needle) && !selected.has(needle);

  function add(tag) {
    if (!tag) return;
    onChange([...(value || []), tag]);
    setQuery('');
  }

  function remove(tag) {
    const normalized = normalizeTag(tag);
    onChange((value || []).filter((existing) => normalizeTag(existing) !== normalized));
  }

  return (
    <label className="dropdown-field">
      {label}
      <button className="dropdown-value" type="button" onClick={() => setOpen((current) => !current)}>
        {value?.length ? `${value.length} selected` : 'Select tags'}
      </button>
      {!!value?.length && (
        <div className="selected-inline">
          {value.map((tag) => (
            <button type="button" key={tag} onClick={() => remove(tag)}>
              {tag}
              <X size={12} />
            </button>
          ))}
        </div>
      )}
      {open && (
        <div className="dropdown-menu">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search or create tag" autoFocus />
          <div className="dropdown-options">
            {filtered.map((tag) => (
              <button type="button" key={tag.id || tag.name} onClick={() => add(tag.name)}>
                <span>{tag.name}</span>
                <small>{tag.use_count || 0}</small>
              </button>
            ))}
            {canCreate && (
              <button type="button" onClick={() => add(query.trim())}>
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
