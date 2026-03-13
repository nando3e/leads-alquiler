const STATE_FLOW = [
  'alq_ref_ask_nom',
  'alq_ref_ask_cognoms',
  'alq_ref_ask_intencio_contacte',
  'alq_ref_ask_mascotes',
  'alq_ref_ask_quanta_gent_viura',
  'alq_ref_ask_situacio_laboral',
  'alq_ref_ask_temps_ultima_empresa',
  'alq_ref_ask_empresa_espanyola',
  'alq_ref_ask_tipus_contracte',
  'alq_ref_ask_ingressos_netos_mensuals',
];

const STATE_SET = new Set(STATE_FLOW);
const STATE_TO_FIELD = {
  alq_ref_ask_nom: 'nom',
  alq_ref_ask_cognoms: 'cognoms',
  alq_ref_ask_intencio_contacte: 'intencio_contacte',
  alq_ref_ask_mascotes: 'mascotes',
  alq_ref_ask_quanta_gent_viura: 'quanta_gent_viura',
  alq_ref_ask_situacio_laboral: 'situacio_laboral',
  alq_ref_ask_temps_ultima_empresa: 'temps_ultima_empresa',
  alq_ref_ask_empresa_espanyola: 'empresa_espanyola',
  alq_ref_ask_tipus_contracte: 'tipus_contracte',
  alq_ref_ask_ingressos_netos_mensuals: 'ingressos_netos_mensuals',
};

/** Orden de campos de captura (para derivar slots faltantes). */
export const CAPTURE_FIELDS_ORDER = STATE_FLOW.map((s) => STATE_TO_FIELD[s]);

/** Mapeo campo -> estado (para validación). */
const FIELD_TO_STATE = {};
for (const [state, field] of Object.entries(STATE_TO_FIELD)) {
  FIELD_TO_STATE[field] = state;
}

/**
 * Devuelve la lista de campos aún no rellenados en captureData.
 */
export function getMissingCaptureFields(captureData = {}) {
  return CAPTURE_FIELDS_ORDER.filter((f) => {
    const v = captureData[f];
    return v == null || String(v).trim() === '';
  });
}

/**
 * Devuelve el primer estado cuyo campo sigue faltante (siguiente paso a preguntar).
 * Si todos están rellenados, devuelve null.
 */
export function getNextMissingState(captureData = {}) {
  const missing = getMissingCaptureFields(captureData);
  if (missing.length === 0) return null;
  const firstMissingField = missing[0];
  return FIELD_TO_STATE[firstMissingField] || null;
}
const PET_WORDS = /\b(perro|perra|gato|gata|mascota|mascotas|gos|gossa|gat|gats|dog|dogs|cat|cats|pet|pets)\b/i;

const NUMBER_WORDS = {
  es: { uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6 },
  ca: { un: 1, una: 1, dos: 2, dues: 2, tres: 3, quatre: 4, cinc: 5, sis: 6 },
  en: { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 },
};

function compactSpaces(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function toSearchText(value) {
  return compactSpaces(value).toLowerCase();
}

function cleanName(value) {
  return compactSpaces(value).replace(/[0-9]/g, '').trim();
}

function extractNumericOption(text, max) {
  const match = text.match(/\b([1-9])\b/);
  if (!match) return null;
  const n = parseInt(match[1], 10);
  return n >= 1 && n <= max ? n : null;
}

function extractAmount(text) {
  const match = text.replace(/\./g, '').replace(/,/g, '.').match(/\b(\d{3,4})(?:\.\d{1,2})?\b/);
  return match ? Number(match[1]) : null;
}

function extractPeopleCount(text) {
  const numeric = text.match(/\b(\d+)\b/);
  if (numeric) return parseInt(numeric[1], 10);
  if (/\b(mi pareja y yo|pareja y yo|my partner and i)\b/i.test(text)) return 2;
  if (/\b(yo solo|yo sola|sol[oa]|alone)\b/i.test(text)) return 1;
  for (const map of Object.values(NUMBER_WORDS)) {
    for (const [word, value] of Object.entries(map)) {
      if (new RegExp(`\\b${word}\\b`, 'i').test(text)) return value;
    }
  }
  return null;
}

function normalizeOrigin(raw) {
  const text = toSearchText(raw);
  if (!text) return null;
  if (text.includes('idealista')) return 'idealista';
  if (text.includes('fotocasa')) return 'fotocasa';
  if (text.includes('habitaclia')) return 'habitaclia';
  if (text.includes('pisos.com') || text.includes('pisos com')) return 'pisos_com';
  if (text.includes('la comarca')) return 'la_comarca';
  if (text.includes('viu')) return 'viu';
  if (text.includes('reclam')) return 'reclam';
  return compactSpaces(raw).slice(0, 50);
}

function buildReferenceText(reference) {
  if (!reference || typeof reference !== 'object') return null;
  const parts = [];
  if (reference.referencia_anuncio) parts.push(`ref. ${compactSpaces(reference.referencia_anuncio)}`);
  if (reference.direccion) parts.push(compactSpaces(reference.direccion));
  if (reference.address) parts.push(compactSpaces(reference.address));
  if (reference.precio) parts.push(compactSpaces(reference.precio));
  if (reference.price) parts.push(compactSpaces(reference.price));
  if (reference.portal) parts.push(compactSpaces(reference.portal));
  if (reference.url) parts.push(compactSpaces(reference.url));
  const unique = [...new Set(parts.filter(Boolean))];
  return unique.length ? unique.join(' | ').slice(0, 255) : null;
}

export function hasUsefulReference(reference) {
  if (!reference || typeof reference !== 'object') return false;
  return ['portal', 'ciudad', 'precio', 'price', 'direccion', 'address', 'referencia_anuncio', 'caracteristicas', 'url']
    .some((key) => compactSpaces(reference[key]));
}

export function isAlquilerReferenceState(state) {
  return STATE_SET.has(state);
}

export function getNextAlquilerReferenceState(state) {
  const idx = STATE_FLOW.indexOf(state);
  if (idx === -1 || idx === STATE_FLOW.length - 1) return null;
  return STATE_FLOW[idx + 1];
}

export function getInitialAlquilerReferenceState() {
  return STATE_FLOW[0];
}

export function getAlquilerReferenceField(state) {
  return STATE_TO_FIELD[state] || null;
}

/** Clave corta para panel_config (p. ej. alq_ref_q_nom_es). */
const STATE_TO_CONFIG_KEY = {
  alq_ref_ask_nom: 'nom',
  alq_ref_ask_cognoms: 'cognoms',
  alq_ref_ask_intencio_contacte: 'intencio',
  alq_ref_ask_mascotes: 'mascotes',
  alq_ref_ask_quanta_gent_viura: 'quanta_gent',
  alq_ref_ask_situacio_laboral: 'situacio',
  alq_ref_ask_temps_ultima_empresa: 'temps_empresa',
  alq_ref_ask_empresa_espanyola: 'empresa_esp',
  alq_ref_ask_tipus_contracte: 'contracte',
  alq_ref_ask_ingressos_netos_mensuals: 'ingressos',
};

/** Lista de pasos para la UI de Configuración: [ state, shortKey, label ]. */
export const CAPTURE_STEPS_CONFIG = [
  ['alq_ref_ask_nom', 'nom', 'Nombre'],
  ['alq_ref_ask_cognoms', 'cognoms', 'Apellidos'],
  ['alq_ref_ask_intencio_contacte', 'intencio', 'Intención (más info / concertar visita)'],
  ['alq_ref_ask_mascotes', 'mascotes', 'Mascotas'],
  ['alq_ref_ask_quanta_gent_viura', 'quanta_gent', 'Personas que vivirán'],
  ['alq_ref_ask_situacio_laboral', 'situacio', 'Situación laboral'],
  ['alq_ref_ask_temps_ultima_empresa', 'temps_empresa', 'Tiempo en la última empresa'],
  ['alq_ref_ask_empresa_espanyola', 'empresa_esp', '¿Empresa española?'],
  ['alq_ref_ask_tipus_contracte', 'contracte', 'Tipo de contrato'],
  ['alq_ref_ask_ingressos_netos_mensuals', 'ingressos', 'Ingreso mensual neto'],
];

/** Obtiene la pregunta del paso desde config (si está definida). Clave: alq_ref_q_${short}_${lang}. */
export function getQuestionFromConfig(config, state, lang) {
  if (!config || typeof config !== 'object') return null;
  const short = STATE_TO_CONFIG_KEY[state];
  if (!short) return null;
  const l = ['es', 'ca', 'en'].includes(lang) ? lang : 'es';
  const key = `alq_ref_q_${short}_${l}`;
  const value = config[key];
  return value && String(value).trim() ? String(value).trim() : null;
}

/** Descripción de valores aceptados para el prompt del agente (editable). */
export function getValidValuesForStep(state) {
  const closed = {
    alq_ref_ask_intencio_contacte: 'mes_info (más información) | concertar_visita (visitar el piso)',
    alq_ref_ask_mascotes: 'si | no',
    alq_ref_ask_quanta_gent_viura: 'número (1, 2, 3...) o 6_mes si más de 6',
    alq_ref_ask_situacio_laboral: 'empleat (cuenta ajena) | autonom (cuenta propia) | aturat | estudiant | jubilat | altres',
    alq_ref_ask_temps_ultima_empresa: 'menys_dun_any | dun_a_dos_anys | mes_de_dos_anys',
    alq_ref_ask_empresa_espanyola: 'si | no',
    alq_ref_ask_tipus_contracte: 'fix (fijo) | temporal',
    alq_ref_ask_ingressos_netos_mensuals: 'menys_1600 | 1600_2000 | 2000_2400',
  };
  if (closed[state]) return closed[state];
  return 'texto libre (nombre, apellidos, etc.)';
}

const VALID_VALUES_SET = {
  alq_ref_ask_intencio_contacte: new Set(['mes_info', 'concertar_visita']),
  alq_ref_ask_mascotes: new Set(['si', 'no']),
  alq_ref_ask_quanta_gent_viura: new Set(['1', '2', '3', '4', '5', '6_mes']),
  alq_ref_ask_situacio_laboral: new Set(['empleat', 'autonom', 'aturat', 'estudiant', 'jubilat', 'altres']),
  alq_ref_ask_temps_ultima_empresa: new Set(['menys_dun_any', 'dun_a_dos_anys', 'mes_de_dos_anys']),
  alq_ref_ask_empresa_espanyola: new Set(['si', 'no']),
  alq_ref_ask_tipus_contracte: new Set(['fix', 'temporal']),
  alq_ref_ask_ingressos_netos_mensuals: new Set(['menys_1600', '1600_2000', '2000_2400']),
};

export function isValidValueForStep(state, value) {
  if (!value || typeof value !== 'string') return false;
  const v = value.trim().toLowerCase();
  const set = VALID_VALUES_SET[state];
  if (set) return set.has(v);
  return v.length >= 1 && v.length <= 200;
}

/** Valida un valor para un campo (por nombre de campo). */
export function isValidValueForField(field, value) {
  const state = FIELD_TO_STATE[field];
  return state ? isValidValueForStep(state, value) : false;
}

export function buildAlquilerReferenceSeed(sessionId, lang, reference) {
  const origenRaw = reference?.portal || reference?.url || '';
  return {
    mobil: sessionId,
    whatsapp_number: sessionId,
    lang,
    origen: normalizeOrigin(origenRaw),
    referencia: buildReferenceText(reference),
  };
}

function parseNom(text) {
  const extracted = compactSpaces(text).replace(/^(me llamo|mi nombre es|soy|i am|my name is|em dic|sóc)\s+/i, '');
  const value = cleanName(extracted);
  if (!value || value.length < 2) return null;
  return value.split(' ')[0].slice(0, 100);
}

function parseCognoms(text) {
  const extracted = compactSpaces(text).replace(/^(mis apellidos son|mis apellidos|apellidos|cognoms|my surname is|my surname|surname)\s+/i, '');
  const value = cleanName(extracted);
  if (!value || value.length < 2) return null;
  return value.slice(0, 150);
}

/**
 * Intenta extraer nombre y apellidos de un texto tipo "me llamo Juan Pérez" o "Juan Pérez".
 * Devuelve { nom, cognoms } si hay al menos dos palabras válidas; si solo una, { nom }.
 */
function parseFullName(text) {
  const extracted = compactSpaces(text).replace(
    /^(me llamo|mi nombre es|soy|i am|my name is|em dic|sóc|som|són)\s+/i,
    ''
  );
  const value = cleanName(extracted);
  if (!value || value.length < 2) return null;
  const parts = value.split(/\s+/).filter((p) => p.length >= 2);
  if (parts.length === 0) return null;
  const nom = parts[0].slice(0, 100);
  if (parts.length === 1) return { nom };
  const cognoms = parts.slice(1).join(' ').slice(0, 150);
  return { nom, cognoms };
}

function parseIntencioContacte(text) {
  const normalized = toSearchText(text);
  const numeric = extractNumericOption(normalized, 2);
  if (numeric === 1) return 'mes_info';
  if (numeric === 2) return 'concertar_visita';
  if (
    /\b(info|informacion|información|informacio|informació|mas info|més info|detalles|detalle|saber más|saber mes|more info|more information)\b/i.test(
      normalized
    )
  ) {
    return 'mes_info';
  }
  if (
    /\b(metros|metres|m2|m²|habitacion|habitaciones|habitacions|precio|preu|price|zona|gastos|disponibilidad|condiciones|quer[ií]a saber|volia saber|wanted to know|how many.*meters|square meters)\b/i.test(
      normalized
    )
  ) {
    return 'mes_info';
  }
  if (/\b(visita|visitar|verlo|verla|ver el piso|see it|viewing|visit)\b/i.test(normalized)) {
    return 'concertar_visita';
  }
  return null;
}

function parseMascotes(text) {
  const normalized = toSearchText(text);
  if (/\b(2|no|nop|ninguna|ninguno|none|sin mascotas|sense mascotes|no tengo|no en tinc)\b/i.test(normalized)) return 'no';
  if (PET_WORDS.test(normalized)) return 'si';
  if (/\b(1|si|sí|yes|yep|claro)\b/i.test(normalized)) return 'si';
  return null;
}

function parseQuantaGent(text) {
  const normalized = toSearchText(text);
  const count = extractPeopleCount(normalized);
  if (!Number.isFinite(count) || count <= 0) return null;
  return count >= 6 ? '6_mes' : String(count);
}

function parseSituacioLaboral(text) {
  const normalized = toSearchText(text);
  const numeric = extractNumericOption(normalized, 6);
  if (numeric === 1) return 'empleat';
  if (numeric === 2) return 'autonom';
  if (numeric === 3) return 'aturat';
  if (numeric === 4) return 'estudiant';
  if (numeric === 5) return 'jubilat';
  if (numeric === 6) return 'altres';
  if (/\b(cuenta ajena|compte ali[eè]|empresa|emplead|asalariad|nomina|nómina|trabajo para una empresa|work for a company)\b/i.test(normalized)) {
    return 'empleat';
  }
  if (/\b(autonom|autónom|autónomo|compte propi[ao]|cuenta propia|por mi cuenta|self employed|self-employed|freelance)\b/i.test(normalized)) {
    return 'autonom';
  }
  if (/\b(paro|atur|desemplead|unemployed)\b/i.test(normalized)) return 'aturat';
  if (/\b(estudiant|estudiante|student)\b/i.test(normalized)) return 'estudiant';
  if (/\b(jubilat|jubilado|retired)\b/i.test(normalized)) return 'jubilat';
  if (/\b(altres|otros|other)\b/i.test(normalized)) return 'altres';
  return null;
}

function parseTempsUltimaEmpresa(text) {
  const normalized = toSearchText(text);
  const numeric = extractNumericOption(normalized, 3);
  if (numeric === 1) return 'menys_dun_any';
  if (numeric === 2) return 'dun_a_dos_anys';
  if (numeric === 3) return 'mes_de_dos_anys';
  if (/\b(menos de un an|menos de 1 an|menys d['’]?un any|less than one year|less than a year|< ?1)\b/i.test(normalized)) {
    return 'menys_dun_any';
  }
  if (/\b(de 1 a 2|de uno a dos|d['’]?1 a 2|d['’]?un a dos|between one and two|one to two)\b/i.test(normalized)) {
    return 'dun_a_dos_anys';
  }
  if (/\b(mas de 2|más de 2|mes de dos|més de dos|three years|3 anos|3 años|more than two)\b/i.test(normalized)) {
    return 'mes_de_dos_anys';
  }
  return null;
}

function parseEmpresaEspanyola(text) {
  const normalized = toSearchText(text);
  const numeric = extractNumericOption(normalized, 2);
  if (numeric === 1) return 'si';
  if (numeric === 2) return 'no';
  if (/\b(si|sí|yes|española|espanyola|spanish)\b/i.test(normalized)) return 'si';
  if (/\b(no|not|extranjera|estrangera|foreign)\b/i.test(normalized)) return 'no';
  return null;
}

function parseTipusContracte(text) {
  const normalized = toSearchText(text);
  const numeric = extractNumericOption(normalized, 2);
  if (numeric === 1) return 'fix';
  if (numeric === 2) return 'temporal';
  if (/\b(fijo|fix|indefinido|permanent)\b/i.test(normalized)) return 'fix';
  if (/\b(temporal|eventual|temporary)\b/i.test(normalized)) return 'temporal';
  return null;
}

function parseIngressos(text) {
  const normalized = toSearchText(text);
  const numeric = extractNumericOption(normalized, 3);
  if (numeric === 1) return 'menys_1600';
  if (numeric === 2) return '1600_2000';
  if (numeric === 3) return '2000_2400';
  const amount = extractAmount(normalized);
  if (Number.isFinite(amount)) {
    if (amount < 1600) return 'menys_1600';
    if (amount <= 2000) return '1600_2000';
    if (amount <= 2400) return '2000_2400';
  }
  if (/\b(menos de 1600|menys de 1600|less than 1600)\b/i.test(normalized)) return 'menys_1600';
  if (/\b(1600.*2000|de 1600 a 2000|from 1600 to 2000)\b/i.test(normalized)) return '1600_2000';
  if (/\b(2000.*2400|de 2000 a 2400|from 2000 to 2400)\b/i.test(normalized)) return '2000_2400';
  return null;
}

export function parseAlquilerReferenceAnswer(state, text) {
  switch (state) {
    case 'alq_ref_ask_nom': return parseNom(text);
    case 'alq_ref_ask_cognoms': return parseCognoms(text);
    case 'alq_ref_ask_intencio_contacte': return parseIntencioContacte(text);
    case 'alq_ref_ask_mascotes': return parseMascotes(text);
    case 'alq_ref_ask_quanta_gent_viura': return parseQuantaGent(text);
    case 'alq_ref_ask_situacio_laboral': return parseSituacioLaboral(text);
    case 'alq_ref_ask_temps_ultima_empresa': return parseTempsUltimaEmpresa(text);
    case 'alq_ref_ask_empresa_espanyola': return parseEmpresaEspanyola(text);
    case 'alq_ref_ask_tipus_contracte': return parseTipusContracte(text);
    case 'alq_ref_ask_ingressos_netos_mensuals': return parseIngressos(text);
    default: return null;
  }
}

/**
 * Comprueba si el texto normalizado contiene alguna de las frases de la config (una por línea).
 * Devuelve true si hay coincidencia.
 */
function matchConfigPhrases(normalizedText, configValue) {
  if (!normalizedText || !configValue || typeof configValue !== 'string') return false;
  const phrases = configValue.split(/\n/).map((p) => p.trim().toLowerCase()).filter(Boolean);
  return phrases.some((p) => normalizedText.includes(p));
}

/**
 * Extrae todos los campos que pueda del texto (parsers deterministas + frases de config).
 * Solo incluye campos que estaban faltantes en captureData y que pasan validación.
 * @param {string} text - Mensaje del usuario
 * @param {object} captureData - Datos ya capturados (solo extraemos los que faltan)
 * @param {object} [config] - panel_config para ejemplos/sinónimos (alq_ref_ejemplos_mes_info, etc.)
 * @returns {{ [field: string]: string }} Objeto con campo -> valor normalizado
 */
export function extractMultipleFields(text, captureData = {}, config = null) {
  const out = {};
  const raw = String(text || '').trim();
  if (!raw) return out;

  const normalized = toSearchText(raw);

  const fullName = parseFullName(raw);
  if (fullName) {
    if (!captureData.nom && fullName.nom && fullName.nom.length >= 2) {
      out.nom = fullName.nom.slice(0, 100);
    }
    if (!captureData.cognoms && fullName.cognoms && fullName.cognoms.length >= 2) {
      out.cognoms = fullName.cognoms.slice(0, 150);
    }
  }

  for (const field of CAPTURE_FIELDS_ORDER) {
    if (captureData[field] != null && String(captureData[field]).trim() !== '') continue;
    if (out[field] != null) continue;
    const state = FIELD_TO_STATE[field];
    let value = parseAlquilerReferenceAnswer(state, raw);

    if (value == null && config && typeof config === 'object') {
      if (field === 'intencio_contacte') {
        if (matchConfigPhrases(normalized, config.alq_ref_ejemplos_mes_info)) value = 'mes_info';
        else if (matchConfigPhrases(normalized, config.alq_ref_ejemplos_concertar_visita)) value = 'concertar_visita';
      } else if (field === 'tipus_contracte') {
        if (matchConfigPhrases(normalized, config.alq_ref_sinonimos_fix)) value = 'fix';
        else if (matchConfigPhrases(normalized, config.alq_ref_sinonimos_temporal)) value = 'temporal';
      }
    }

    if (value != null && isValidValueForStep(state, value)) {
      out[field] = value;
    }
  }

  return out;
}

function getMessages(lang) {
  const l = ['ca', 'en'].includes(lang) ? lang : 'es';
  return {
    es: {
      alq_ref_ask_nom: 'Perfecto. Para ayudarte con esa vivienda, ¿me dices tu nombre?',
      alq_ref_ask_cognoms: 'Gracias. ¿Y tus apellidos?',
      alq_ref_ask_intencio_contacte: '¿Te interesa más 1) recibir más información sobre el piso o 2) concertar una visita? Puedes escribirme el número si te va mejor.',
      alq_ref_ask_mascotes: '¿Tenéis mascotas? Puedes responder sí o no.',
      alq_ref_ask_quanta_gent_viura: '¿Cuántas personas viviríais en la vivienda?',
      alq_ref_ask_situacio_laboral: '¿Cuál es vuestra situación laboral?\n1. Cuenta ajena\n2. Cuenta propia / autónomo\n3. En paro\n4. Estudiante\n5. Jubilado\n6. Otros',
      alq_ref_ask_temps_ultima_empresa: '¿Cuánto tiempo llevas en la última empresa?\n1. Menos de un año\n2. De 1 a 2 años\n3. Más de 2 años',
      alq_ref_ask_empresa_espanyola: '¿Es una empresa española? Puedes responder 1) sí o 2) no.',
      alq_ref_ask_tipus_contracte: '¿Tu contrato es 1) fijo o 2) temporal?',
      alq_ref_ask_ingressos_netos_mensuals: '¿En qué rango está vuestro ingreso mensual neto?\n1. Menos de 1.600 €\n2. De 1.600 a 2.000 €\n3. De 2.000 a 2.400 €',
    },
    ca: {
      alq_ref_ask_nom: 'Perfecte. Per ajudar-te amb aquest habitatge, em pots dir el teu nom?',
      alq_ref_ask_cognoms: 'Gràcies. I els teus cognoms?',
      alq_ref_ask_intencio_contacte: 'T’interessa més 1) rebre més informació sobre el pis o 2) concertar una visita? Si vols, em pots escriure el número.',
      alq_ref_ask_mascotes: 'Teniu mascotes? Pots respondre sí o no.',
      alq_ref_ask_quanta_gent_viura: 'Quantes persones viuríeu a l’habitatge?',
      alq_ref_ask_situacio_laboral: 'Quina és la vostra situació laboral?\n1. Compte aliè\n2. Compte propi / autònom\n3. A l’atur\n4. Estudiant\n5. Jubilat\n6. Altres',
      alq_ref_ask_temps_ultima_empresa: 'Quant temps fa que ets a l’última empresa?\n1. Menys d’un any\n2. D’1 a 2 anys\n3. Més de 2 anys',
      alq_ref_ask_empresa_espanyola: 'És una empresa espanyola? Pots respondre 1) sí o 2) no.',
      alq_ref_ask_tipus_contracte: 'El teu contracte és 1) fix o 2) temporal?',
      alq_ref_ask_ingressos_netos_mensuals: 'En quin rang estan els vostres ingressos mensuals nets?\n1. Menys de 1.600 €\n2. De 1.600 a 2.000 €\n3. De 2.000 a 2.400 €',
    },
    en: {
      alq_ref_ask_nom: 'Perfect. To help you with that property, what is your first name?',
      alq_ref_ask_cognoms: 'Thanks. And your surname?',
      alq_ref_ask_intencio_contacte: 'Would you prefer 1) more information about the property or 2) to arrange a viewing? You can reply with the number if easier.',
      alq_ref_ask_mascotes: 'Do you have pets? You can answer yes or no.',
      alq_ref_ask_quanta_gent_viura: 'How many people would live in the property?',
      alq_ref_ask_situacio_laboral: 'What is your employment situation?\n1. Employed\n2. Self-employed\n3. Unemployed\n4. Student\n5. Retired\n6. Other',
      alq_ref_ask_temps_ultima_empresa: 'How long have you been in your current company?\n1. Less than one year\n2. Between 1 and 2 years\n3. More than 2 years',
      alq_ref_ask_empresa_espanyola: 'Is it a Spanish company? You can reply 1) yes or 2) no.',
      alq_ref_ask_tipus_contracte: 'Is your contract 1) permanent or 2) temporary?',
      alq_ref_ask_ingressos_netos_mensuals: 'Which range best matches your net monthly income?\n1. Less than 1,600 €\n2. 1,600 to 2,000 €\n3. 2,000 to 2,400 €',
    },
  }[l];
}

export function buildAlquilerReferenceQuestion(state, lang, clarify = false) {
  const messages = getMessages(lang);
  const question = messages[state] || '';
  if (!clarify) return question;
  if (lang === 'ca') return `No ho he acabat d’entendre. ${question}`;
  if (lang === 'en') return `I did not fully catch that. ${question}`;
  return `No me ha quedado del todo claro. ${question}`;
}

export function buildLeadPayloadFromCapture(sessionId, lang, reference, captureData = {}) {
  const seed = buildAlquilerReferenceSeed(sessionId, lang, reference);
  return {
    nom: captureData.nom || '',
    cognoms: captureData.cognoms || '',
    dni_nie: '',
    mobil: captureData.mobil || seed.mobil,
    fix: null,
    tipus_immoble: 'no_importa',
    preu_max_mensual: 0,
    moblat: 'no_importa',
    habitacions_min: null,
    banys_min: null,
    parking: null,
    ascensor: null,
    calefaccio: null,
    altres: null,
    zona: 'Qualsevol',
    zona_altres: null,
    origen: captureData.origen || seed.origen,
    referencia: captureData.referencia || seed.referencia,
    intencio_contacte: captureData.intencio_contacte || null,
    situacio_laboral: captureData.situacio_laboral || null,
    sector_professio: null,
    temps_ultima_empresa: captureData.temps_ultima_empresa || null,
    empresa_espanyola: captureData.empresa_espanyola || null,
    tipus_contracte: captureData.tipus_contracte || null,
    ingressos_netos_mensuals: captureData.ingressos_netos_mensuals || null,
    edat: null,
    mascotes: captureData.mascotes || 'no',
    quanta_gent_viura: captureData.quanta_gent_viura || null,
    menors: null,
    observacions: null,
    lang,
    whatsapp_number: captureData.whatsapp_number || seed.whatsapp_number,
  };
}
