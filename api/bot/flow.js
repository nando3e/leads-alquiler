import { getPanelConfig, isBotActivo, getLocalizedMsg } from './config.js';
import { getSession, upsertSession } from './session.js';
import { append as appendMemory, getLastN } from './memory.js';
import { sendMessage as sendChatwoot } from './chatwoot.js';
import { notifyAgent as sendBuilderBot } from './builderbot.js';
import { chat, detectLang } from './agents.js';

function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '').replace(/^0+/, '') || null;
}

/**
 * Convierte el objeto reference en una descripción legible para el mensaje.
 * Ej: { portal: 'Idealista', precio: '800€/mes', direccion: 'c/ Gràcia 12' }
 *  → "el piso en Idealista por 800€/mes en c/ Gràcia 12"
 */
function describeReference(reference) {
  if (!reference || typeof reference !== 'object') return null;
  const parts = [];
  const tipo = reference.tipo || reference.type || null;
  const art = tipo ? `${tipo}` : 'la propiedad';
  if (reference.portal) parts.push(`de ${reference.portal}`);
  if (reference.direccion || reference.address) parts.push(`en ${reference.direccion || reference.address}`);
  if (reference.precio || reference.price) parts.push(`por ${reference.precio || reference.price}`);
  if (reference.referencia_anuncio) parts.push(`(ref. ${reference.referencia_anuncio})`);
  return parts.length > 0 ? `${art} ${parts.join(', ')}` : art;
}

/**
 * Lógica principal de un turno del bot.
 * Devuelve { reply, estado, intent, reference }.
 * En testMode no llama a BuilderBot (pero sí escribe en DB).
 */
async function runBotTurn(sessionId, aggregatedContent, { accountId, conversationId, testMode = false } = {}) {
  const config = await getPanelConfig();
  const appName = process.env.APP_NAME || '';
  const formBase = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
  const telefonoAdmin = process.env.TELEFONO_ADMINISTRACION || '';

  let session = await getSession(sessionId);
  if (!session) {
    await upsertSession({
      session_id: sessionId,
      estado: 'new',
      account_id: accountId ?? null,
      conversation_id: conversationId ?? null,
    });
    session = await getSession(sessionId);
  }

  // Actualiza account/conversation si venían en el payload y aún no estaban
  if (accountId != null && !session.account_id) {
    await upsertSession({ session_id: sessionId, account_id: accountId, conversation_id: conversationId });
    session = await getSession(sessionId);
  }

  const estado = session.estado;

  // Sesión ya completada (formulario enviado y agradecimiento mandado)
  if (estado === 'completed') {
    const sessionLang = session.lang || 'es';
    const msg = await getLocalizedMsg(config, 'msg_completed', sessionLang);
    await appendMemory(sessionId, 'ai', msg);
    return { reply: msg, estado: 'completed', intent: session.intent, reference: session.reference };
  }

  // Formulario ya enviado: no responder hasta que vuelva de WhatsApp
  if (estado === 'form_sent') {
    return { reply: null, estado: 'form_sent', intent: session.intent, reference: session.reference };
  }

  // Detectar idioma en cada mensaje y actualizar sesión si cambia o aún no está fijo.
  // Se re-detecta mientras el estado sea 'new' o 'qualifying' (conversación en curso).
  // Una vez el flujo avanza (form_sent, compra_notified...) ya no cambia.
  const shouldDetectLang = !session.lang || ['new', 'qualifying'].includes(estado);
  if (shouldDetectLang) {
    const detectedLang = await detectLang(aggregatedContent);
    if (detectedLang && detectedLang !== session.lang) {
      await upsertSession({ session_id: sessionId, lang: detectedLang });
      session = { ...session, lang: detectedLang };
    }
  }
  const lang = session.lang || 'es';

  // Recuperar historial ANTES de guardar el mensaje actual para evitar duplicados.
  // chat() ya recibe aggregatedContent como userMessage, así que el historial
  // solo debe contener los turnos anteriores.
  const history = await getLastN(sessionId, 30);

  // Guardar mensaje del usuario (después de leer historial)
  await appendMemory(sessionId, 'human', aggregatedContent);

  // ── Primer mensaje: bienvenida ──────────────────────────────────────────────
  if (estado === 'new') {
    const result = await chat('bienvenida', aggregatedContent, [], { APP_NAME: appName, __lang: lang });
    const reply = result.content || '';
    await appendMemory(sessionId, 'ai', reply);
    await upsertSession({
      session_id: sessionId,
      estado: 'qualifying',
      account_id: accountId ?? null,
      conversation_id: conversationId ?? null,
    });
    return { reply, estado: 'qualifying', intent: null, reference: null };
  }

  // ── Cualificación: agente con tool calling ─────────────────────────────────
  const result = await chat('qualificador', aggregatedContent, history, { APP_NAME: appName, __lang: lang });

  // El agente decidió que ya tiene suficiente información → llama a la herramienta
  if (result.type === 'tool_call' && result.tool === 'finalizar_cualificacion') {
    const { intent, reference = null, compra_outcome } = result.args;

    // ── ALQUILER ──────────────────────────────────────────────────────────────
    if (intent === 'alquiler') {
      const formUrl = `${formBase}/form?lang=${lang}`;
      const refDesc = describeReference(reference);
      const msgKey = refDesc ? 'msg_form_link_ref' : 'msg_form_link';
      const msg = await getLocalizedMsg(config, msgKey, lang, { FORM_URL: formUrl, REFERENCIA: refDesc || '' });
      await upsertSession({ session_id: sessionId, estado: 'form_sent', intent: 'alquiler', reference });
      await appendMemory(sessionId, 'ai', msg);
      return { reply: msg, estado: 'form_sent', intent: 'alquiler', reference };
    }

    // ── COMPRA ────────────────────────────────────────────────────────────────
    if (intent === 'compra') {
      const outcome = compra_outcome || 'generic';
      let msg;

      if (outcome === 'generic') {
        msg = await getLocalizedMsg(config, 'msg_compra_generico', lang, { TELEFONO_ADMINISTRACION: telefonoAdmin });
        await upsertSession({ session_id: sessionId, estado: 'compra_no_ref', intent: 'compra', reference: null });
      } else if (outcome === 'has_ref') {
        msg = await getLocalizedMsg(config, 'msg_compra_ref_ok', lang);
        await upsertSession({ session_id: sessionId, estado: 'compra_notified', intent: 'compra', reference });
        if (!testMode) {
          const refText = reference ? JSON.stringify(reference) : 'sin detalle';
          try { await sendBuilderBot(sessionId, `Nuevo interesado en compra. Tel: ${sessionId}. Referencia: ${refText}`); } catch { /* ignore */ }
        }
      } else {
        msg = await getLocalizedMsg(config, 'msg_compra_no_ref', lang);
        await upsertSession({ session_id: sessionId, estado: 'compra_notified', intent: 'compra', reference: null });
        if (!testMode) {
          try { await sendBuilderBot(sessionId, `Nuevo interesado en compra (sin referencia). Tel: ${sessionId}`); } catch { /* ignore */ }
        }
      }

      await appendMemory(sessionId, 'ai', msg);
      return { reply: msg, estado: outcome === 'generic' ? 'compra_no_ref' : 'compra_notified', intent: 'compra', reference: reference ?? null };
    }
  }

  // ── Respuesta conversacional normal (el agente sigue preguntando) ──────────
  const reply = result.content || '';
  await appendMemory(sessionId, 'ai', reply);
  return { reply, estado, intent: session.intent, reference: session.reference };
}

/**
 * Procesa mensajes entrantes reales desde Chatwoot.
 */
export async function processIncoming(phone, payloads) {
  const config = await getPanelConfig();
  if (!isBotActivo(config)) return;

  const first = payloads[0]?.body || payloads[0] || {};
  const accountId = first.account?.id;
  const conversationId = first.conversation?.id;

  const aggregatedContent = payloads
    .map((p) => (p.body || p).content)
    .filter(Boolean)
    .join('\n')
    .trim();
  if (!aggregatedContent) return;

  const sessionId = normalizePhone(
    first.sender?.phone_number || first.conversation?.custom_attributes?.phone_number
  );
  if (!sessionId) return;

  const result = await runBotTurn(sessionId, aggregatedContent, { accountId, conversationId });

  if (result.reply && accountId != null && conversationId != null) {
    await sendChatwoot(accountId, conversationId, result.reply);
  }
}

/**
 * Procesa un mensaje de prueba (sin Chatwoot ni BuilderBot).
 * Escribe en DB igual que en producción para reflejar estado real.
 * @returns {{ reply: string|null, estado: string, intent: string|null, reference: object|null }}
 */
export async function processTestMessage(sessionId, message) {
  return runBotTurn(sessionId, message, { testMode: true });
}
