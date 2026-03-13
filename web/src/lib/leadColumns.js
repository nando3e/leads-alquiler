// Totes les columnes possibles per la vista de leads (key → label)

export const ALL_LEAD_COLUMNS = [
  { key: 'nom', label: 'Nom' },
  { key: 'cognoms', label: 'Cognoms' },
  { key: 'dni_nie', label: 'DNI/NIE' },
  { key: 'mobil', label: 'Mòbil' },
  { key: 'fix', label: 'Fix' },
  { key: 'tipus_immoble', label: 'Tipus' },
  { key: 'preu_max_mensual', label: 'Preu màx (€)' },
  { key: 'moblat', label: 'Moblat' },
  { key: 'habitacions_min', label: 'Habitacions' },
  { key: 'banys_min', label: 'Banys' },
  { key: 'parking', label: 'Pàrquing' },
  { key: 'ascensor', label: 'Ascensor' },
  { key: 'calefaccio', label: 'Calefacció' },
  { key: 'altres', label: 'Altres' },
  { key: 'zona', label: 'Zona' },
  { key: 'zona_altres', label: 'Zona (altres)' },
  { key: 'origen', label: 'Origen' },
  { key: 'referencia', label: 'Referència' },
  { key: 'intencio_contacte', label: 'Intenció contacte' },
  { key: 'situacio_laboral', label: 'Situació laboral' },
  { key: 'sector_professio', label: 'Sector / professió' },
  { key: 'temps_ultima_empresa', label: 'Temps última empresa' },
  { key: 'empresa_espanyola', label: 'Empresa espanyola' },
  { key: 'tipus_contracte', label: 'Tipus contracte' },
  { key: 'ingressos_netos_mensuals', label: 'Ingressos netos' },
  { key: 'edat', label: 'Edat' },
  { key: 'mascotes', label: 'Mascotes' },
  { key: 'quanta_gent_viura', label: 'Persones' },
  { key: 'menors', label: 'Menors' },
  { key: 'observacions', label: 'Observacions' },
  { key: 'estat', label: 'Estat' },
  { key: 'lang', label: 'Idioma' },
  { key: 'created_at', label: 'Data' },
];

const DEFAULT_VISIBLE = [
  'nom',
  'cognoms',
  'mobil',
  'zona',
  'preu_max_mensual',
  'estat',
  'created_at',
];

const STORAGE_KEY = 'leads_panel_visible_columns';

export function getVisibleColumns() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length > 0) return arr;
    }
  } catch {}
  return [...DEFAULT_VISIBLE];
}

export function setVisibleColumns(columns) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(columns));
}

const LABOR_LABELS = {
  intencio_contacte: { mes_info: 'Més info', concertar_visita: 'Concertar visita' },
  temps_ultima_empresa: { menys_dun_any: "Menys d'un any", dun_a_dos_anys: "D'un a dos anys", mes_de_dos_anys: 'Més de dos anys' },
  empresa_espanyola: { si: 'Sí', no: 'No' },
  tipus_contracte: { fix: 'Fix', temporal: 'Temporal' },
  ingressos_netos_mensuals: { menys_1600: '< 1.600', '1600_2000': '1.600-2.000', '2000_2400': '2.000-2.400' },
};

export function formatCellValue(lead, key) {
  const v = lead[key];
  if (v == null || v === '') return '—';
  if (key === 'created_at' || key === 'updated_at')
    return new Date(v).toLocaleDateString('ca', { dateStyle: 'short' });
  if (key === 'preu_max_mensual') return `${Number(v)} €`;
  if (LABOR_LABELS[key] && LABOR_LABELS[key][v]) return LABOR_LABELS[key][v];
  return String(v);
}
