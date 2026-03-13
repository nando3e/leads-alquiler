import OpenAI from 'openai';
import { query } from '../db.js';

const openai = process.env.OPENAI_API_KEY ? new OpenAI() : null;

/**
 * Herramienta que el agente qualificador puede llamar cuando considera
 * que ya tiene suficiente información para cerrar la cualificación.
 * El LLM decide CUÁNDO llamarla — no se llama automáticamente.
 */
const FINALIZAR_TOOL = {
  type: 'function',
  function: {
    name: 'finalizar_cualificacion',
    description:
      'Llama a esta función solo cuando ya conozcas claramente la intención del usuario (alquiler o compra) ' +
      'y hayas intentado obtener información sobre la propiedad. ' +
      'No la llames si el usuario acaba de saludar o si aún necesitas hacer alguna pregunta.',
    parameters: {
      type: 'object',
      properties: {
        intent: {
          type: 'string',
          enum: ['alquiler', 'compra'],
          description: 'Intención principal del usuario',
        },
        reference: {
          type: 'object',
          description:
            'Datos identificativos de la propiedad: portal (idealista, fotocasa...), precio, ' +
            'direccion, referencia_anuncio, caracteristicas, etc. Null si no tiene ninguna en mente.',
          nullable: true,
          properties: {
            portal: { type: 'string' },
            precio: { type: 'string' },
            direccion: { type: 'string' },
            referencia_anuncio: { type: 'string' },
            caracteristicas: { type: 'string' },
            url: { type: 'string' },
          },
        },
        compra_outcome: {
          type: 'string',
          enum: ['has_ref', 'no_ref', 'generic'],
          description:
            'Solo para intent=compra. ' +
            '"has_ref": el usuario dio referencia identificable. ' +
            '"no_ref": quiso dar referencia pero sin datos suficientes para identificarla. ' +
            '"generic": no tiene ninguna propiedad concreta en mente, solo quiere saber qué hay.',
        },
      },
      required: ['intent'],
    },
  },
};

/**
 * Detecta el idioma del mensaje usando el LLM (max_tokens=2, temperatura 0).
 * Fallback por palabras clave si OpenAI no está disponible o el texto es muy corto.
 * Devuelve 'ca', 'es', 'en' o null si no se puede determinar.
 */
export async function detectLang(text) {
  if (!text || text.trim().length < 2) return null;

  // Fallback rápido para palabras inequívocamente catalanas/inglesas
  const t = text.toLowerCase();
  if (/\b(molt|però|també|doncs|gràcies|bon\s*dia|bona\s*tarda|estic|estàs|vull|necessito|habitatge|pis)\b/.test(t)) return 'ca';
  if (/\b(hello|thank\s*you|looking\s*for|flat|apartment|please|could\s*you)\b/.test(t)) return 'en';

  if (!openai) return null; // sin API key, no podemos detectar

  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: 'Detect the language of the user message. Reply with ONLY one word: "ca" (Catalan), "es" (Spanish) or "en" (English). Nothing else.',
        },
        { role: 'user', content: text.slice(0, 300) },
      ],
      temperature: 0,
      max_tokens: 2,
    });
    const raw = res.choices[0]?.message?.content?.trim().toLowerCase() || '';
    return ['ca', 'es', 'en'].includes(raw) ? raw : null;
  } catch {
    return null;
  }
}

export async function getAgent(name) {
  const r = await query(
    'SELECT name, system_prompt, model, temperature, context_window, active FROM agent_configs WHERE name = $1 AND active = true',
    [name]
  );
  return r.rows[0] || null;
}

function interpolate(str, vars = {}) {
  let out = str || '';
  for (const [k, v] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{${k}\\}`, 'g'), v ?? '');
  }
  return out;
}

/**
 * Añade al final del system prompt una instrucción de idioma explícita.
 * Más fiable que confiar solo en la instrucción escrita dentro del prompt.
 */
function appendLangInstruction(systemPrompt, lang) {
  if (!lang) return systemPrompt;
  const labels = { ca: 'català', es: 'castellano', en: 'English' };
  const label = labels[lang] || lang;
  return (
    systemPrompt +
    `\n\n⚠️ IMPORTANT: The user is communicating in ${label}. You MUST reply ONLY in ${label}. Never switch language.`
  );
}

const QUALIFICADOR_REMINDER =
  'You are replying in the MIDDLE of a conversation. The user has ALREADY been greeted. ' +
  'Do NOT start your reply with "Hola", "Bon dia", "Quina bé", "Perfecte" or any greeting. ' +
  'Do NOT ask again if they want to rent or buy if that was already said in the history. ' +
  'Start your reply directly with the next logical step (e.g. ask for property details, or call the tool).';

function buildMessages(systemPrompt, history, contextWindow, userMessage, isQualificadorWithHistory = false) {
  const messages = [{ role: 'system', content: systemPrompt }];
  if (isQualificadorWithHistory) {
    messages.push({ role: 'system', content: QUALIFICADOR_REMINDER });
  }
  const n = Math.max(0, parseInt(contextWindow, 10) || 0);
  if (n > 0 && history.length > 0) {
    history.slice(-n).forEach((m) => {
      messages.push({
        role: m.role === 'human' ? 'user' : 'assistant',
        content: m.content || '',
      });
    });
  }
  messages.push({ role: 'user', content: userMessage });
  return messages;
}

/**
 * Habla con un agente.
 *
 * El agente `qualificador` usa tool calling: puede devolver una llamada a
 * `finalizar_cualificacion` cuando tiene suficiente info.
 *
 * @returns {{ type: 'message', content: string }
 *          | { type: 'tool_call', tool: string, args: object }}
 */
export async function chat(agentName, userMessage, history = [], vars = {}) {
  const agent = await getAgent(agentName);
  if (!agent) throw new Error(`Agent not found: ${agentName}`);
  if (!openai) throw new Error('OPENAI_API_KEY no está configurada');

  const rawPrompt = interpolate(agent.system_prompt, {
    APP_NAME: process.env.APP_NAME || '',
    ...vars,
  });
  const systemPrompt = appendLangInstruction(rawPrompt, vars.__lang || null);

  const isQualificadorWithHistory = agentName === 'qualificador' && history.length > 0;
  const messages = buildMessages(
    systemPrompt,
    history,
    agent.context_window,
    userMessage,
    isQualificadorWithHistory
  );

  const useTools = agentName === 'qualificador';

  const completion = await openai.chat.completions.create({
    model: agent.model || 'gpt-4.1-mini',
    messages,
    temperature: Number(agent.temperature) || 0.5,
    max_tokens: 512,
    ...(useTools ? { tools: [FINALIZAR_TOOL], tool_choice: 'auto' } : {}),
  });

  const choice = completion.choices[0];

  if (useTools && choice.finish_reason === 'tool_calls' && choice.message.tool_calls?.length) {
    const tc = choice.message.tool_calls[0];
    let args = {};
    try { args = JSON.parse(tc.function.arguments); } catch { /* json parse fail */ }
    return { type: 'tool_call', tool: tc.function.name, args };
  }

  return { type: 'message', content: choice.message.content?.trim() || '' };
}
