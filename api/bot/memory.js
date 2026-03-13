import { query } from '../db.js';

export async function append(sessionId, role, content) {
  await query(
    'INSERT INTO chat_memory (session_id, role, content) VALUES ($1, $2, $3)',
    [sessionId, role, content]
  );
}

export async function getLastN(sessionId, n) {
  const r = await query(
    `SELECT role, content, created_at
     FROM chat_memory
     WHERE session_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [sessionId, n]
  );
  return r.rows.reverse();
}
