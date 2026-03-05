import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';

const ZONA_OPTS = ['', 'Qualsevol', 'Olot', 'Sant Joan les Fonts', 'Rodalies', 'Altres'];
const SITUACIO_OPTS = ['', 'empleat', 'autonom', 'aturat', 'estudiant', 'jubilat', 'altres'];

export default function DashboardPage() {
  const { api } = useAuth();
  const [stats, setStats] = useState({
    total: 0,
    new_today: 0,
    new_this_week: 0,
    new_period: null,
    filters: {},
  });
  const [loading, setLoading] = useState(true);
  const [zona, setZona] = useState('');
  const [situacioLaboral, setSituacioLaboral] = useState('');
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');

  function loadStats() {
    setLoading(true);
    const params = new URLSearchParams();
    if (zona) params.set('zona', zona);
    if (situacioLaboral) params.set('situacio_laboral', situacioLaboral);
    if (periodFrom) params.set('from', periodFrom);
    if (periodTo) params.set('to', periodTo);
    api(`/api/dashboard/stats?${params}`)
      .then((r) => r.json())
      .then(setStats)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadStats();
  }, [zona, situacioLaboral, periodFrom, periodTo]);

  return (
    <div>
      <h1 className="text-xl font-semibold text-neutral-900 mb-6">Dashboard</h1>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <span className="text-sm font-medium text-neutral-700">Filtres:</span>
        <select
          value={zona}
          onChange={(e) => setZona(e.target.value)}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm bg-white"
        >
          {ZONA_OPTS.map((v) => (
            <option key={v || 'all'} value={v}>{v || 'Totes les zones'}</option>
          ))}
        </select>
        <select
          value={situacioLaboral}
          onChange={(e) => setSituacioLaboral(e.target.value)}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm bg-white"
        >
          {SITUACIO_OPTS.map((v) => (
            <option key={v || 'all'} value={v}>
              {v || 'Tota situació laboral'}
            </option>
          ))}
        </select>
        <span className="text-sm text-neutral-500">Període personalitzat:</span>
        <input
          type="date"
          value={periodFrom}
          onChange={(e) => setPeriodFrom(e.target.value)}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
        <span className="text-neutral-400">fins</span>
        <input
          type="date"
          value={periodTo}
          onChange={(e) => setPeriodTo(e.target.value)}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>

      {loading ? (
        <p className="text-neutral-500">Carregant...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-neutral-200 p-5">
            <p className="text-sm text-neutral-500 mb-1">Total leads</p>
            <p className="text-2xl font-semibold text-neutral-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl border border-neutral-200 p-5">
            <p className="text-sm text-neutral-500 mb-1">Nous avui</p>
            <p className="text-2xl font-semibold text-neutral-900">{stats.new_today}</p>
          </div>
          <div className="bg-white rounded-xl border border-neutral-200 p-5">
            <p className="text-sm text-neutral-500 mb-1">Aquesta setmana</p>
            <p className="text-2xl font-semibold text-neutral-900">{stats.new_this_week}</p>
          </div>
          <div className="bg-white rounded-xl border border-neutral-200 p-5">
            <p className="text-sm text-neutral-500 mb-1">Període (from – to)</p>
            <p className="text-2xl font-semibold text-neutral-900">
              {stats.new_period != null ? stats.new_period : '—'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
