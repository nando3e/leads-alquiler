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

/** Extrae identificador de sesión: teléfono normalizado o, si no hay, contact_id para conversaciones privadas/sin teléfono. */
function getSessionId(body) {
  const conversation = body.conversation || {};
  const sender = body.sender || conversation.meta?.sender;
  const contact = body.contact || conversation.contact || sender;
  const phone =
    conversation.custom_attributes?.phone_number ||
    sender?.phone_number ||
    contact?.phone_number ||
    (contact?.identifier && String(contact.identifier).replace(/\D/g, '')) ||
    null;
  const normalized = normalizePhone(phone);
  if (normalized) return normalized;
  const contactId = sender?.id ?? contact?.id;
  if (contactId != null) return `contact_${contactId}`;
  return null;
}

export async function webhook(req, res) {
  res.status(200).send(); // respondemos siempre para que Chatwoot no reintente

  // Chatwoot puede enviar { event, payload } o el payload a nivel raíz
  const body = req.body?.payload || req.body || {};
  const messageType = body.message_type;
  const content = body.content;
  const accountId = body.account?.id;
  const conversation = body.conversation || {};
  const sender = body.sender || conversation.meta?.sender;
  const contactId = sender?.id ?? body.contact?.id ?? conversation.contact?.id;
  const conversationId = conversation.id;

  const sessionId = getSessionId(body);
  if (!sessionId) {
    console.warn('[chatwoot webhook] No sessionId (phone/contact):', {
      message_type: messageType,
      has_sender: !!sender,
      has_conversation: !!body.conversation,
      has_contact: !!body.contact,
    });
    return;
  }

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

  // Atributo bot del contacto: true / false / null(primera vez).
  // Si es null o undefined O si es false (desactivado antes): forzamos bot=true para que el primer mensaje siempre active el bot.
  const contactBotAttr = sender?.custom_attributes?.bot;
  const shouldSetBot = contactId != null && accountId != null && (contactBotAttr === undefined || contactBotAttr === null || contactBotAttr === false);

  if (shouldSetBot) {
    try {
      await setContactBot(accountId, contactId, true);
    } catch (e) {
      console.error('[chatwoot webhook] setContactBot failed:', e.message);
    }
  }

  // Tras activar bot en primer mensaje, consideramos que el bot debe responder si el global está ON.
  const botDebeResponder = globalBotActivo && (contactBotAttr !== false || shouldSetBot);

  if (!botDebeResponder) {
    const text = (content || '').trim();
    if (text) await appendMemory(sessionId, 'human', text);
    console.log('[chatwoot webhook] skip reply', { sessionId, globalBotActivo, contactBotAttr });
    return;
  }

  const delayMs = getDebounceMs(config);
  console.log('[chatwoot webhook] enqueue incoming', { sessionId, accountId, conversationId, contentLength: (content || '').length });
  enqueue(sessionId, { body }, delayMs, processIncoming);
}
