import TagPill from './TagPill.jsx';

export default function InventoryList({ items, selectedId, onSelect, query, onQuery, onTagClick }) {
  return (
    <section className="panel main-panel">
      <div className="panel-head">
        <div>
          <h2>Inventory</h2>
          <p>{items.length} entries</p>
        </div>
        <input className="table-search" value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Filter inventory" />
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Tags</th>
              <th>Qty</th>
              <th>Storage</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className={selectedId === item.id ? 'selected' : ''} onClick={() => onSelect(item.id)}>
                <td>
                  <strong>{item.name}</strong>
                  <span>{item.category || item.id}</span>
                </td>
                <td>{item.base_type || 'unknown'}</td>
                <td className="tag-cell">
                  {(item.tags || []).slice(0, 4).map((tag) => (
                    <button className="tag-filter-button" type="button" key={tag} onClick={(event) => { event.stopPropagation(); onTagClick?.(tag); }}>
                      <TagPill>{tag}</TagPill>
                    </button>
                  ))}
                </td>
                <td>
                  {item.quantity} {item.units}
                </td>
                <td>{item.location_path || 'Unassigned'}</td>
                <td>{item.salvage_status}</td>
              </tr>
            ))}
            {!items.length && (
              <tr>
                <td colSpan="6" className="empty-cell">
                  No entries match the current filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
