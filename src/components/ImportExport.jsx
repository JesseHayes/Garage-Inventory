import { Clipboard, Download, Upload } from 'lucide-react';
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
        `Imported ${result.imported.inventory_items} items, ${result.imported.locations} locations, ${result.imported.capability_upgrades} upgrades, ${result.imported.projects || 0} projects, ${result.imported.electronics_component_types || 0} electronics groups, ${result.imported.tags || 0} tags.`
      );
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function copyJson() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(jsonText);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = jsonText;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setMessage('JSON copied.');
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
          <button className="secondary" onClick={copyJson}>
            <Clipboard size={16} />
            Copy JSON
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
