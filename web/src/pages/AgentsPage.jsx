import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';

const MODELS = ['gpt-4.1-mini', 'gpt-4.1', 'gpt-4o', 'gpt-4o-mini'];

export default function AgentsPage() {
  const { api } = useAuth();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function load() {
    api('/api/agent-configs')
      .then((r) => r.json())
      .then(setAgents)
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [api]);

  function startEdit(agent) {
    setEditing(agent.id);
    setForm({ ...agent });
    setSaved(false);
  }

  function cancelEdit() {
    setEditing(null);
    setForm({});
  }

  function handleChange(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    api(`/api/agent-configs/${editing}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: form.description,
        system_prompt: form.system_prompt,
        model: form.model,
        temperature: form.temperature,
        context_window: form.context_window,
        active: form.active,
      }),
    })
      .then((r) => r.json())
      .then((updated) => {
        setAgents((list) => list.map((a) => (a.id === updated.id ? updated : a)));
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      })
      .finally(() => setSaving(false));
  }

  if (loading) return <p className="text-neutral-500">Carregant...</p>;

  return (
    <div>
      <h2 className="text-lg font-semibold text-neutral-900 mb-1">Agents IA</h2>
      <p className="text-sm text-neutral-500 mb-6">
        Edita el prompt, model i paràmetres de cada agent. Els canvis s'apliquen al pròxim missatge.
      </p>

      <div className="space-y-4">
        {agents.map((agent) => (
          <div key={agent.id} className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            {/* Cabecera */}
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-neutral-900 text-sm">{agent.name}</span>
                  {!agent.active && (
                    <span className="text-xs bg-neutral-100 text-neutral-500 rounded px-1.5 py-0.5">inactiu</span>
                  )}
                </div>
                <p className="text-xs text-neutral-500 mt-0.5">{agent.description || '—'}</p>
                <div className="flex gap-3 mt-1 text-xs text-neutral-400">
                  <span>Model: <b className="text-neutral-600">{agent.model}</b></span>
                  <span>Temp: <b className="text-neutral-600">{agent.temperature}</b></span>
                  <span>Context: <b className="text-neutral-600">{agent.context_window} missatges</b></span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => editing === agent.id ? cancelEdit() : startEdit(agent)}
                className="text-sm text-neutral-600 hover:text-neutral-900 border border-neutral-200 rounded-lg px-3 py-1.5 hover:bg-neutral-50"
              >
                {editing === agent.id ? 'Cancel·lar' : 'Editar'}
              </button>
            </div>

            {/* Formulario de edición */}
            {editing === agent.id && (
              <form onSubmit={handleSave} className="border-t border-neutral-100 px-5 py-5 space-y-4 bg-neutral-50">

                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Descripció</label>
                  <input
                    type="text"
                    value={form.description || ''}
                    onChange={(e) => handleChange('description', e.target.value)}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">
                    Prompt del sistema
                    <span className="ml-1 font-normal text-neutral-400">(les variables <code>{'{APP_NAME}'}</code> s'interpolen automàticament)</span>
                  </label>
                  <textarea
                    value={form.system_prompt || ''}
                    onChange={(e) => handleChange('system_prompt', e.target.value)}
                    rows={10}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm font-mono leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1">Model</label>
                    <select
                      value={form.model || 'gpt-4.1-mini'}
                      onChange={(e) => handleChange('model', e.target.value)}
                      className="w-full rounded-lg border border-neutral-300 px-2 py-2 text-sm"
                    >
                      {MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1">Temperatura (0–1)</label>
                    <input
                      type="number"
                      min="0" max="1" step="0.05"
                      value={form.temperature ?? 0.5}
                      onChange={(e) => handleChange('temperature', e.target.value)}
                      className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1">Missatges de context</label>
                    <input
                      type="number"
                      min="0" max="50" step="1"
                      value={form.context_window ?? 10}
                      onChange={(e) => handleChange('context_window', e.target.value)}
                      className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="flex items-end pb-2">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!form.active}
                        onChange={(e) => handleChange('active', e.target.checked)}
                      />
                      Actiu
                    </label>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-neutral-900 text-white px-4 py-2 text-sm font-medium hover:bg-neutral-800 disabled:opacity-50"
                  >
                    {saving ? 'Desant...' : 'Desar canvis'}
                  </button>
                  {saved && <span className="text-sm text-green-600">✓ Desat</span>}
                </div>
              </form>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
