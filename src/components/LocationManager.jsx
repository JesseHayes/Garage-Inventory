import { MapPin, Plus, Trash2 } from 'lucide-react';

export default function LocationManager({ locations, onCreate, onDelete }) {
  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await onCreate({
      name: form.get('name'),
      code: form.get('code'),
      type: form.get('type'),
      parent_id: form.get('parent_id'),
      notes: form.get('notes')
    });
    event.currentTarget.reset();
  }

  return (
    <section className="page-grid">
      <form className="panel" onSubmit={submit}>
        <div className="panel-title">
          <Plus size={18} />
          Add Location
        </div>
        <label>
          Name
          <input name="name" placeholder="Shelf B, Bin MOTORS-1" />
        </label>
        <div className="two-col">
          <label>
            Code
            <input name="code" placeholder="B, MOTORS-1" />
          </label>
          <label>
            Type
            <select name="type" defaultValue="bin">
              {['shelf', 'bin', 'drawer', 'bucket', 'rack', 'cabinet', 'zone'].map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Parent
          <select name="parent_id" defaultValue="">
            <option value="">Top level</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.path || location.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Notes
          <textarea name="notes" rows="3" />
        </label>
        <button className="primary" type="submit">
          <MapPin size={16} />
          Save Location
        </button>
      </form>
      <section className="panel main-panel">
        <div className="panel-head">
          <div>
            <h2>Storage Locations</h2>
            <p>{locations.length} places</p>
          </div>
        </div>
        <div className="location-list">
          {locations.map((location) => (
            <div className="location-row" key={location.id}>
              <div>
                <strong>{location.path || location.name}</strong>
                <span>
                  {location.type}
                  {location.notes ? ` - ${location.notes}` : ''}
                </span>
              </div>
              <button className="icon danger-plain" title="Delete location" onClick={() => onDelete(location.id)}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
