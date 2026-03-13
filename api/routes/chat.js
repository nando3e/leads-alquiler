import { processTestMessage } from '../bot/flow.js';
import { getSession } from '../bot/session.js';
import { getLastN } from '../bot/memory.js';
import { query } from '../db.js';

/** POST /api/chat/message — envía un mensaje al bot y obtiene la respuesta */
export async function postMessage(req, res) {
  try {
    const { session_id, message } = req.body || {};
    if (!session_id || !String(message || '').trim()) {
      return res.status(400).json({ error: 'session_id y message son obligatorios' });
    }

    const result = await processTestMessage(session_id, String(message).trim());
    const session = await getSession(session_id);
    const history = await getLastN(session_id, 50);

    return res.json({
      reply: result.reply,
      estado: session?.estado ?? result.estado,
      intent: session?.intent ?? result.intent,
      reference: session?.reference ?? result.reference,
      history,
    });
  } catch (err) {
    console.error('[chat test]', err);
    return res.status(500).json({ error: err.message || 'server_error' });
  }
}

/** GET /api/chat/:session_id — estado actual de una sesión */
export async function getSessionState(req, res) {
  try {
    const session = await getSession(req.params.session_id);
    const history = await getLastN(req.params.session_id, 50);
    return res.json({ session: session || null, history });
  } catch (err) {
    return res.status(500).json({ error: 'server_error' });
  }
}

/** DELETE /api/chat/:session_id — borra una sesión de prueba */
export async function deleteSession(req, res) {
  try {
    const { session_id } = req.params;
    await query('DELETE FROM chat_memory WHERE session_id = $1', [session_id]);
    await query('DELETE FROM chat_sessions WHERE session_id = $1', [session_id]);
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'server_error' });
  }
}
