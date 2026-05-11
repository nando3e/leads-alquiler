import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../lib/auth';
import {
  ALL_LEAD_COLUMNS,
  getVisibleColumns,
  setVisibleColumns,
  formatCellValue,
} from '../lib/leadColumns.js';

function IconPencil() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  );
}
function IconTrash() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}
function IconPlus() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

const EMPTY_FORM = {
  nom: '', cognoms: '', dni_nie: '', mobil: '', fix: '',
  tipus_immoble: 'no_importa', preu_max_mensual: '', moblat: 'no_importa',
  habitacions_min: '', banys_min: '', parking: 'no_importa', ascensor: 'no_importa',
  calefaccio: 'no_importa', altres: '', zona: 'Qualsevol', zona_altres: '',
  origen: '', referencia: '', intencio_contacte: '',
  situacio_laboral: '', sector_professio: '',
  temps_ultima_empresa: '', empresa_espanyola: '', tipus_contracte: '', ingressos_netos_mensuals: '',
  edat: '', mascotes: 'no', quanta_gent_viura: '', menors: '', observacions: '', lang: 'ca',
};

function LeadFormModal({ lead, onClose, onSaved, api }) {
  const isEdit = !!lead;
  const [form, setForm] = useState(() => {
    if (lead) {
      const f = {};
      for (const k of Object.keys(EMPTY_FORM)) f[k] = lead[k] ?? EMPTY_FORM[k];
      if (f.preu_max_mensual === 0) f.preu_max_mensual = '';
      return f;
    }
    return { ...EMPTY_FORM };
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set(key, val) { setForm((f) => ({ ...f, [key]: val })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const body = { ...form };
      if (body.preu_max_mensual === '') body.preu_max_mensual = 0;
      if (body.edat === '') body.edat = null;
      if (body.menors === '') body.menors = null;

      let r;
      if (isEdit) {
        r = await api(`/api/leads/${lead.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        r = await api('/api/leads/panel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        throw new Error(data.message || data.error || 'Error');
      }
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-stone-900/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed inset-4 z-50 mx-auto flex max-w-3xl items-start justify-center overflow-y-auto pt-8 pb-8">
        <form onSubmit={handleSubmit} className="w-full rounded-2xl border border-stone-200 bg-white shadow-2xl">
          <div className="border-b border-stone-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-stone-900">{isEdit ? 'Editar lead' : 'Nou lead'}</h2>
          </div>

          <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-6">
            <fieldset>
              <legend className="mb-3 text-sm font-semibold text-stone-600 uppercase tracking-wider">Dades personals</legend>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs text-stone-500">Nom</span>
                  <input className="iv-input w-full" value={form.nom} onChange={(e) => set('nom', e.target.value)} />
                </label>
                <label className="block">
                  <span className="text-xs text-stone-500">Cognoms</span>
                  <input className="iv-input w-full" value={form.cognoms} onChange={(e) => set('cognoms', e.target.value)} />
                </label>
                <label className="block">
                  <span className="text-xs text-stone-500">DNI / NIE</span>
                  <input className="iv-input w-full" value={form.dni_nie} onChange={(e) => set('dni_nie', e.target.value)} />
                </label>
                <label className="block">
                  <span className="text-xs text-stone-500">Mòbil</span>
                  <input className="iv-input w-full" value={form.mobil} onChange={(e) => set('mobil', e.target.value)} />
                </label>
                <label className="block">
                  <span className="text-xs text-stone-500">Fix</span>
                  <input className="iv-input w-full" value={form.fix} onChange={(e) => set('fix', e.target.value)} />
                </label>
                <label className="block">
                  <span className="text-xs text-stone-500">Edat</span>
                  <input type="number" className="iv-input w-full" value={form.edat} onChange={(e) => set('edat', e.target.value)} />
                </label>
                <label className="block">
                  <span className="text-xs text-stone-500">Idioma</span>
                  <select className="iv-input w-full" value={form.lang} onChange={(e) => set('lang', e.target.value)}>
                    <option value="ca">Català</option>
                    <option value="es">Castellà</option>
                    <option value="en">English</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs text-stone-500">Origen</span>
                  <input className="iv-input w-full" value={form.origen} onChange={(e) => set('origen', e.target.value)} placeholder="web, idealista, wallapop..." />
                </label>
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-3 text-sm font-semibold text-stone-600 uppercase tracking-wider">Habitatge buscat</legend>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <label className="block">
                  <span className="text-xs text-stone-500">Tipus immoble</span>
                  <select className="iv-input w-full" value={form.tipus_immoble} onChange={(e) => set('tipus_immoble', e.target.value)}>
                    <option value="no_importa">No importa</option>
                    <option value="pis">Pis</option>
                    <option value="casa">Casa</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs text-stone-500">Preu màx. mensual</span>
                  <input type="number" className="iv-input w-full" value={form.preu_max_mensual} onChange={(e) => set('preu_max_mensual', e.target.value)} placeholder="€/mes" />
                </label>
                <label className="block">
                  <span className="text-xs text-stone-500">Moblat</span>
                  <select className="iv-input w-full" value={form.moblat} onChange={(e) => set('moblat', e.target.value)}>
                    <option value="no_importa">No importa</option>
                    <option value="si">Sí</option>
                    <option value="no">No</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs text-stone-500">Habitacions mín.</span>
                  <select className="iv-input w-full" value={form.habitacions_min} onChange={(e) => set('habitacions_min', e.target.value)}>
                    <option value="">No importa</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5_mes">5 o més</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs text-stone-500">Banys mín.</span>
                  <select className="iv-input w-full" value={form.banys_min} onChange={(e) => set('banys_min', e.target.value)}>
                    <option value="">No importa</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3_mes">3 o més</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs text-stone-500">Pàrquing</span>
                  <select className="iv-input w-full" value={form.parking} onChange={(e) => set('parking', e.target.value)}>
                    <option value="no_importa">No importa</option>
                    <option value="si">Sí</option>
                    <option value="no">No</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs text-stone-500">Ascensor</span>
                  <select className="iv-input w-full" value={form.ascensor} onChange={(e) => set('ascensor', e.target.value)}>
                    <option value="no_importa">No importa</option>
                    <option value="si">Sí</option>
                    <option value="no">No</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs text-stone-500">Calefacció</span>
                  <select className="iv-input w-full" value={form.calefaccio} onChange={(e) => set('calefaccio', e.target.value)}>
                    <option value="no_importa">No importa</option>
                    <option value="si">Sí</option>
                    <option value="no">No</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs text-stone-500">Mascotes</span>
                  <select className="iv-input w-full" value={form.mascotes} onChange={(e) => set('mascotes', e.target.value)}>
                    <option value="no">No</option>
                    <option value="si">Sí</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs text-stone-500">Zona</span>
                  <select className="iv-input w-full" value={form.zona} onChange={(e) => set('zona', e.target.value)}>
                    <option value="Qualsevol">Qualsevol</option>
                    <option value="Olot">Olot</option>
                    <option value="Sant Joan les Fonts">Sant Joan les Fonts</option>
                    <option value="Rodalies">Rodalies</option>
                    <option value="Altres">Altres</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs text-stone-500">Zona (altres)</span>
                  <input className="iv-input w-full" value={form.zona_altres} onChange={(e) => set('zona_altres', e.target.value)} />
                </label>
                <label className="block">
                  <span className="text-xs text-stone-500">Quanta gent viurà</span>
                  <input className="iv-input w-full" value={form.quanta_gent_viura} onChange={(e) => set('quanta_gent_viura', e.target.value)} />
                </label>
                <label className="block">
                  <span className="text-xs text-stone-500">Menors</span>
                  <input type="number" className="iv-input w-full" value={form.menors} onChange={(e) => set('menors', e.target.value)} />
                </label>
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-3 text-sm font-semibold text-stone-600 uppercase tracking-wider">Situació laboral</legend>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs text-stone-500">Situació laboral</span>
                  <input className="iv-input w-full" value={form.situacio_laboral} onChange={(e) => set('situacio_laboral', e.target.value)} />
                </label>
                <label className="block">
                  <span className="text-xs text-stone-500">Sector / professió</span>
                  <input className="iv-input w-full" value={form.sector_professio} onChange={(e) => set('sector_professio', e.target.value)} />
                </label>
                <label className="block">
                  <span className="text-xs text-stone-500">Temps última empresa</span>
                  <select className="iv-input w-full" value={form.temps_ultima_empresa} onChange={(e) => set('temps_ultima_empresa', e.target.value)}>
                    <option value="">—</option>
                    <option value="menys_dun_any">Menys d&apos;un any</option>
                    <option value="dun_a_dos_anys">D&apos;un a dos anys</option>
                    <option value="mes_de_dos_anys">Més de dos anys</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs text-stone-500">Empresa espanyola</span>
                  <select className="iv-input w-full" value={form.empresa_espanyola} onChange={(e) => set('empresa_espanyola', e.target.value)}>
                    <option value="">—</option>
                    <option value="si">Sí</option>
                    <option value="no">No</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs text-stone-500">Tipus contracte</span>
                  <select className="iv-input w-full" value={form.tipus_contracte} onChange={(e) => set('tipus_contracte', e.target.value)}>
                    <option value="">—</option>
                    <option value="fix">Fix</option>
                    <option value="temporal">Temporal</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs text-stone-500">Ingressos nets mensuals</span>
                  <select className="iv-input w-full" value={form.ingressos_netos_mensuals} onChange={(e) => set('ingressos_netos_mensuals', e.target.value)}>
                    <option value="">—</option>
                    <option value="menys_1600">&lt; 1.600 €</option>
                    <option value="1600_2000">1.600 - 2.000 €</option>
                    <option value="2000_2400">2.000 - 2.400 €</option>
                  </select>
                </label>
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-3 text-sm font-semibold text-stone-600 uppercase tracking-wider">Altres</legend>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs text-stone-500">Intenció de contacte</span>
                  <select className="iv-input w-full" value={form.intencio_contacte} onChange={(e) => set('intencio_contacte', e.target.value)}>
                    <option value="">—</option>
                    <option value="mes_info">Més info</option>
                    <option value="concertar_visita">Concertar visita</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs text-stone-500">Referència anunci</span>
                  <input className="iv-input w-full" value={form.referencia} onChange={(e) => set('referencia', e.target.value)} />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-xs text-stone-500">Altres</span>
                  <input className="iv-input w-full" value={form.altres} onChange={(e) => set('altres', e.target.value)} />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-xs text-stone-500">Observacions</span>
                  <textarea rows={3} className="iv-input w-full" value={form.observacions} onChange={(e) => set('observacions', e.target.value)} />
                </label>
              </div>
            </fieldset>
          </div>

          {error && (
            <div className="mx-6 mb-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-stone-200 px-6 py-4">
            <button type="button" onClick={onClose} className="iv-btn-secondary px-5 py-2.5">Cancel·lar</button>
            <button type="submit" disabled={saving} className="iv-btn px-5 py-2.5">
              {saving ? 'Desant...' : isEdit ? 'Desar canvis' : 'Crear lead'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

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
  const [modalLead, setModalLead] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const loadData = useCallback(() => {
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
        setData({ items: Array.isArray(d?.items) ? d.items : [], total: d?.total ?? 0, page: d?.page ?? 1, totalPages: d?.totalPages ?? 0 });
      })
      .catch(() => {
        setData({ items: [], total: 0, page: 1, totalPages: 0 });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [api, page, search, zona, estat, intencioContacte, tempsUltimaEmpresa, empresaEspanyola, tipusContracte, ingressosNetos]);

  useEffect(() => { loadData(); }, [loadData]);

  function toggleColumn(key) {
    const next = visibleCols.includes(key)
      ? visibleCols.filter((k) => k !== key)
      : [...visibleCols, key];
    setVisibleCols(next);
    setVisibleColumns(next);
  }

  function openCreate() { setModalLead(null); setShowModal(true); }
  function openEdit(lead) { setModalLead(lead); setShowModal(true); }
  function closeModal() { setShowModal(false); setModalLead(null); }
  function handleSaved() { closeModal(); loadData(); }

  async function handleDelete(id) {
    if (!confirm('Eliminar aquest lead?')) return;
    const r = await api(`/api/leads/${id}`, { method: 'DELETE' });
    if (r.ok) loadData();
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
      <div className="mb-1 flex items-center justify-between">
        <div>
          <h1 className="iv-page-title">Leads</h1>
          <p className="iv-page-sub">Cerca, filtra, crea i edita la llista de contactes.</p>
        </div>
        <button type="button" onClick={openCreate} className="iv-btn flex items-center gap-2">
          <IconPlus /> Nou lead
        </button>
      </div>

      <div className="iv-card mb-6 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <input
          type="search"
          placeholder="Cercar per nom, mòbil, DNI..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="iv-input w-full min-w-0 sm:max-w-xs sm:flex-1"
        />
        <select value={zona} onChange={(e) => { setZona(e.target.value); setPage(1); }} className="iv-input min-w-0 text-sm sm:w-auto">
          <option value="">Totes les zones</option>
          <option value="Qualsevol">Qualsevol</option>
          <option value="Olot">Olot</option>
          <option value="Sant Joan les Fonts">Sant Joan les Fonts</option>
          <option value="Rodalies">Rodalies</option>
          <option value="Altres">Altres</option>
        </select>
        <select value={estat} onChange={(e) => { setEstat(e.target.value); setPage(1); }} className="iv-input min-w-0 text-sm sm:w-auto">
          <option value="">Tots els estats</option>
          <option value="completat">Completat</option>
          <option value="alerta_enviada">Alerta enviada</option>
        </select>
        <select value={intencioContacte} onChange={(e) => { setIntencioContacte(e.target.value); setPage(1); }} className="iv-input min-w-0 text-sm sm:w-auto">
          <option value="">Intenció contacte</option>
          <option value="mes_info">Més info</option>
          <option value="concertar_visita">Concertar visita</option>
        </select>
        <select value={tempsUltimaEmpresa} onChange={(e) => { setTempsUltimaEmpresa(e.target.value); setPage(1); }} className="iv-input min-w-0 text-sm sm:w-auto">
          <option value="">Temps última empresa</option>
          <option value="menys_dun_any">Menys d&apos;un any</option>
          <option value="dun_a_dos_anys">D&apos;un a dos anys</option>
          <option value="mes_de_dos_anys">Més de dos anys</option>
        </select>
        <select value={empresaEspanyola} onChange={(e) => { setEmpresaEspanyola(e.target.value); setPage(1); }} className="iv-input min-w-0 text-sm sm:w-auto">
          <option value="">Empresa esp.</option>
          <option value="si">Sí</option>
          <option value="no">No</option>
        </select>
        <select value={tipusContracte} onChange={(e) => { setTipusContracte(e.target.value); setPage(1); }} className="iv-input min-w-0 text-sm sm:w-auto">
          <option value="">Contracte</option>
          <option value="fix">Fix</option>
          <option value="temporal">Temporal</option>
        </select>
        <select value={ingressosNetos} onChange={(e) => { setIngressosNetos(e.target.value); setPage(1); }} className="iv-input min-w-0 text-sm sm:w-auto">
          <option value="">Ingressos</option>
          <option value="menys_1600">&lt; 1.600</option>
          <option value="1600_2000">1.600-2.000</option>
          <option value="2000_2400">2.000-2.400</option>
        </select>
        <div className="relative">
          <button type="button" onClick={() => setShowColPicker((s) => !s)} className="iv-btn-secondary w-full sm:w-auto">
            Columnes ({visibleCols.length})
          </button>
          {showColPicker && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowColPicker(false)} />
              <div className="absolute left-0 top-full z-20 mt-1 min-w-[220px] max-h-80 overflow-y-auto rounded-2xl border border-stone-200 bg-white p-3 shadow-xl ring-1 ring-stone-200/60 sm:left-auto sm:right-0">
                <p className="mb-2 text-xs font-medium text-stone-500">Mostrar columnes</p>
                {ALL_LEAD_COLUMNS.map((col) => (
                  <label key={col.key} className="flex items-center gap-2 py-1.5 text-sm cursor-pointer">
                    <input type="checkbox" checked={visibleCols.includes(col.key)} onChange={() => toggleColumn(col.key)} />
                    {col.label}
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
        <button type="button" onClick={handleExport} className="iv-btn-secondary w-full sm:ml-auto sm:w-auto">
          Exportar CSV
        </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-stone-500">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" aria-hidden />
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
                    <th className="w-20 p-3 text-center font-medium text-stone-700">Accions</th>
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
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openEdit(lead)} className="rounded-lg p-1.5 text-stone-400 hover:bg-teal-50 hover:text-teal-600" title="Editar">
                            <IconPencil />
                          </button>
                          <button onClick={() => handleDelete(lead.id)} className="rounded-lg p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-500" title="Eliminar">
                            <IconTrash />
                          </button>
                        </div>
                      </td>
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
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="iv-btn-secondary px-4 py-2 text-sm disabled:opacity-50">
                Anterior
              </button>
              <span className="rounded-full bg-stone-100 px-3 py-1.5 text-sm tabular-nums text-stone-600">
                {page} / {data.totalPages}
              </span>
              <button type="button" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)} className="iv-btn-secondary px-4 py-2 text-sm disabled:opacity-50">
                Següent
              </button>
            </div>
          )}
        </>
      )}

      {showModal && (
        <LeadFormModal
          lead={modalLead}
          onClose={closeModal}
          onSaved={handleSaved}
          api={api}
        />
      )}
    </div>
  );
}
