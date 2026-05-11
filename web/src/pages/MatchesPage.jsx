import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../lib/auth';

function IconTrash() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function ScoreBadge({ score }) {
  if (score == null) {
    return <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">SQL</span>;
  }
  const pct = Math.round(score * 100);
  const color =
    pct >= 85 ? 'bg-emerald-100 text-emerald-700'
    : pct >= 70 ? 'bg-amber-100 text-amber-700'
    : 'bg-stone-100 text-stone-500';
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>{pct}%</span>;
}

function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleString('ca', { dateStyle: 'short', timeStyle: 'short' });
}

function formatPrecio(v) {
  if (v == null) return '-';
  return Number(v).toLocaleString('es-ES', { maximumFractionDigits: 0 }) + ' €';
}

export default function MatchesPage() {
  const { api } = useAuth();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api(`/api/matches?page=${page}&limit=${limit}`);
      if (r.ok) {
        const data = await r.json();
        setItems(data.items || []);
        setTotal(data.total || 0);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [api, page]);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id) {
    if (!confirm('Eliminar aquest match?')) return;
    const r = await api(`/api/matches/${id}`, { method: 'DELETE' });
    if (r.ok) load();
  }

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div>
      <h1 className="iv-page-title">Matches Propiedad-Lead</h1>
      <p className="iv-page-sub">
        Parelles propiedad ↔ lead trobades pel motor de matching (SQL + semàntic).
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-stone-500">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" aria-hidden />
          Carregant...
        </div>
      ) : items.length === 0 ? (
        <p className="mt-4 flex items-center gap-2 rounded-xl border border-dashed border-stone-200 bg-stone-50/80 px-4 py-6 text-sm text-stone-500">
          Encara no hi ha cap match.
        </p>
      ) : (
        <>
          <div className="iv-table-shell">
            <div className="-mx-px overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="iv-table-head">
                  <tr>
                    <th className="p-3 text-left font-medium text-stone-700">Data</th>
                    <th className="p-3 text-left font-medium text-stone-700">Propietat</th>
                    <th className="p-3 text-left font-medium text-stone-700">Zona prop.</th>
                    <th className="p-3 text-right font-medium text-stone-700">Preu</th>
                    <th className="p-3 text-left font-medium text-stone-700">Lead</th>
                    <th className="p-3 text-left font-medium text-stone-700">Mòbil</th>
                    <th className="p-3 text-left font-medium text-stone-700">Zona lead</th>
                    <th className="p-3 text-right font-medium text-stone-700">Preu max</th>
                    <th className="p-3 text-center font-medium text-stone-700">Score</th>
                    <th className="p-3 text-center font-medium text-stone-700">Font</th>
                    <th className="p-3 text-center font-medium text-stone-700" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((m) => (
                    <tr key={m.id} className="iv-table-row">
                      <td className="p-3 text-stone-500">{formatDate(m.created_at)}</td>
                      <td className="p-3 font-medium text-stone-800">
                        {m.ref_code}
                        {m.prop_tipo_vivienda ? ` — ${m.prop_tipo_vivienda}` : ''}
                      </td>
                      <td className="p-3 text-stone-800">{m.prop_zona || '-'}</td>
                      <td className="p-3 text-right text-stone-800">{formatPrecio(m.prop_precio)}</td>
                      <td className="p-3 text-stone-800">{m.lead_nom} {m.lead_cognoms}</td>
                      <td className="p-3 text-stone-800">{m.lead_mobil || '-'}</td>
                      <td className="p-3 text-stone-800">{m.lead_zona || '-'}</td>
                      <td className="p-3 text-right text-stone-800">{formatPrecio(m.lead_preu_max)}</td>
                      <td className="p-3 text-center"><ScoreBadge score={m.match_score} /></td>
                      <td className="p-3 text-center">
                        <span className={`rounded-full px-2 py-0.5 text-xs ${
                          m.match_source === 'event'
                            ? 'bg-blue-50 text-blue-600'
                            : 'bg-purple-50 text-purple-600'
                        }`}>
                          {m.match_source === 'event' ? 'Temps real' : 'Cron'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleDelete(m.id)}
                          className="rounded-lg p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-500"
                          title="Eliminar match"
                        >
                          <IconTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-stone-500">
            <span>{total} match{total !== 1 ? 'es' : ''}</span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-stone-200 px-3 py-1.5 hover:bg-stone-50 disabled:opacity-40"
              >
                Anterior
              </button>
              <span>{page} / {totalPages}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-stone-200 px-3 py-1.5 hover:bg-stone-50 disabled:opacity-40"
              >
                Següent
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
