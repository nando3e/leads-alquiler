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

  if (loading) return <p className="text-neutral-500">Carregant...</p>;

  return (
    <div>
      <h2 className="text-lg font-semibold text-neutral-900 mb-4">Alertes enviades</h2>
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="text-left p-3 font-medium text-neutral-700">Data</th>
                <th className="text-left p-3 font-medium text-neutral-700">Regla</th>
                <th className="text-left p-3 font-medium text-neutral-700">Lead</th>
                <th className="text-left p-3 font-medium text-neutral-700">Mòbil</th>
                <th className="text-left p-3 font-medium text-neutral-700">Zona</th>
                <th className="text-left p-3 font-medium text-neutral-700">Preu max</th>
              </tr>
            </thead>
            <tbody>
              {(Array.isArray(list) ? list : []).map((row) => (
                <tr key={row.id} className="border-b border-neutral-100">
                  <td className="p-3 text-neutral-500">
                    {row.sent_at ? new Date(row.sent_at).toLocaleString('ca') : '-'}
                  </td>
                  <td className="p-3">{row.requirement_name}</td>
                  <td className="p-3">{row.nom} {row.cognoms}</td>
                  <td className="p-3">{row.mobil}</td>
                  <td className="p-3">{row.zona}</td>
                  <td className="p-3">{row.preu_max_mensual != null ? `${row.preu_max_mensual} €` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {list.length === 0 && (
        <p className="text-neutral-500 mt-4">Encara no s'ha enviat cap alerta.</p>
      )}
    </div>
  );
}
