import { getPanelConfig, isBotActivo, getLocalizedMsg } from './config.js';
import { getSession, upsertSession } from './session.js';
import { append as appendMemory, getLastN } from './memory.js';
import { sendMessage as sendChatwoot } from './chatwoot.js';
import { notifyAgent as sendBuilderBot } from './builderbot.js';
import { chat, detectLang } from './agents.js';
import { query } from '../db.js';
import {
  getActiveAlertRequirements,
  leadMatchesCriteria,
  wasAlertAlreadySent,
  recordAlertSent,
  updateLeadAlertSentAt,
} from '../alerts.js';
import { notifyN8nAlert, notifyFormularioEnviado } from '../webhook.js';
import { notifyAdminWhatsApp, notifyAdminEmail } from '../notify.js';
import {
  buildAlquilerReferenceQuestion,
  buildAlquilerReferenceSeed,
  buildLeadPayloadFromCapture,
  extractMultipleFields,
  getAlquilerReferenceField,
  getInitialAlquilerReferenceState,
  getNextAlquilerReferenceState,
  getNextMissingState,
  getQuestionFromConfig,
  getValidValuesForStep,
  hasUsefulReference,
  isAlquilerReferenceState,
  isValidValueForField,
  isValidValueForStep,
} from './alquiler-reference.js';

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
  if (reference.ciudad) parts.push(`en ${reference.ciudad}`);
  if (reference.portal) parts.push(`de ${reference.portal}`);
  if (reference.direccion || reference.address) parts.push(reference.direccion || reference.address);
  if (reference.precio || reference.price) parts.push(`por ${reference.precio || reference.price}`);
  if (reference.referencia_anuncio) parts.push(`(ref. ${reference.referencia_anuncio})`);
  return parts.length > 0 ? `${art} ${parts.join(', ')}` : art;
}

/**
 * Resumen estructurado de la vivienda para que el agente pueda responder dudas (metros, habitaciones, etc.).
 */
function buildReferenceSummary(reference) {
  if (!reference || typeof reference !== 'object') return '';
  const parts = [];
  if (reference.ciudad) parts.push(`Ciudad: ${reference.ciudad}`);
  if (reference.precio || reference.price) parts.push(`Precio: ${reference.precio || reference.price}`);
  if (reference.direccion || reference.address) parts.push(`Dirección: ${reference.direccion || reference.address}`);
  if (reference.caracteristicas) parts.push(`Características: ${reference.caracteristicas}`);
  if (reference.metros || reference.superficie) parts.push(`Superficie: ${reference.metros || reference.superficie}`);
  if (reference.habitaciones) parts.push(`Habitaciones: ${reference.habitaciones}`);
  return parts.join('. ');
}

function buildInsertLead(payload) {
  const keys = Object.keys(payload);
  const placeholders = keys.map((_, idx) => `$${idx + 1}`).join(', ');
  return {
    text: `INSERT INTO leads (${keys.join(', ')}, estat) VALUES (${placeholders}, 'completat') RETURNING *`,
    values: keys.map((key) => payload[key]),
  };
}

function buildUpdateLead(payload, id) {
  const keys = Object.keys(payload);
  const sets = keys.map((key, idx) => `${key} = $${idx + 1}`).join(', ');
  return {
    text: `UPDATE leads SET ${sets}, updated_at = now() WHERE id = $${keys.length + 1} RETURNING *`,
    values: [...keys.map((key) => payload[key]), id],
  };
}

async function notifyLeadAlerts(lead) {
  const requirements = await getActiveAlertRequirements();
  for (const req of requirements) {
    const criteria = req.criteria || {};
    if (!leadMatchesCriteria(lead, criteria)) continue;
    const already = await wasAlertAlreadySent(lead.id, req.id);
    if (already) continue;

    await recordAlertSent(lead.id, req.id, lead);
    await updateLeadAlertSentAt(lead.id);
    await notifyN8nAlert(lead, req.name);
    if (req.notify_whatsapp && req.admin_phone) {
      await notifyAdminWhatsApp(req.admin_phone, lead, req.name);
    }
    if (req.notify_email && req.admin_email) {
      await notifyAdminEmail(req.admin_email, lead, req.name);
    }
  }
}

async function persistAlquilerReferenceLead(sessionId, lang, reference, captureData) {
  const payload = buildLeadPayloadFromCapture(sessionId, lang, reference, captureData);
  const existing = await query(
    "SELECT id FROM leads WHERE mobil = $1 AND estat IN ('completat', 'alerta_enviada') LIMIT 1",
    [payload.mobil]
  );

  if (existing.rows.length > 0) {
    const { text, values } = buildUpdateLead(payload, existing.rows[0].id);
    const update = await query(text, values);
    return { lead: update.rows[0], updated: true };
  }

  const { text, values } = buildInsertLead(payload);
  const insert = await query(text, values);
  const lead = insert.rows[0];
  await notifyFormularioEnviado(lead);
  await notifyLeadAlerts(lead);
  return { lead, updated: false };
}

const CAPTURE_FIELD_NAMES = new Set([
  'nom', 'cognoms', 'intencio_contacte', 'mascotes', 'quanta_gent_viura',
  'situacio_laboral', 'temps_ultima_empresa', 'empresa_espanyola', 'tipus_contracte', 'ingressos_netos_mensuals',
]);

async function getCaptureAgentReply(sessionId, step, userMessage, lang, ciudad, referenceSummary = '') {
  const history = await getLastN(sessionId, 16);
  const vars = {
    __lang: lang,
    CURRENT_STEP: step,
    VALID_VALUES: getValidValuesForStep(step),
    CIUDAD: ciudad || '',
    REFERENCE_SUMMARY: referenceSummary,
  };
  const res = await chat('captura_alquiler_ref', userMessage, history, vars);
  if (res.type === 'tool_call' && res.tool === 'enviar_mensaje' && res.args?.content) {
    return { type: 'message', content: res.args.content.trim() };
  }
  if (res.type === 'tool_call' && res.tool === 'completar_paso' && res.args?.value != null) {
    return { type: 'completar_paso', value: String(res.args.value).trim() };
  }
  if (res.type === 'tool_call' && res.tool === 'capturar_datos' && res.args?.fields && typeof res.args.fields === 'object') {
    const fields = {};
    for (const [key, val] of Object.entries(res.args.fields)) {
      if (CAPTURE_FIELD_NAMES.has(key) && val != null && String(val).trim() !== '') {
        const v = String(val).trim();
        if (isValidValueForField(key, v)) fields[key] = v;
      }
    }
    if (Object.keys(fields).length > 0) {
      return {
        type: 'capturar_datos',
        fields,
        suggested_reply: res.args.suggested_reply != null ? String(res.args.suggested_reply).trim() : undefined,
      };
    }
  }
  if (res.type === 'message' && res.content?.trim()) {
    return { type: 'message', content: res.content.trim() };
  }
  return null;
}

async function handleAlquilerReferenceTurn(sessionId, session, userMessage, lang, config) {
  const ciudad = session.reference?.ciudad || '';

  const extracted = extractMultipleFields(userMessage, session.capture_data || {}, config);
  if (Object.keys(extracted).length > 0) {
    const mergedCapture = { ...(session.capture_data || {}), ...extracted };
    const nextState = getNextMissingState(mergedCapture);

    if (!nextState) {
      await upsertSession({
        session_id: sessionId,
        estado: 'completed',
        intent: 'alquiler',
        capture_data: mergedCapture,
      });
      await persistAlquilerReferenceLead(sessionId, lang, session.reference, mergedCapture);
      const reply = await getLocalizedMsg(config, 'msg_alq_ref_completed', lang);
      await appendMemory(sessionId, 'ai', reply);
      return { reply, estado: 'completed', intent: 'alquiler', reference: session.reference };
    }

    await upsertSession({
      session_id: sessionId,
      estado: nextState,
      intent: 'alquiler',
      capture_data: mergedCapture,
    });

    const configNextQuestion = getQuestionFromConfig(config, nextState, lang);
    let nextReply = configNextQuestion || buildAlquilerReferenceQuestion(nextState, lang);
    if (!configNextQuestion) {
      try {
        const nextRes = await getCaptureAgentReply(
          sessionId,
          nextState,
          'Genera únicamente la pregunta para este paso. Responde con enviar_mensaje.',
          lang,
          ciudad
        );
        if (nextRes?.type === 'message' && nextRes.content) nextReply = nextRes.content;
      } catch (_) { /* use default */ }
    }
    await appendMemory(sessionId, 'ai', nextReply);
    return { reply: nextReply, estado: nextState, intent: 'alquiler', reference: session.reference };
  }

  const field = getAlquilerReferenceField(session.estado);
  const referenceSummary = buildReferenceSummary(session.reference);
  let res = null;
  try {
    res = await getCaptureAgentReply(sessionId, session.estado, userMessage, lang, ciudad, referenceSummary);
  } catch (_) { /* fallback below */ }

  if (res?.type === 'capturar_datos') {
    const mergedCapture = { ...(session.capture_data || {}), ...res.fields };
    const nextState = getNextMissingState(mergedCapture);

    if (!nextState) {
      await upsertSession({
        session_id: sessionId,
        estado: 'completed',
        intent: 'alquiler',
        capture_data: mergedCapture,
      });
      await persistAlquilerReferenceLead(sessionId, lang, session.reference, mergedCapture);
      const reply = await getLocalizedMsg(config, 'msg_alq_ref_completed', lang);
      await appendMemory(sessionId, 'ai', reply);
      return { reply, estado: 'completed', intent: 'alquiler', reference: session.reference };
    }

    await upsertSession({
      session_id: sessionId,
      estado: nextState,
      intent: 'alquiler',
      capture_data: mergedCapture,
    });

    const configNextQuestion = getQuestionFromConfig(config, nextState, lang);
    let nextReply = configNextQuestion || buildAlquilerReferenceQuestion(nextState, lang);
    if (!configNextQuestion) {
      try {
        const nextRes = await getCaptureAgentReply(
          sessionId,
          nextState,
          'Genera únicamente la pregunta para este paso. Responde con enviar_mensaje.',
          lang,
          ciudad,
          referenceSummary
        );
        if (nextRes?.type === 'message' && nextRes.content) nextReply = nextRes.content;
      } catch (_) { /* use default */ }
    }
    const fullReply = [res.suggested_reply, nextReply].filter(Boolean).join(' ');
    await appendMemory(sessionId, 'ai', fullReply);
    return { reply: fullReply, estado: nextState, intent: 'alquiler', reference: session.reference };
  }

  if (!res) {
    const reply = buildAlquilerReferenceQuestion(session.estado, lang, true);
    await appendMemory(sessionId, 'ai', reply);
    return { reply, estado: session.estado, intent: 'alquiler', reference: session.reference };
  }

  if (res.type === 'message') {
    await appendMemory(sessionId, 'ai', res.content);
    return { reply: res.content, estado: session.estado, intent: 'alquiler', reference: session.reference };
  }

  if (res.type === 'completar_paso') {
    const value = res.value;
    if (!isValidValueForStep(session.estado, value)) {
      const reply = buildAlquilerReferenceQuestion(session.estado, lang, true);
      await appendMemory(sessionId, 'ai', reply);
      return { reply, estado: session.estado, intent: 'alquiler', reference: session.reference };
    }
    const nextCapture = { [field]: value };
    const mergedCapture = { ...(session.capture_data || {}), ...nextCapture };
    const nextState = getNextMissingState(mergedCapture);

    if (!nextState) {
      await upsertSession({
        session_id: sessionId,
        estado: 'completed',
        intent: 'alquiler',
        capture_data: mergedCapture,
      });
      await persistAlquilerReferenceLead(sessionId, lang, session.reference, mergedCapture);
      const reply = await getLocalizedMsg(config, 'msg_alq_ref_completed', lang);
      await appendMemory(sessionId, 'ai', reply);
      return { reply, estado: 'completed', intent: 'alquiler', reference: session.reference };
    }

    await upsertSession({
      session_id: sessionId,
      estado: nextState,
      intent: 'alquiler',
      capture_data: mergedCapture,
    });

    const configNextQuestion = getQuestionFromConfig(config, nextState, lang);
    let nextReply = configNextQuestion || buildAlquilerReferenceQuestion(nextState, lang);
    if (!configNextQuestion) {
      try {
        const nextRes = await getCaptureAgentReply(
          sessionId,
          nextState,
          'Genera únicamente la pregunta para este paso. Responde con enviar_mensaje.',
          lang,
          ciudad
        );
        if (nextRes?.type === 'message' && nextRes.content) nextReply = nextRes.content;
      } catch (_) { /* use default */ }
    }
    await appendMemory(sessionId, 'ai', nextReply);
    return { reply: nextReply, estado: nextState, intent: 'alquiler', reference: session.reference };
  }

  const reply = buildAlquilerReferenceQuestion(session.estado, lang, true);
  await appendMemory(sessionId, 'ai', reply);
  return { reply, estado: session.estado, intent: 'alquiler', reference: session.reference };
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

  if (isAlquilerReferenceState(estado)) {
    return handleAlquilerReferenceTurn(sessionId, session, aggregatedContent, lang, config);
  }

  // ── Cualificación: agente con tool calling ─────────────────────────────────
  const result = await chat('qualificador', aggregatedContent, history, { APP_NAME: appName, __lang: lang });

  // El agente decidió que ya tiene suficiente información → llama a la herramienta
  if (result.type === 'tool_call' && result.tool === 'finalizar_cualificacion') {
    const { intent, reference = null, compra_outcome } = result.args;

    // ── ALQUILER ──────────────────────────────────────────────────────────────
    if (intent === 'alquiler') {
      if (hasUsefulReference(reference)) {
        const startState = getInitialAlquilerReferenceState();
        const seed = buildAlquilerReferenceSeed(sessionId, lang, reference);
        const ciudad = reference?.ciudad || '';
        const configQuestion = getQuestionFromConfig(config, startState, lang);
        let msg = configQuestion || buildAlquilerReferenceQuestion(startState, lang);
        if (!configQuestion) {
          try {
            const refSummary = buildReferenceSummary(reference);
            const firstRes = await getCaptureAgentReply(
              sessionId,
              startState,
              'Genera la pregunta inicial para este paso. Si hay ciudad, menciónala (ej. esa vivienda en Barcelona). Responde con enviar_mensaje.',
              lang,
              ciudad,
              refSummary
            );
            if (firstRes?.type === 'message' && firstRes.content) msg = firstRes.content;
          } catch (_) { /* use default */ }
        }
        await upsertSession({
          session_id: sessionId,
          estado: startState,
          intent: 'alquiler',
          reference,
          capture_data: seed,
        });
        await appendMemory(sessionId, 'ai', msg);
        return { reply: msg, estado: startState, intent: 'alquiler', reference };
      }
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
