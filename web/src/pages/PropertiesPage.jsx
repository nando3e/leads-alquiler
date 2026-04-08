import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../lib/auth';

const emptyForm = {
  ref_code: '',
  direccion: '',
  zona: '',
  tipo_operacion: 'alquiler',
  tipo_vivienda: '',
  planta: '',
  ascensor: '',
  habitaciones: '',
  banos: '',
  garaje: '',
  precio: '',
  descripcion: '',
  activo: true,
};

export default function PropertiesPage() {
  const { api } = useAuth();
  const [data, setData] = useState({ items: [], total: 0, page: 1, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [zona, setZona] = useState('');
  const [tipoOperacion, setTipoOperacion] = useState('');
  const [precioMin, setPrecioMin] = useState('');
  const [precioMax, setPrecioMax] = useState('');
  const [habitaciones, setHabitaciones] = useState('');
  const [activoFiltro, setActivoFiltro] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [importMsg, setImportMsg] = useState(null);

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (search) params.set('search', search);
    if (zona) params.set('zona', zona);
    if (tipoOperacion) params.set('tipo_operacion', tipoOperacion);
    if (precioMin) params.set('precio_min', precioMin);
    if (precioMax) params.set('precio_max', precioMax);
    if (habitaciones) params.set('habitaciones', habitaciones);
    if (activoFiltro === 'true' || activoFiltro === 'false') params.set('activo', activoFiltro);
    api(`/api/properties?${params}`)
      .then((r) => (r.ok ? r.json() : { items: [], total: 0, page: 1, totalPages: 0 }))
      .then((d) => {
        if (!cancelled) {
          setData({
            items: Array.isArray(d?.items) ? d.items : [],
            total: d?.total ?? 0,
            page: d?.page ?? 1,
            totalPages: d?.totalPages ?? 0,
          });
        }
      })
      .catch(() => {
        if (!cancelled) setData({ items: [], total: 0, page: 1, totalPages: 0 });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [api, page, search, zona, tipoOperacion, precioMin, precioMax, habitaciones, activoFiltro]);

  useEffect(() => {
    return load();
  }, [load]);

  function openNew() {
    setForm(emptyForm);
    setModal('new');
  }

  function openEdit(row) {
    setForm({
      ref_code: row.ref_code || '',
      direccion: row.direccion || '',
      zona: row.zona || '',
      tipo_operacion: row.tipo_operacion || 'alquiler',
      tipo_vivienda: row.tipo_vivienda || '',
      planta: row.planta || '',
      ascensor: row.ascensor || '',
      habitaciones: row.habitaciones ?? '',
      banos: row.banos ?? '',
      garaje: row.garaje || '',
      precio: row.precio ?? '',
      descripcion: row.descripcion || '',
      activo: row.activo !== false,
      _id: row.id,
    });
    setModal('edit');
  }

  async function save() {
    setSaving(true);
    try {
      const body = {
        ref_code: form.ref_code.trim(),
        direccion: form.direccion || null,
        zona: form.zona || null,
        tipo_operacion: form.tipo_operacion,
        tipo_vivienda: form.tipo_vivienda || null,
        planta: form.planta || null,
        ascensor: form.ascensor || null,
        habitaciones: form.habitaciones === '' ? null : parseInt(form.habitaciones, 10),
        banos: form.banos === '' ? null : parseInt(form.banos, 10),
        garaje: form.garaje || null,
        precio: form.precio === '' ? null : Number(form.precio),
        descripcion: form.descripcion || null,
        activo: form.activo,
      };
      if (!body.ref_code) {
        alert('ref_code obligatori');
        setSaving(false);
        return;
      }
      const url = modal === 'edit' ? `/api/properties/${form._id}` : '/api/properties';
      const method = modal === 'edit' ? 'PUT' : 'POST';
      const r = await api(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        alert(err.message || err.error || 'Error');
        setSaving(false);
        return;
      }
      setModal(null);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    if (!confirm('Eliminar aquesta propietat?')) return;
    const r = await api(`/api/properties/${id}`, { method: 'DELETE' });
    if (!r.ok) {
      alert('Error en eliminar');
      return;
    }
    load();
  }

  async function handleImport(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImportMsg('Pujant...');
    const fd = new FormData();
    fd.append('file', file);
    const token = localStorage.getItem('token');
    const base = import.meta.env.VITE_API_URL || '';
    try {
      const r = await fetch(`${base}/api/properties/import`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setImportMsg(`Error: ${j.message || j.error || r.status}`);
        return;
      }
      setImportMsg(
        `Importat: ${j.inserted} nous, ${j.updated} actualitzats${j.skipped ? `, ${j.skipped} amb avís` : ''}.`
      );
      load();
    } catch (err) {
      setImportMsg(String(err.message || err));
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div>
          <h1 className="iv-page-title">Propietats</h1>
          <p className="iv-page-sub mb-0">Catàleg i filtres de propietats.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button type="button" onClick={openNew} className="iv-btn w-full sm:w-auto">
            Nova propietat
          </button>
          <label className="iv-btn-secondary w-full cursor-pointer text-center sm:w-auto">
            Importar CSV / Excel
            <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleImport} />
          </label>
        </div>
      </div>
      {importMsg && (
        <p className="mb-4 rounded-xl border border-teal-100 bg-teal-50/80 px-3 py-2 text-sm text-teal-900">
          {importMsg}
        </p>
      )}

      <div className="iv-card mb-6 p-4 sm:p-5">
        <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-500">Filtres</div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <input
          type="search"
          placeholder="Cercar ref, direcció, zona..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="iv-input w-full min-w-0 sm:max-w-xs sm:flex-1"
        />
        <input
          type="text"
          placeholder="Zona"
          value={zona}
          onChange={(e) => {
            setZona(e.target.value);
            setPage(1);
          }}
          className="iv-input w-full sm:w-36"
        />
        <select
          value={tipoOperacion}
          onChange={(e) => {
            setTipoOperacion(e.target.value);
            setPage(1);
          }}
          className="iv-input w-full sm:w-auto"
        >
          <option value="">Operació</option>
          <option value="alquiler">Alquiler</option>
          <option value="compra">Compra</option>
        </select>
        <input
          type="number"
          placeholder="Preu mín"
          value={precioMin}
          onChange={(e) => {
            setPrecioMin(e.target.value);
            setPage(1);
          }}
          className="iv-input w-full sm:w-28"
        />
        <input
          type="number"
          placeholder="Preu màx"
          value={precioMax}
          onChange={(e) => {
            setPrecioMax(e.target.value);
            setPage(1);
          }}
          className="iv-input w-full sm:w-28"
        />
        <input
          type="number"
          placeholder="Habitacions"
          value={habitaciones}
          onChange={(e) => {
            setHabitaciones(e.target.value);
            setPage(1);
          }}
          className="iv-input w-full sm:w-32"
        />
        <select
          value={activoFiltro}
          onChange={(e) => {
            setActivoFiltro(e.target.value);
            setPage(1);
          }}
          className="iv-input w-full sm:w-auto"
        >
          <option value="">Actiu / tots</option>
          <option value="true">Actiu</option>
          <option value="false">Inactiu</option>
        </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-stone-500">
          <span
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-teal-600 border-t-transparent"
            aria-hidden
          />
          Carregant...
        </div>
      ) : (
        <>
          <div className="iv-table-shell">
            <div className="-mx-px overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="iv-table-head">
                  <tr className="text-left">
                    <th className="px-3 py-3 font-medium text-stone-700">Ref</th>
                    <th className="px-3 py-3 font-medium text-stone-700">Zona</th>
                    <th className="px-3 py-3 font-medium text-stone-700">Operació</th>
                    <th className="px-3 py-3 font-medium text-stone-700">Preu</th>
                    <th className="px-3 py-3 font-medium text-stone-700">Hab.</th>
                    <th className="px-3 py-3 font-medium text-stone-700">Actiu</th>
                    <th className="w-40 px-3 py-3 font-medium text-stone-700">Accions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((row) => (
                    <tr key={row.id} className="iv-table-row">
                      <td className="px-3 py-2.5 font-mono text-xs text-stone-800">{row.ref_code}</td>
                      <td className="max-w-[140px] truncate px-3 py-2.5 text-stone-800">{row.zona || '—'}</td>
                      <td className="px-3 py-2.5 text-stone-800">{row.tipo_operacion}</td>
                      <td className="px-3 py-2.5 text-stone-800">{row.precio != null ? `${row.precio} €` : '—'}</td>
                      <td className="px-3 py-2.5 text-stone-800">{row.habitaciones ?? '—'}</td>
                      <td className="px-3 py-2.5 text-stone-800">{row.activo ? 'Sí' : 'No'}</td>
                      <td className="px-3 py-2.5">
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          className="mr-3 font-medium text-teal-700 hover:text-teal-900 hover:underline"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(row.id)}
                          className="font-medium text-red-600 hover:text-red-800 hover:underline"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {data.totalPages > 1 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="iv-btn-secondary px-4 py-2 text-sm disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="rounded-full bg-stone-100 px-3 py-1.5 text-sm text-stone-600">
                Pàgina {page} de {data.totalPages} ({data.total} total)
              </span>
              <button
                type="button"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="iv-btn-secondary px-4 py-2 text-sm disabled:opacity-40"
              >
                Següent
              </button>
            </div>
          )}
        </>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/45 p-4 backdrop-blur-sm">
          <div className="iv-card max-h-[90vh] w-full max-w-lg overflow-y-auto p-6 shadow-2xl ring-1 ring-stone-200/80">
            <h2 className="mb-4 text-lg font-semibold text-stone-900">
              {modal === 'new' ? 'Nova propietat' : 'Editar propietat'}
            </h2>
            <div className="grid gap-3 text-sm">
              <label className="block">
                <span className="text-stone-600">ref_code *</span>
                <input
                  className="iv-input mt-1 w-full"
                  value={form.ref_code}
                  onChange={(e) => setForm((f) => ({ ...f, ref_code: e.target.value }))}
                  disabled={modal === 'edit'}
                />
              </label>
              <label className="block">
                <span className="text-stone-600">Direcció</span>
                <input
                  className="iv-input mt-1 w-full"
                  value={form.direccion}
                  onChange={(e) => setForm((f) => ({ ...f, direccion: e.target.value }))}
                />
              </label>
              <label className="block">
                <span className="text-stone-600">Zona</span>
                <input
                  className="iv-input mt-1 w-full"
                  value={form.zona}
                  onChange={(e) => setForm((f) => ({ ...f, zona: e.target.value }))}
                />
              </label>
              <label className="block">
                <span className="text-stone-600">Operació</span>
                <select
                  className="iv-input mt-1 w-full"
                  value={form.tipo_operacion}
                  onChange={(e) => setForm((f) => ({ ...f, tipo_operacion: e.target.value }))}
                >
                  <option value="alquiler">Alquiler</option>
                  <option value="compra">Compra</option>
                </select>
              </label>
              <label className="block">
                <span className="text-stone-600">Tipus vivenda</span>
                <input
                  className="iv-input mt-1 w-full"
                  value={form.tipo_vivienda}
                  onChange={(e) => setForm((f) => ({ ...f, tipo_vivienda: e.target.value }))}
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label>
                  <span className="text-stone-600">Habitacions</span>
                  <input
                    type="number"
                    className="iv-input mt-1 w-full"
                    value={form.habitaciones}
                    onChange={(e) => setForm((f) => ({ ...f, habitaciones: e.target.value }))}
                  />
                </label>
                <label>
                  <span className="text-stone-600">Banys</span>
                  <input
                    type="number"
                    className="iv-input mt-1 w-full"
                    value={form.banos}
                    onChange={(e) => setForm((f) => ({ ...f, banos: e.target.value }))}
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-stone-600">Preu (€)</span>
                <input
                  type="number"
                  className="iv-input mt-1 w-full"
                  value={form.precio}
                  onChange={(e) => setForm((f) => ({ ...f, precio: e.target.value }))}
                />
              </label>
              <label className="block">
                <span className="text-stone-600">Descripció</span>
                <textarea
                  className="iv-textarea mt-1 w-full"
                  value={form.descripcion}
                  onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                />
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.activo}
                  onChange={(e) => setForm((f) => ({ ...f, activo: e.target.checked }))}
                />
                <span>Actiu</span>
              </label>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setModal(null)} className="iv-btn-secondary w-full sm:w-auto">
                Cancel·lar
              </button>
              <button type="button" onClick={save} disabled={saving} className="iv-btn w-full sm:w-auto">
                {saving ? 'Guardant...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
