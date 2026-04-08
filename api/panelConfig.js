import { query } from './db.js';

let cache = null;
let cacheAt = 0;
const CACHE_MS = 30_000;

export async function getPanelConfig() {
  if (cache && Date.now() - cacheAt < CACHE_MS) return cache;
  const r = await query('SELECT key, value FROM panel_config');
  cache = {};
  for (const row of r.rows) cache[row.key] = row.value ?? '';
  cacheAt = Date.now();
  return cache;
}

export function clearConfigCache() {
  cache = null;
}

/**
 * Mensaje desde panel_config. Prioridad: key_lang > key; interpola {VAR}.
 */
export async function getLocalizedMsg(config, key, lang, vars = {}) {
  let raw;
  if (lang && lang !== 'es') {
    const langKey = `${key}_${lang}`;
    if (config[langKey]?.trim()) raw = config[langKey];
  }
  if (!raw) raw = config[key] || '';
  for (const [k, v] of Object.entries(vars)) {
    raw = raw.replace(new RegExp(`\\{${k}\\}`, 'g'), v ?? '');
  }
  return raw;
}
