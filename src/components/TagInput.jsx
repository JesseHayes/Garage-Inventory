import { useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { cleanTagList, normalizeTag } from '../lib/format.js';
import TagPill from './TagPill.jsx';

export default function TagInput({ label = 'Tags', value, onChange, tags = [], placeholder = 'Add tag' }) {
  const [draft, setDraft] = useState('');
  const normalizedCurrent = useMemo(() => new Set((value || []).map(normalizeTag)), [value]);
  const suggestions = useMemo(() => {
    const needle = normalizeTag(draft);
    return tags
      .filter((tag) => !normalizedCurrent.has(tag.normalized_name || normalizeTag(tag.name)))
      .filter((tag) => !needle || tag.normalized_name?.includes(needle) || tag.name.toLowerCase().includes(needle))
      .slice(0, 6);
  }, [draft, normalizedCurrent, tags]);

  function add(tag) {
    const next = cleanTagList([...(value || []), tag]);
    onChange(next);
    setDraft('');
  }

  function remove(tag) {
    const normalized = normalizeTag(tag);
    onChange((value || []).filter((existing) => normalizeTag(existing) !== normalized));
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      if (draft.trim()) add(draft);
    }
    if (event.key === 'Backspace' && !draft && value?.length) {
      remove(value[value.length - 1]);
    }
  }

  return (
    <label className="tag-input-label">
      {label}
      <div className="tag-input-box">
        <div className="tag-cell">
          {(value || []).map((tag) => (
            <button className="tag-remove" type="button" key={tag} onClick={() => remove(tag)} title={`Remove ${tag}`}>
              <TagPill>{tag}</TagPill>
              <X size={12} />
            </button>
          ))}
        </div>
        <div className="tag-entry-row">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            list="garage-tag-suggestions"
          />
          <button className="icon" type="button" onClick={() => draft.trim() && add(draft)} title="Add tag">
            <Plus size={16} />
          </button>
        </div>
        {!!suggestions.length && (
          <div className="tag-suggestions">
            {suggestions.map((tag) => (
              <button type="button" key={tag.id || tag.name} onClick={() => add(tag.name)}>
                {tag.name}
                <span>{tag.use_count}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </label>
  );
}
