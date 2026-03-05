// Campos que se pueden usar en reglas de alerta (excluïm text lliure: sector_professio, observacions, altres, etc.)

export const RULE_FIELDS = [
  {
    key: 'preu_min',
    label: 'Preu mínim (€/mes)',
    type: 'number',
    placeholder: 'ex. 600',
  },
  {
    key: 'preu_max',
    label: 'Preu màxim (€/mes)',
    type: 'number',
    placeholder: 'ex. 1200',
  },
  {
    key: 'zones',
    label: 'Zona',
    type: 'multi',
    options: ['Qualsevol', 'Olot', 'Sant Joan les Fonts', 'Rodalies', 'Altres'],
  },
  {
    key: 'tipus_immoble',
    label: 'Tipus immoble',
    type: 'select',
    options: [
      { value: '', label: '—' },
      { value: 'casa', label: 'Casa' },
      { value: 'pis', label: 'Pis' },
      { value: 'no_importa', label: 'No importa' },
    ],
  },
  {
    key: 'moblat',
    label: 'Moblat',
    type: 'select',
    options: [
      { value: '', label: '—' },
      { value: 'si', label: 'Sí' },
      { value: 'no', label: 'No' },
      { value: 'no_importa', label: 'No importa' },
    ],
  },
  {
    key: 'habitacions_min',
    label: 'Habitacions mínimes',
    type: 'select',
    options: [
      { value: '', label: '—' },
      { value: '1', label: '1' },
      { value: '2', label: '2' },
      { value: '3', label: '3' },
      { value: '4', label: '4' },
      { value: '5_mes', label: '5+' },
      { value: 'no_importa', label: 'No importa' },
    ],
  },
  {
    key: 'banys_min',
    label: 'Banys mínims',
    type: 'select',
    options: [
      { value: '', label: '—' },
      { value: '1', label: '1' },
      { value: '2', label: '2' },
      { value: '3_mes', label: '3+' },
      { value: 'no_importa', label: 'No importa' },
    ],
  },
  {
    key: 'parking',
    label: 'Pàrquing',
    type: 'select',
    options: [
      { value: '', label: '—' },
      { value: 'si', label: 'Sí' },
      { value: 'no', label: 'No' },
      { value: 'no_importa', label: 'No importa' },
    ],
  },
  {
    key: 'ascensor',
    label: 'Ascensor',
    type: 'select',
    options: [
      { value: '', label: '—' },
      { value: 'si', label: 'Sí' },
      { value: 'no', label: 'No' },
      { value: 'no_importa', label: 'No importa' },
    ],
  },
  {
    key: 'calefaccio',
    label: 'Calefacció',
    type: 'select',
    options: [
      { value: '', label: '—' },
      { value: 'si', label: 'Sí' },
      { value: 'no', label: 'No' },
      { value: 'no_importa', label: 'No importa' },
    ],
  },
  {
    key: 'situacio_laboral',
    label: 'Situació laboral',
    type: 'multi',
    options: ['empleat', 'autonom', 'aturat', 'estudiant', 'jubilat', 'altres'],
  },
  {
    key: 'mascotes',
    label: 'Mascotes',
    type: 'select',
    options: [
      { value: '', label: '—' },
      { value: 'si', label: 'Sí' },
      { value: 'no', label: 'No' },
    ],
  },
  {
    key: 'quanta_gent_max',
    label: 'Màx. persones',
    type: 'number',
    placeholder: 'ex. 4',
  },
  {
    key: 'edat_min',
    label: 'Edat mínima',
    type: 'number',
    placeholder: 'ex. 18',
  },
  {
    key: 'edat_max',
    label: 'Edat màxima',
    type: 'number',
    placeholder: 'ex. 65',
  },
  {
    key: 'menors_max',
    label: 'Màx. menors',
    type: 'number',
    placeholder: 'ex. 2',
  },
  {
    key: 'origen',
    label: 'Origen',
    type: 'multi',
    options: ['idealista', 'fotocasa', 'habitaclia', 'pisos_com', 'la_comarca', 'viu', 'reclam', 'generico'],
  },
];

export function criteriaFromForm(enabled, values) {
  const criteria = {};
  for (const f of RULE_FIELDS) {
    if (!enabled[f.key]) continue;
    const v = values[f.key];
    if (v === undefined || v === '' || (Array.isArray(v) && v.length === 0)) continue;
    if (f.key === 'zones' || f.key === 'situacio_laboral' || f.key === 'origen') {
      criteria[f.key] = Array.isArray(v) ? v : [v];
    } else {
      criteria[f.key] = v;
    }
  }
  return criteria;
}

export function formStateFromCriteria(criteria) {
  const enabled = {};
  const values = {};
  for (const f of RULE_FIELDS) {
    const v = criteria[f.key];
    const hasVal = v !== undefined && v !== null && (Array.isArray(v) ? v.length > 0 : v !== '');
    enabled[f.key] = !!hasVal;
    values[f.key] = hasVal ? v : (f.type === 'multi' ? [] : '');
  }
  return { enabled, values };
}
