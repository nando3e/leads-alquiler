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
      .then((r) => (r.ok ? r.json() : null))
      .then((data) =>
        setStats(
          data && typeof data === 'object'
            ? data
            : { total: 0, new_today: 0, new_this_week: 0, new_period: null, filters: {} },
        ),
      )
      .catch(() =>
        setStats({ total: 0, new_today: 0, new_this_week: 0, new_period: null, filters: {} }),
      )
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadStats();
  }, [zona, situacioLaboral, periodFrom, periodTo]);

  const statBlocks = [
    { label: 'Total leads', value: stats.total, hint: 'Base completa' },
    { label: 'Nous avui', value: stats.new_today, hint: 'Últimes 24 h' },
    { label: 'Aquesta setmana', value: stats.new_this_week, hint: 'Dilluns a avui' },
    {
      label: 'Període (from – to)',
      value: stats.new_period != null ? stats.new_period : '—',
      hint: 'Dates personalitzades',
    },
  ];

  return (
    <div>
      <h1 className="iv-page-title">Dashboard</h1>
      <p className="iv-page-sub">Resum de leads segons els filtres aplicats.</p>

      <div className="iv-card mb-6 p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">Filtres</span>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-0 flex-1 sm:min-w-[10rem]">
            <label className="mb-1 block text-xs font-medium text-stone-600">Zona</label>
            <select
              value={zona}
              onChange={(e) => setZona(e.target.value)}
              className="iv-input w-full"
            >
              {ZONA_OPTS.map((v) => (
                <option key={v || 'all'} value={v}>
                  {v || 'Totes les zones'}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0 flex-1 sm:min-w-[10rem]">
            <label className="mb-1 block text-xs font-medium text-stone-600">Situació laboral</label>
            <select
              value={situacioLaboral}
              onChange={(e) => setSituacioLaboral(e.target.value)}
              className="iv-input w-full"
            >
              {SITUACIO_OPTS.map((v) => (
                <option key={v || 'all'} value={v}>
                  {v || 'Tota situació laboral'}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap items-end gap-2 border-t border-stone-100 pt-3 sm:border-t-0 sm:pt-0">
            <span className="mb-2 hidden text-xs text-stone-500 sm:inline">Període:</span>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600">Des de</label>
              <input
                type="date"
                value={periodFrom}
                onChange={(e) => setPeriodFrom(e.target.value)}
                className="iv-input w-full min-w-[10rem]"
              />
            </div>
            <span className="mb-2 text-stone-400">→</span>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600">Fins</label>
              <input
                type="date"
                value={periodTo}
                onChange={(e) => setPeriodTo(e.target.value)}
                className="iv-input w-full min-w-[10rem]"
              />
            </div>
          </div>
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statBlocks.map(({ label, value, hint }) => (
            <div key={label} className="iv-stat-card pl-5">
              <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-stone-900">{value}</p>
              <p className="mt-2 text-xs text-stone-400">{hint}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
