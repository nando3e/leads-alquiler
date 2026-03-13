import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

const nav = [
  { to: '/panel', label: 'Dashboard', end: true },
  { to: '/panel/leads', label: 'Leads', end: false },
  { to: '/panel/alert-rules', label: 'Regles d\'alerta', end: false },
  { to: '/panel/alert-sent', label: 'Alertes enviades', end: false },
  { to: '/panel/config', label: 'Configuració', end: false },
  { to: '/panel/agents', label: 'Agents IA', end: false },
  { to: '/panel/chat', label: 'Provar bot', end: false },
];

export default function PanelLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      <aside className="w-56 bg-white border-r border-neutral-200 flex flex-col shrink-0">
        <div className="p-4 border-b border-neutral-100">
          <span className="font-semibold text-neutral-900 text-sm">Panel</span>
        </div>
        <nav className="p-2 flex flex-col gap-0.5">
          {nav.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-neutral-100 text-neutral-900'
                    : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto p-3 border-t border-neutral-100">
          <p className="text-xs text-neutral-500 truncate px-2">{user?.username}</p>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-2 w-full text-left px-3 py-2 rounded-lg text-sm text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
          >
            Sortir
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
