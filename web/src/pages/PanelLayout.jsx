import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';

const nav = [
  { to: '/panel', label: 'Dashboard', end: true },
  { to: '/panel/leads', label: 'Leads', end: false },
  { to: '/panel/properties', label: 'Propietats', end: false },
  { to: '/panel/alert-rules', label: "Regles d'alerta", end: false },
  { to: '/panel/alert-sent', label: 'Alertes enviades', end: false },
];

function MenuIcon() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function BrandMark() {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-sm ring-1 ring-teal-600/20">
      <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    </div>
  );
}

export default function PanelLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-stone-50 to-stone-100/90 lg:flex-row">
      <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-stone-200/80 bg-white/90 px-4 py-3 backdrop-blur-md lg:hidden">
        <button
          type="button"
          className="-ml-2 rounded-xl p-2 text-stone-700 hover:bg-stone-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40"
          onClick={() => setMobileOpen(true)}
          aria-expanded={mobileOpen}
          aria-controls="panel-sidebar"
          aria-label="Obrir menú de navegació"
        >
          <MenuIcon />
        </button>
        <span className="truncate text-center text-sm font-semibold tracking-tight text-stone-900">
          Inmobiliaria Virtual
        </span>
        <div className="w-10 shrink-0" aria-hidden />
      </header>

      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-stone-900/40 backdrop-blur-[2px] lg:hidden"
          aria-label="Tancar menú"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        id="panel-sidebar"
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(18rem,92vw)] max-w-full flex-col border-r border-stone-200/80 bg-white shadow-2xl transition-transform duration-200 ease-out lg:static lg:z-0 lg:w-60 lg:max-w-none lg:translate-x-0 lg:shadow-none ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="border-b border-stone-200/80 bg-gradient-to-br from-white via-white to-teal-50/50 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <BrandMark />
              <div className="min-w-0">
                <span className="block text-sm font-semibold leading-snug tracking-tight text-stone-900">
                  Inmobiliaria Virtual
                </span>
                <span className="text-[10px] font-medium uppercase tracking-widest text-stone-500">
                  Gestió de leads
                </span>
              </div>
            </div>
            <button
              type="button"
              className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40 lg:hidden"
              onClick={() => setMobileOpen(false)}
              aria-label="Tancar menú"
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2" aria-label="Navegació principal">
          {nav.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `iv-nav-link ${isActive ? 'iv-nav-link-active' : 'iv-nav-link-idle'}`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-stone-200/80 bg-stone-50/60 p-3">
          <p className="truncate px-2 text-xs text-stone-500" title={user?.username}>
            {user?.username}
          </p>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-2 w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-stone-600 transition-colors hover:bg-white hover:text-stone-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30"
          >
            Sortir
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}
