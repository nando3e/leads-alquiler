import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';

export default function ConfigPage() {
  const { api } = useAuth();
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api('/api/panel-config')
      .then((r) => r.json())
      .then(setConfig)
      .finally(() => setLoading(false));
  }, [api]);

  function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    api('/api/panel-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    })
      .then((r) => r.json())
      .then(setConfig)
      .finally(() => setSaving(false));
  }

  if (loading) return <p className="text-neutral-500">Carregant...</p>;

  return (
    <div>
      <h2 className="text-lg font-semibold text-neutral-900 mb-4">Configuració del panell</h2>
      <form onSubmit={handleSave} className="bg-white rounded-xl border border-neutral-200 p-6 max-w-md space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Nombre WhatsApp (Volver a WhatsApp)
          </label>
          <input
            type="text"
            value={config.whatsapp_return_number || ''}
            onChange={(e) => setConfig((c) => ({ ...c, whatsapp_return_number: e.target.value }))}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            placeholder="34600000000"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Nom de l'empresa
          </label>
          <input
            type="text"
            value={config.company_name || ''}
            onChange={(e) => setConfig((c) => ({ ...c, company_name: e.target.value }))}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            placeholder="Gestoria Agil"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-neutral-900 text-white px-4 py-2 text-sm font-medium hover:bg-neutral-800 disabled:opacity-50"
        >
          {saving ? 'Desant...' : 'Desar'}
        </button>
      </form>
    </div>
  );
}
