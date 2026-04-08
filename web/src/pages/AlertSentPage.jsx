import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';

export default function AlertSentPage() {
  const { api } = useAuth();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/api/alert-sent')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setList(Array.isArray(data) ? data : []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [api]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-stone-500">
        <span
          className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-teal-600 border-t-transparent"
          aria-hidden
        />
        Carregant...
      </div>
    );
  }

  return (
    <div>
      <h1 className="iv-page-title">Alertes enviades</h1>
      <p className="iv-page-sub">Historial d&apos;alertes disparades per les regles.</p>

      <div className="iv-table-shell">
        <div className="-mx-px overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="iv-table-head">
              <tr>
                <th className="p-3 text-left font-medium text-stone-700">Data</th>
                <th className="p-3 text-left font-medium text-stone-700">Regla</th>
                <th className="p-3 text-left font-medium text-stone-700">Lead</th>
                <th className="p-3 text-left font-medium text-stone-700">Mòbil</th>
                <th className="p-3 text-left font-medium text-stone-700">Zona</th>
                <th className="p-3 text-left font-medium text-stone-700">Preu max</th>
              </tr>
            </thead>
            <tbody>
              {(Array.isArray(list) ? list : []).map((row) => (
                <tr key={row.id} className="iv-table-row">
                  <td className="p-3 text-stone-500">
                    {row.sent_at ? new Date(row.sent_at).toLocaleString('ca') : '-'}
                  </td>
                  <td className="p-3 text-stone-800">{row.requirement_name}</td>
                  <td className="p-3 text-stone-800">
                    {row.nom} {row.cognoms}
                  </td>
                  <td className="p-3 text-stone-800">{row.mobil}</td>
                  <td className="p-3 text-stone-800">{row.zona}</td>
                  <td className="p-3 text-stone-800">
                    {row.preu_max_mensual != null ? `${row.preu_max_mensual} €` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {list.length === 0 && (
        <p className="mt-4 flex items-center gap-2 rounded-xl border border-dashed border-stone-200 bg-stone-50/80 px-4 py-6 text-sm text-stone-500">
          Encara no s&apos;ha enviat cap alerta.
        </p>
      )}
    </div>
  );
}
