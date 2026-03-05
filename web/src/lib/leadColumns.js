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
  { key: 'situacio_laboral', label: 'Situació laboral' },
  { key: 'sector_professio', label: 'Sector / professió' },
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

export function formatCellValue(lead, key) {
  const v = lead[key];
  if (v == null || v === '') return '—';
  if (key === 'created_at' || key === 'updated_at')
    return new Date(v).toLocaleDateString('ca', { dateStyle: 'short' });
  if (key === 'preu_max_mensual') return `${Number(v)} €`;
  return String(v);
}
