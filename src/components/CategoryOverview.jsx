export default function CategoryOverview({ categories, onSelect }) {
  return (
    <section className="panel main-panel">
      <div className="panel-head">
        <div>
          <h2>Inventory Categories</h2>
          <p>{categories.reduce((total, category) => total + category.count, 0)} entries</p>
        </div>
      </div>
      <div className="category-grid">
        {categories.map((category) => (
          <button className="category-card" type="button" key={category.name} onClick={() => onSelect(category.name)}>
            <strong>{category.name || 'Uncategorized'}</strong>
            <span>{category.count} items</span>
          </button>
        ))}
      </div>
    </section>
  );
}
