import { query } from '../db.js';

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

export function getDebounceMs(config) {
  const ms = parseInt(config?.message_debounce_ms || '1500', 10);
  return Number.isFinite(ms) && ms > 0 ? ms : 1500;
}

export function isBotActivo(config) {
  const v = (config?.bot_activo || '').toLowerCase();
  return v === 'true' || v === '1';
}

/**
 * Devuelve un mensaje de config localizado.
 * Prioridad: config[key_lang] > config[key] traducido por LLM > config[key] sin traducir.
 *
 * Ej: getLocalizedMsg(config, 'msg_form_link', 'ca', vars)
 *  → busca config.msg_form_link_ca, si existe lo usa
 *  → si no, traduce config.msg_form_link al catalán con el LLM
 */
export async function getLocalizedMsg(config, key, lang, vars = {}) {
  let raw;

  // 1) Intenta versión específica del idioma (ej: msg_form_link_ca)
  if (lang && lang !== 'es') {
    const langKey = `${key}_${lang}`;
    if (config[langKey] && config[langKey].trim()) {
      raw = config[langKey];
    }
  }

  // 2) Si no hay versión específica, usa la base (español)
  if (!raw) raw = config[key] || '';

  // 3) Interpola variables ({FORM_URL}, {TELEFONO_ADMINISTRACION}, etc.)
  for (const [k, v] of Object.entries(vars)) {
    raw = raw.replace(new RegExp(`\\{${k}\\}`, 'g'), v ?? '');
  }

  // 4) Si el idioma no es español y no había versión específica, traduce con LLM
  if (lang && lang !== 'es' && !config[`${key}_${lang}`]?.trim()) {
    try {
      const { default: OpenAI } = await import('openai');
      if (process.env.OPENAI_API_KEY) {
        const openai = new OpenAI();
        const labels = { ca: 'Catalan', en: 'English' };
        const targetLang = labels[lang] || lang;
        const res = await openai.chat.completions.create({
          model: 'gpt-4.1-mini',
          messages: [
            {
              role: 'system',
              content: `Translate the following message to ${targetLang}. Keep the same tone (friendly, professional). Keep any URLs or technical terms unchanged. Return ONLY the translated text, nothing else.`,
            },
            { role: 'user', content: raw },
          ],
          temperature: 0.2,
          max_tokens: 300,
        });
        const translated = res.choices[0]?.message?.content?.trim();
        if (translated) return translated;
      }
    } catch { /* fallback to untranslated */ }
  }

  return raw;
}
