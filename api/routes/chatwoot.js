import { getPanelConfig, getDebounceMs, isBotActivo } from '../bot/config.js';
import { enqueue } from '../bot/queue.js';
import { processIncoming } from '../bot/flow.js';
import { append as appendMemory } from '../bot/memory.js';
import { setContactBot } from '../bot/chatwoot.js';

function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '').replace(/^0+/, '') || null;
}

function isVoiceOrMedia(content) {
  const c = String(content || '');
  return c.includes('_event_voice_note') || c.includes('_event_media');
}

export async function webhook(req, res) {
  res.status(200).send(); // respondemos siempre para que Chatwoot no reintente

  const body = req.body || {};
  const messageType = body.message_type;
  const content = body.content;
  const accountId = body.account?.id;
  const conversation = body.conversation || {};
  const sender = body.sender || conversation.meta?.sender;
  const contactId = sender?.id;
  // Teléfono del contacto de la conversación (para entrantes = quien escribe; para salientes = a quien se responde)
  const phone = conversation.custom_attributes?.phone_number || sender?.phone_number;

  if (!phone) return;

  const sessionId = normalizePhone(phone);

  // Saliente: lo que alguien (bot o agente) respondió. Siempre a contexto como 'ai'.
  if (messageType === 'outgoing') {
    const text = (content || '').trim();
    if (text) await appendMemory(sessionId, 'ai', text);
    return;
  }

  // Entrante: lo que escribió el usuario. Va a contexto como 'human'.
  if (messageType !== 'incoming') return;
  if (isVoiceOrMedia(content)) return;

  const config = await getPanelConfig();
  const globalBotActivo = isBotActivo(config);

  // Atributo bot del contacto en Chatwoot (por contacto, no global).
  // true  → bot activo para este contacto
  // false → agente humano tomó el control, bot en silencio
  // null/undefined → primera vez, activamos bot=true automáticamente
  const contactBotAttr = sender?.custom_attributes?.bot;

  if (contactId != null && accountId != null && (contactBotAttr === undefined || contactBotAttr === null)) {
    await setContactBot(accountId, contactId, true);
  }

  // El bot responde si:
  //   1. El interruptor global está ON, Y
  //   2. El atributo del contacto no está explícitamente en false
  // Siempre guardamos en memoria aunque el bot no responda (contexto para el agente humano).
  const botDebeResponder = globalBotActivo && contactBotAttr !== false;

  if (!botDebeResponder) {
    const text = (content || '').trim();
    if (text) await appendMemory(sessionId, 'human', text);
    return;
  }

  const delayMs = getDebounceMs(config);
  enqueue(sessionId, { body }, delayMs, processIncoming);
}
