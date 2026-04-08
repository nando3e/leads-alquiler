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
  const [intencioContacte, setIntencioContacte] = useState('');
  const [tempsUltimaEmpresa, setTempsUltimaEmpresa] = useState('');
  const [empresaEspanyola, setEmpresaEspanyola] = useState('');
  const [tipusContracte, setTipusContracte] = useState('');
  const [ingressosNetos, setIngressosNetos] = useState('');
  const [visibleCols, setVisibleCols] = useState(getVisibleColumns);
  const [showColPicker, setShowColPicker] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (search) params.set('search', search);
    if (zona) params.set('zona', zona);
    if (estat) params.set('estat', estat);
    if (intencioContacte) params.set('intencio_contacte', intencioContacte);
    if (tempsUltimaEmpresa) params.set('temps_ultima_empresa', tempsUltimaEmpresa);
    if (empresaEspanyola) params.set('empresa_espanyola', empresaEspanyola);
    if (tipusContracte) params.set('tipus_contracte', tipusContracte);
    if (ingressosNetos) params.set('ingressos_netos_mensuals', ingressosNetos);
    api(`/api/leads?${params}`)
      .then((r) => (r.ok ? r.json() : { items: [], total: 0, page: 1, totalPages: 0 }))
      .then((d) => {
        if (!cancelled) setData({ items: Array.isArray(d?.items) ? d.items : [], total: d?.total ?? 0, page: d?.page ?? 1, totalPages: d?.totalPages ?? 0 });
      })
      .catch(() => {
        if (!cancelled) setData({ items: [], total: 0, page: 1, totalPages: 0 });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [api, page, search, zona, estat, intencioContacte, tempsUltimaEmpresa, empresaEspanyola, tipusContracte, ingressosNetos]);

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
    if (intencioContacte) params.set('intencio_contacte', intencioContacte);
    if (tempsUltimaEmpresa) params.set('temps_ultima_empresa', tempsUltimaEmpresa);
    if (empresaEspanyola) params.set('empresa_espanyola', empresaEspanyola);
    if (tipusContracte) params.set('tipus_contracte', tipusContracte);
    if (ingressosNetos) params.set('ingressos_netos_mensuals', ingressosNetos);
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
      <h1 className="iv-page-title">Leads</h1>
      <p className="iv-page-sub">Cerca, filtra i exporta la llista de contactes.</p>

      <div className="iv-card mb-6 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <input
          type="search"
          placeholder="Cercar per nom, mòbil, DNI..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="iv-input w-full min-w-0 sm:max-w-xs sm:flex-1"
        />
        <select
          value={zona}
          onChange={(e) => { setZona(e.target.value); setPage(1); }}
          className="iv-input min-w-0 text-sm sm:w-auto"
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
          className="iv-input min-w-0 text-sm sm:w-auto"
        >
          <option value="">Tots els estats</option>
          <option value="completat">Completat</option>
          <option value="alerta_enviada">Alerta enviada</option>
        </select>
        <select
          value={intencioContacte}
          onChange={(e) => { setIntencioContacte(e.target.value); setPage(1); }}
          className="iv-input min-w-0 text-sm sm:w-auto"
        >
          <option value="">Intenció contacte</option>
          <option value="mes_info">Més info</option>
          <option value="concertar_visita">Concertar visita</option>
        </select>
        <select
          value={tempsUltimaEmpresa}
          onChange={(e) => { setTempsUltimaEmpresa(e.target.value); setPage(1); }}
          className="iv-input min-w-0 text-sm sm:w-auto"
        >
          <option value="">Temps última empresa</option>
          <option value="menys_dun_any">Menys d&apos;un any</option>
          <option value="dun_a_dos_anys">D&apos;un a dos anys</option>
          <option value="mes_de_dos_anys">Més de dos anys</option>
        </select>
        <select
          value={empresaEspanyola}
          onChange={(e) => { setEmpresaEspanyola(e.target.value); setPage(1); }}
          className="iv-input min-w-0 text-sm sm:w-auto"
        >
          <option value="">Empresa esp.</option>
          <option value="si">Sí</option>
          <option value="no">No</option>
        </select>
        <select
          value={tipusContracte}
          onChange={(e) => { setTipusContracte(e.target.value); setPage(1); }}
          className="iv-input min-w-0 text-sm sm:w-auto"
        >
          <option value="">Contracte</option>
          <option value="fix">Fix</option>
          <option value="temporal">Temporal</option>
        </select>
        <select
          value={ingressosNetos}
          onChange={(e) => { setIngressosNetos(e.target.value); setPage(1); }}
          className="iv-input min-w-0 text-sm sm:w-auto"
        >
          <option value="">Ingressos</option>
          <option value="menys_1600">&lt; 1.600</option>
          <option value="1600_2000">1.600-2.000</option>
          <option value="2000_2400">2.000-2.400</option>
        </select>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowColPicker((s) => !s)}
            className="iv-btn-secondary w-full sm:w-auto"
          >
            Columnes ({visibleCols.length})
          </button>
          {showColPicker && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowColPicker(false)} />
              <div className="absolute left-0 top-full z-20 mt-1 min-w-[220px] max-h-80 overflow-y-auto rounded-2xl border border-stone-200 bg-white p-3 shadow-xl ring-1 ring-stone-200/60 sm:left-auto sm:right-0">
                <p className="mb-2 text-xs font-medium text-stone-500">Mostrar columnes</p>
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
          className="iv-btn w-full sm:ml-auto sm:w-auto"
        >
          Exportar CSV
        </button>
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
          <p className="mb-2 text-sm text-stone-500">
            {data.total} lead(s) · pàgina {data.page} de {data.totalPages || 1}
          </p>
          <div className="iv-table-shell">
            <div className="-mx-px overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="iv-table-head">
                  <tr>
                    {visibleCols.map((key) => {
                      const col = ALL_LEAD_COLUMNS.find((c) => c.key === key);
                      return (
                        <th key={key} className="whitespace-nowrap p-3 text-left font-medium text-stone-700">
                          {col?.label ?? key}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((lead) => (
                    <tr key={lead.id} className="iv-table-row">
                      {visibleCols.map((key) => (
                        <td key={key} className="max-w-[200px] truncate whitespace-nowrap p-3 text-stone-800" title={formatCellValue(lead, key)}>
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
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="iv-btn-secondary px-4 py-2 text-sm disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="rounded-full bg-stone-100 px-3 py-1.5 text-sm tabular-nums text-stone-600">
                {page} / {data.totalPages}
              </span>
              <button
                type="button"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="iv-btn-secondary px-4 py-2 text-sm disabled:opacity-50"
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
