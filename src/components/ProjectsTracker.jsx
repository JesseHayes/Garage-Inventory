import { Plus, Save, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { listToText, splitList } from '../lib/format.js';
import TagDropdown from './TagDropdown.jsx';

const projectStates = ['Conceived', 'Planned', 'In Progress', 'Attempted', 'Completed'];

function emptyDraft() {
  return { name: '', description: '', related_item_ids: [], related_tags: [], state: 'Conceived', notes: '' };
}

function draftFromProject(project) {
  if (!project) return emptyDraft();
  return {
    name: project.name || '',
    description: project.description || '',
    related_item_ids: project.related_item_ids || [],
    related_tags: project.related_tags || [],
    state: project.state || 'Conceived',
    notes: project.notes || ''
  };
}

export default function ProjectsTracker({ projects, items, tags, selectedId, onSelect, onCreate, onUpdate, onDelete }) {
  const [stateFilter, setStateFilter] = useState('');
  const [draft, setDraft] = useState(emptyDraft());
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const selected = projects.find((project) => project.id === selectedId);

  useEffect(() => {
    setDraft(draftFromProject(selected));
    setMessage('');
  }, [selected?.id]);

  const filtered = useMemo(
    () => projects.filter((project) => !stateFilter || project.state === stateFilter),
    [projects, stateFilter]
  );

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
    setIsSaving(true);
    setMessage('');
    try {
      if (selected) {
        await onUpdate(selected.id, draft);
        setMessage('Saved.');
      } else {
        const created = await onCreate(draft);
        onSelect(created.id);
        setMessage('Created.');
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="capability-layout">
      <section className="panel main-panel capability-list">
        <div className="panel-head">
          <div>
            <h2>Projects</h2>
            <p>{projects.length} tracked projects</p>
          </div>
          <button className="secondary" type="button" onClick={startNew}>
            <Plus size={16} />
            New
          </button>
        </div>
        <div className="filter-row">
          <select value={stateFilter} onChange={(event) => setStateFilter(event.target.value)}>
            <option value="">All states</option>
            {projectStates.map((state) => (
              <option key={state}>{state}</option>
            ))}
          </select>
        </div>
        {filtered.map((project) => (
          <article className={selectedId === project.id ? 'capability-card selected' : 'capability-card'} key={project.id} onClick={() => onSelect(project.id)}>
            <div>
              <h3>{project.name}</h3>
              <p>{project.description || project.notes}</p>
              <span className="muted">{listToText(project.related_tags || [])}</span>
            </div>
            <div className="capability-side">
              <span>{project.state}</span>
              <span>{project.related_item_ids?.length || 0} items</span>
            </div>
          </article>
        ))}
      </section>

      <aside className="panel detail-panel">
        <h2>{selected ? 'Project Detail' : 'New Project'}</h2>
        <form onSubmit={submit}>
          <label>
            Name
            <input value={draft.name} onChange={(event) => setField('name', event.target.value)} />
          </label>
          <label>
            Description
            <textarea value={draft.description} rows="3" onChange={(event) => setField('description', event.target.value)} />
          </label>
          <label>
            State
            <select value={draft.state} onChange={(event) => setField('state', event.target.value)}>
              {projectStates.map((state) => (
                <option key={state}>{state}</option>
              ))}
            </select>
          </label>
          <TagDropdown label="Related Tags" value={draft.related_tags} onChange={(value) => setField('related_tags', value)} tags={tags} />
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
          <label>
            Notes
            <textarea value={draft.notes} rows="6" onChange={(event) => setField('notes', event.target.value)} />
          </label>
          <div className="button-row sticky-actions">
            <button className="primary" type="submit" disabled={isSaving}>
              <Save size={16} />
              {isSaving ? 'Saving' : 'Save'}
            </button>
            {selected && (
              <button className="danger" type="button" onClick={() => onDelete(selected.id)}>
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
