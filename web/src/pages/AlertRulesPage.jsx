import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { RULE_FIELDS, criteriaFromForm, formStateFromCriteria } from '../lib/alertRuleFields.js';

const defaultEnabled = () => Object.fromEntries(RULE_FIELDS.map((f) => [f.key, false]));
const defaultValues = () => Object.fromEntries(RULE_FIELDS.map((f) => [f.key, f.type === 'multi' ? [] : '']));

export default function AlertRulesPage() {
  const { api } = useAuth();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: '',
    active: true,
    enabled: defaultEnabled(),
    values: defaultValues(),
    notify_whatsapp: false,
    notify_email: false,
    admin_phone: '',
    admin_email: '',
  });

  function load() {
    api('/api/alert-requirements')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setList(Array.isArray(data) ? data : []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [api]);

  function setEnabled(key, on) {
    setForm((f) => ({
      ...f,
      enabled: { ...f.enabled, [key]: on },
      values: on ? f.values : { ...f.values, [key]: RULE_FIELDS.find((x) => x.key === key)?.type === 'multi' ? [] : '' },
    }));
  }

  function setValue(key, value) {
    setForm((f) => ({ ...f, values: { ...f.values, [key]: value } }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const criteria = criteriaFromForm(form.enabled, form.values);
    const url = editing
      ? `/api/alert-requirements/${editing.id}`
      : '/api/alert-requirements';
    const method = editing ? 'PUT' : 'POST';
    api(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        active: form.active,
        criteria,
        notify_whatsapp: form.notify_whatsapp,
        notify_email: form.notify_email,
        admin_phone: form.admin_phone,
        admin_email: form.admin_email,
      }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(() => {
        setEditing(null);
        setForm({ name: '', active: true, enabled: defaultEnabled(), values: defaultValues(), notify_whatsapp: false, notify_email: false, admin_phone: '', admin_email: '' });
        load();
      })
      .catch(() => {});
  }

  function startEdit(rule) {
    const { enabled, values } = formStateFromCriteria(rule.criteria || {});
    setEditing(rule);
    setForm({
      name: rule.name,
      active: rule.active,
      enabled,
      values,
      notify_whatsapp: !!rule.notify_whatsapp,
      notify_email: !!rule.notify_email,
      admin_phone: rule.admin_phone || '',
      admin_email: rule.admin_email || '',
    });
  }

  function handleDelete(id) {
    if (!confirm('Eliminar aquesta regla?')) return;
    api(`/api/alert-requirements/${id}`, { method: 'DELETE' }).then((r) => r.ok && load());
  }

  function renderFieldInput(field) {
    const enabled = form.enabled[field.key];
    const value = form.values[field.key];
    if (!enabled) return null;

    if (field.type === 'number') {
      return (
        <input
          type="number"
          min="0"
          step={field.key.includes('preu') ? 50 : 1}
          value={value}
          onChange={(e) => setValue(field.key, e.target.value ? Number(e.target.value) : '')}
          className="iv-input w-28 py-1.5 text-sm"
          placeholder={field.placeholder}
        />
      );
    }

    if (field.type === 'select') {
      return (
        <select
          value={value}
          onChange={(e) => setValue(field.key, e.target.value)}
          className="iv-input min-w-[120px] py-1.5 text-sm"
        >
          {field.options.map((opt) => (
            <option key={opt.value || 'x'} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }

    if (field.type === 'multi') {
      const arr = Array.isArray(value) ? value : [];
      return (
        <div className="flex flex-wrap gap-2">
          {field.options.map((opt) => {
            const isChecked = arr.includes(opt);
            return (
              <label key={opt} className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...arr, opt]
                      : arr.filter((x) => x !== opt);
                    setValue(field.key, next);
                  }}
                />
                {opt}
              </label>
            );
          })}
        </div>
      );
    }

    return null;
  }

  return (
    <div>
      <h1 className="iv-page-title">Regles d&apos;alerta</h1>
      <p className="iv-page-sub">Defineix criteris i notificacions quan un lead encaixi.</p>

      <form onSubmit={handleSubmit} className="iv-card mb-6 max-w-2xl p-6">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">Nom de la regla</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="iv-input w-full"
              placeholder="ex. Perfil ideal"
              required
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="active"
              checked={form.active}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
            />
            <label htmlFor="active" className="text-sm">Activa</label>
          </div>

          {/* ── Notificacions al administrador ── */}
          <div className="border-t border-stone-200 pt-4">
            <p className="mb-3 text-sm font-medium text-stone-700">Notificar a l&apos;administrador quan es compleixi la regla</p>
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.notify_whatsapp}
                  onChange={(e) => setForm((f) => ({ ...f, notify_whatsapp: e.target.checked }))}
                />
                Notificar per WhatsApp
              </label>
              {form.notify_whatsapp && (
                <input
                  type="tel"
                  value={form.admin_phone}
                  onChange={(e) => setForm((f) => ({ ...f, admin_phone: e.target.value }))}
                  placeholder="34600000000 (sense +)"
                  className="iv-input w-full py-1.5 text-sm"
                />
              )}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.notify_email}
                  onChange={(e) => setForm((f) => ({ ...f, notify_email: e.target.checked }))}
                />
                Notificar per correu electrònic
              </label>
              {form.notify_email && (
                <input
                  type="email"
                  value={form.admin_email}
                  onChange={(e) => setForm((f) => ({ ...f, admin_email: e.target.value }))}
                  placeholder="admin@exemple.com"
                  className="iv-input w-full py-1.5 text-sm"
                />
              )}
            </div>
          </div>

          <div className="border-t border-stone-200 pt-4">
            <p className="mb-3 text-sm font-medium text-stone-700">Incloure en la regla (activa el toggle i tria el valor)</p>
            <ul className="space-y-3">
              {RULE_FIELDS.map((field) => (
                <li key={field.key} className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 shrink-0 w-48">
                    <input
                      type="checkbox"
                      checked={!!form.enabled[field.key]}
                      onChange={(e) => setEnabled(field.key, e.target.checked)}
                      className="rounded border-stone-300 text-teal-700 focus:ring-teal-500"
                    />
                    <span className="text-sm text-stone-800">{field.label}</span>
                  </label>
                  {renderFieldInput(field)}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <button type="submit" className="iv-btn">
            {editing ? 'Desar' : 'Afegir regla'}
          </button>
          {editing && (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setForm({ name: '', active: true, enabled: defaultEnabled(), values: defaultValues() });
              }}
              className="iv-btn-secondary"
            >
              Cancel·lar
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <div className="flex items-center gap-2 text-stone-500">
          <span
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-teal-600 border-t-transparent"
            aria-hidden
          />
          Carregant...
        </div>
      ) : (
        <ul className="space-y-2">
          {(Array.isArray(list) ? list : []).map((rule) => (
            <li
              key={rule.id}
              className="iv-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <span className="font-medium text-stone-900">{rule.name}</span>
                {!rule.active && <span className="ml-2 text-sm text-stone-500">(inactiva)</span>}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(rule)}
                  className="text-sm font-medium text-teal-700 hover:text-teal-900 hover:underline"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(rule.id)}
                  className="text-sm font-medium text-red-600 hover:text-red-800 hover:underline"
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
