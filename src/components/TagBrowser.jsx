import { Plus, Tags } from 'lucide-react';
import { useMemo, useState } from 'react';

export default function TagBrowser({ tags, activeTag, onSelectTag, onCreateTag }) {
  const [query, setQuery] = useState('');
  const [newTag, setNewTag] = useState('');
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return tags.filter((tag) => !needle || tag.name.toLowerCase().includes(needle) || tag.normalized_name.includes(needle));
  }, [query, tags]);

  async function create(event) {
    event.preventDefault();
    if (!newTag.trim()) return;
    await onCreateTag(newTag);
    setNewTag('');
  }

  return (
    <section className="page-grid tags-page">
      <form className="panel" onSubmit={create}>
        <div className="panel-title">
          <Plus size={18} />
          New Tag
        </div>
        <label>
          Tag
          <input value={newTag} onChange={(event) => setNewTag(event.target.value)} placeholder="high-temperature" />
        </label>
        <button className="primary" type="submit">
          <Tags size={16} />
          Save Tag
        </button>
      </form>
      <section className="panel main-panel">
        <div className="panel-head">
          <div>
            <h2>Tag Browser</h2>
            <p>{tags.length} reusable tags</p>
          </div>
          <input className="table-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find tag" />
        </div>
        <div className="tag-browser-grid">
          {filtered.map((tag) => (
            <button
              type="button"
              className={activeTag === tag.name ? 'tag-browser-card active' : 'tag-browser-card'}
              key={tag.id}
              onClick={() => onSelectTag(activeTag === tag.name ? '' : tag.name)}
            >
              <strong>{tag.name}</strong>
              <span>{tag.use_count} uses</span>
            </button>
          ))}
        </div>
      </section>
    </section>
  );
}
