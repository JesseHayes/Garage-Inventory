import { Download, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function ImportExport({ onExport, onImport }) {
  const [jsonText, setJsonText] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    onExport().then((payload) => setJsonText(JSON.stringify(payload, null, 2)));
  }, [onExport]);

  async function refreshExport() {
    const payload = await onExport();
    setJsonText(JSON.stringify(payload, null, 2));
    setMessage('Export refreshed.');
  }

  async function importJson() {
    try {
      const payload = JSON.parse(jsonText);
      const result = await onImport(payload);
      setMessage(
        `Imported ${result.imported.inventory_items} items, ${result.imported.locations} locations, ${result.imported.capability_upgrades} upgrades, ${result.imported.tags || 0} tags.`
      );
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <section className="panel export-panel">
      <div className="panel-head">
        <div>
          <h2>JSON Import / Export</h2>
          <p>Readable structured data for backups or external ChatGPT planning.</p>
        </div>
        <div className="button-row">
          <button className="secondary" onClick={refreshExport}>
            <Download size={16} />
            Refresh
          </button>
          <button className="primary" onClick={importJson}>
            <Upload size={16} />
            Import
          </button>
        </div>
      </div>
      <textarea className="json-box" value={jsonText} onChange={(event) => setJsonText(event.target.value)} spellCheck="false" />
      {message && <p className="status-line">{message}</p>}
    </section>
  );
}
