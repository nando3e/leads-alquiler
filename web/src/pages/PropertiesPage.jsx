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
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <h1 className="text-xl font-semibold text-neutral-900 w-full sm:w-auto">Propietats</h1>
        <button
          type="button"
          onClick={openNew}
          className="rounded-lg bg-neutral-900 text-white px-4 py-2 text-sm font-medium"
        >
          Nova propietat
        </button>
        <label className="rounded-lg border border-neutral-300 px-4 py-2 text-sm cursor-pointer hover:bg-neutral-50">
          Importar CSV / Excel
          <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleImport} />
        </label>
        {importMsg && <span className="text-sm text-neutral-600">{importMsg}</span>}
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="search"
          placeholder="Cercar ref, direcció, zona..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-neutral-300 px-3 py-2 w-64 text-sm"
        />
        <input
          type="text"
          placeholder="Zona"
          value={zona}
          onChange={(e) => {
            setZona(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-neutral-300 px-3 py-2 w-36 text-sm"
        />
        <select
          value={tipoOperacion}
          onChange={(e) => {
            setTipoOperacion(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
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
          className="rounded-lg border border-neutral-300 px-3 py-2 w-24 text-sm"
        />
        <input
          type="number"
          placeholder="Preu màx"
          value={precioMax}
          onChange={(e) => {
            setPrecioMax(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-neutral-300 px-3 py-2 w-24 text-sm"
        />
        <input
          type="number"
          placeholder="Habitacions"
          value={habitaciones}
          onChange={(e) => {
            setHabitaciones(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-neutral-300 px-3 py-2 w-28 text-sm"
        />
        <select
          value={activoFiltro}
          onChange={(e) => {
            setActivoFiltro(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        >
          <option value="">Actiu / tots</option>
          <option value="true">Actiu</option>
          <option value="false">Inactiu</option>
        </select>
      </div>

      {loading ? (
        <p className="text-neutral-500 text-sm">Carregant...</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-left">
                  <th className="px-3 py-2 font-medium">Ref</th>
                  <th className="px-3 py-2 font-medium">Zona</th>
                  <th className="px-3 py-2 font-medium">Operació</th>
                  <th className="px-3 py-2 font-medium">Preu</th>
                  <th className="px-3 py-2 font-medium">Hab.</th>
                  <th className="px-3 py-2 font-medium">Actiu</th>
                  <th className="px-3 py-2 font-medium w-40">Accions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((row) => (
                  <tr key={row.id} className="border-b border-neutral-100 hover:bg-neutral-50/80">
                    <td className="px-3 py-2 font-mono text-xs">{row.ref_code}</td>
                    <td className="px-3 py-2 max-w-[140px] truncate">{row.zona || '—'}</td>
                    <td className="px-3 py-2">{row.tipo_operacion}</td>
                    <td className="px-3 py-2">{row.precio != null ? `${row.precio} €` : '—'}</td>
                    <td className="px-3 py-2">{row.habitaciones ?? '—'}</td>
                    <td className="px-3 py-2">{row.activo ? 'Sí' : 'No'}</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => openEdit(row)}
                        className="text-blue-600 hover:underline mr-3"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(row.id)}
                        className="text-red-600 hover:underline"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.totalPages > 1 && (
            <div className="flex items-center gap-2 mt-4">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 rounded border text-sm disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="text-sm text-neutral-600">
                Pàgina {page} de {data.totalPages} ({data.total} total)
              </span>
              <button
                type="button"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 rounded border text-sm disabled:opacity-40"
              >
                Següent
              </button>
            </div>
          )}
        </>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl">
            <h2 className="text-lg font-semibold mb-4">
              {modal === 'new' ? 'Nova propietat' : 'Editar propietat'}
            </h2>
            <div className="grid gap-3 text-sm">
              <label className="block">
                <span className="text-neutral-600">ref_code *</span>
                <input
                  className="mt-1 w-full rounded border px-3 py-2"
                  value={form.ref_code}
                  onChange={(e) => setForm((f) => ({ ...f, ref_code: e.target.value }))}
                  disabled={modal === 'edit'}
                />
              </label>
              <label className="block">
                <span className="text-neutral-600">Direcció</span>
                <input
                  className="mt-1 w-full rounded border px-3 py-2"
                  value={form.direccion}
                  onChange={(e) => setForm((f) => ({ ...f, direccion: e.target.value }))}
                />
              </label>
              <label className="block">
                <span className="text-neutral-600">Zona</span>
                <input
                  className="mt-1 w-full rounded border px-3 py-2"
                  value={form.zona}
                  onChange={(e) => setForm((f) => ({ ...f, zona: e.target.value }))}
                />
              </label>
              <label className="block">
                <span className="text-neutral-600">Operació</span>
                <select
                  className="mt-1 w-full rounded border px-3 py-2"
                  value={form.tipo_operacion}
                  onChange={(e) => setForm((f) => ({ ...f, tipo_operacion: e.target.value }))}
                >
                  <option value="alquiler">Alquiler</option>
                  <option value="compra">Compra</option>
                </select>
              </label>
              <label className="block">
                <span className="text-neutral-600">Tipus vivenda</span>
                <input
                  className="mt-1 w-full rounded border px-3 py-2"
                  value={form.tipo_vivienda}
                  onChange={(e) => setForm((f) => ({ ...f, tipo_vivienda: e.target.value }))}
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label>
                  <span className="text-neutral-600">Habitacions</span>
                  <input
                    type="number"
                    className="mt-1 w-full rounded border px-3 py-2"
                    value={form.habitaciones}
                    onChange={(e) => setForm((f) => ({ ...f, habitaciones: e.target.value }))}
                  />
                </label>
                <label>
                  <span className="text-neutral-600">Banys</span>
                  <input
                    type="number"
                    className="mt-1 w-full rounded border px-3 py-2"
                    value={form.banos}
                    onChange={(e) => setForm((f) => ({ ...f, banos: e.target.value }))}
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-neutral-600">Preu (€)</span>
                <input
                  type="number"
                  className="mt-1 w-full rounded border px-3 py-2"
                  value={form.precio}
                  onChange={(e) => setForm((f) => ({ ...f, precio: e.target.value }))}
                />
              </label>
              <label className="block">
                <span className="text-neutral-600">Descripció</span>
                <textarea
                  className="mt-1 w-full rounded border px-3 py-2 min-h-[80px]"
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
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="px-4 py-2 rounded-lg border text-sm"
              >
                Cancel·lar
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm disabled:opacity-50"
              >
                {saving ? 'Guardant...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
