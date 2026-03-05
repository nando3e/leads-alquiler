import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import {
  ALL_LEAD_COLUMNS,
  getVisibleColumns,
  setVisibleColumns,
  formatCellValue,
} from '../lib/leadColumns.js';

export default function LeadsPage() {
  const { api } = useAuth();
  const [data, setData] = useState({ items: [], total: 0, page: 1, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [zona, setZona] = useState('');
  const [estat, setEstat] = useState('');
  const [visibleCols, setVisibleCols] = useState(getVisibleColumns);
  const [showColPicker, setShowColPicker] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (search) params.set('search', search);
    if (zona) params.set('zona', zona);
    if (estat) params.set('estat', estat);
    api(`/api/leads?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [api, page, search, zona, estat]);

  function toggleColumn(key) {
    const next = visibleCols.includes(key)
      ? visibleCols.filter((k) => k !== key)
      : [...visibleCols, key];
    setVisibleCols(next);
    setVisibleColumns(next);
  }

  async function handleExport() {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (zona) params.set('zona', zona);
    if (estat) params.set('estat', estat);
    const r = await api(`/api/leads/export?${params}`);
    if (!r.ok) return;
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leads.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <input
          type="search"
          placeholder="Cercar per nom, mòbil, DNI..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="rounded-lg border border-neutral-300 px-3 py-2 w-64 text-sm"
        />
        <select
          value={zona}
          onChange={(e) => { setZona(e.target.value); setPage(1); }}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        >
          <option value="">Totes les zones</option>
          <option value="Qualsevol">Qualsevol</option>
          <option value="Olot">Olot</option>
          <option value="Sant Joan les Fonts">Sant Joan les Fonts</option>
          <option value="Rodalies">Rodalies</option>
          <option value="Altres">Altres</option>
        </select>
        <select
          value={estat}
          onChange={(e) => { setEstat(e.target.value); setPage(1); }}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        >
          <option value="">Tots els estats</option>
          <option value="completat">Completat</option>
          <option value="alerta_enviada">Alerta enviada</option>
        </select>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowColPicker((s) => !s)}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm bg-white hover:bg-neutral-50"
          >
            Columnes ({visibleCols.length})
          </button>
          {showColPicker && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowColPicker(false)} />
              <div className="absolute left-0 top-full mt-1 z-20 bg-white rounded-xl border border-neutral-200 shadow-lg p-3 max-h-80 overflow-y-auto min-w-[200px]">
                <p className="text-xs font-medium text-neutral-500 mb-2">Mostrar columnes</p>
                {ALL_LEAD_COLUMNS.map((col) => (
                  <label key={col.key} className="flex items-center gap-2 py-1.5 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={visibleCols.includes(col.key)}
                      onChange={() => toggleColumn(col.key)}
                    />
                    {col.label}
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={handleExport}
          className="rounded-lg bg-neutral-800 text-white px-4 py-2 text-sm font-medium hover:bg-neutral-700"
        >
          Exportar CSV
        </button>
      </div>

      {loading ? (
        <p className="text-neutral-500">Carregant...</p>
      ) : (
        <>
          <p className="text-sm text-neutral-500 mb-2">
            {data.total} lead(s) · pàgina {data.page} de {data.totalPages || 1}
          </p>
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 border-b border-neutral-200">
                  <tr>
                    {visibleCols.map((key) => {
                      const col = ALL_LEAD_COLUMNS.find((c) => c.key === key);
                      return (
                        <th key={key} className="text-left p-3 font-medium text-neutral-700 whitespace-nowrap">
                          {col?.label ?? key}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((lead) => (
                    <tr key={lead.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                      {visibleCols.map((key) => (
                        <td key={key} className="p-3 whitespace-nowrap max-w-[200px] truncate" title={formatCellValue(lead, key)}>
                          {formatCellValue(lead, key)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {data.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-neutral-300 px-3 py-1 text-sm disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="py-1 text-sm text-neutral-600">
                {page} / {data.totalPages}
              </span>
              <button
                type="button"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-neutral-300 px-3 py-1 text-sm disabled:opacity-50"
              >
                Següent
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
