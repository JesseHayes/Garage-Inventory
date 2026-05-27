import TagPill from './TagPill.jsx';

function stockLabel(item) {
  if (item.quantity !== null && item.quantity !== undefined && item.quantity !== '') return `${item.quantity} ${item.units || ''}`.trim();
  return item.in_stock ? 'In Stock' : 'Out of Stock';
}

export default function InventoryList({ items, selectedId, onSelect, query, onQuery, onTagClick, title = 'Inventory', onBack }) {
  return (
    <section className="panel main-panel">
      <div className="panel-head">
        <div>
          <h2>{title}</h2>
          <p>{items.length} entries</p>
        </div>
        {onBack && <button className="secondary" type="button" onClick={onBack}>Categories</button>}
        <input className="table-search" value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Filter inventory" />
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Tags</th>
              <th>Stock</th>
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
                <td className="tag-cell">
                  {(item.tags || []).slice(0, 4).map((tag) => (
                    <button className="tag-filter-button" type="button" key={tag} onClick={(event) => { event.stopPropagation(); onTagClick?.(tag); }}>
                      <TagPill>{tag}</TagPill>
                    </button>
                  ))}
                </td>
                <td>{stockLabel(item)}</td>
                <td>{item.location_path || 'Unassigned'}</td>
                <td>{item.salvage_status}</td>
              </tr>
            ))}
            {!items.length && (
              <tr>
                <td colSpan="5" className="empty-cell">
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
