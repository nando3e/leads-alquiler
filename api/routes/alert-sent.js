import { query } from '../db.js';

export async function list(req, res) {
  try {
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const r = await query(
      `SELECT s.id, s.lead_id, s.alert_requirement_id, s.sent_at, s.payload_snapshot,
              ar.name AS requirement_name,
              l.nom, l.cognoms, l.mobil, l.zona, l.preu_max_mensual
       FROM alert_sent s
       JOIN alert_requirements ar ON ar.id = s.alert_requirement_id
       JOIN leads l ON l.id = s.lead_id
       ORDER BY s.sent_at DESC
       LIMIT $1`,
      [limit]
    );
    return res.json(r.rows);
  } catch (err) {
    console.error('list alert_sent', err);
    return res.status(500).json({ error: 'server_error' });
  }
}
