import { query } from '../db.js';

export async function getSession(sessionId) {
  const r = await query(
    'SELECT session_id, estado, intent, reference, lang, account_id, conversation_id, created_at, updated_at FROM chat_sessions WHERE session_id = $1',
    [sessionId]
  );
  return r.rows[0] || null;
}

/**
 * Inserta o actualiza una sesión.
 * Solo modifica los campos que se pasen explícitamente.
 * Los campos no incluidos en `data` se mantienen intactos en la BD.
 */
export async function upsertSession(data) {
  const { session_id } = data;
  if (!session_id) throw new Error('session_id is required');

  const existing = await getSession(session_id);

  if (!existing) {
    // INSERT: primera vez, rellenamos todo con defaults
    const estado = data.estado ?? 'new';
    const intent = data.intent ?? null;
    const reference = data.reference ?? null;
    const lang = data.lang ?? null;
    const account_id = data.account_id ?? null;
    const conversation_id = data.conversation_id ?? null;

    await query(
      `INSERT INTO chat_sessions (session_id, estado, intent, reference, lang, account_id, conversation_id, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, now())`,
      [session_id, estado, intent, reference ? JSON.stringify(reference) : null, lang, account_id, conversation_id]
    );
    return getSession(session_id);
  }

  // UPDATE: solo los campos explícitamente proporcionados
  const updates = [];
  const values = [];
  let idx = 1;

  if ('estado' in data) { updates.push(`estado = $${idx++}`); values.push(data.estado); }
  if ('intent' in data) { updates.push(`intent = $${idx++}`); values.push(data.intent); }
  if ('reference' in data) { updates.push(`reference = $${idx++}`); values.push(data.reference ? JSON.stringify(data.reference) : null); }
  if ('lang' in data) { updates.push(`lang = $${idx++}`); values.push(data.lang); }
  if ('account_id' in data && data.account_id != null) { updates.push(`account_id = $${idx++}`); values.push(data.account_id); }
  if ('conversation_id' in data && data.conversation_id != null) { updates.push(`conversation_id = $${idx++}`); values.push(data.conversation_id); }

  if (updates.length === 0) return existing;

  updates.push('updated_at = now()');
  values.push(session_id);

  await query(
    `UPDATE chat_sessions SET ${updates.join(', ')} WHERE session_id = $${idx}`,
    values
  );
  return getSession(session_id);
}
