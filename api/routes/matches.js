import { query } from '../db.js';

export async function list(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const where = [];
    const params = [];
    let idx = 1;

    if (req.query.property_id) {
      where.push(`m.property_id = $${idx++}`);
      params.push(req.query.property_id);
    }
    if (req.query.lead_id) {
      where.push(`m.lead_id = $${idx++}`);
      params.push(req.query.lead_id);
    }
    if (req.query.notified === 'true' || req.query.notified === 'false') {
      where.push(`m.notified = $${idx++}`);
      params.push(req.query.notified === 'true');
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const countRes = await query(
      `SELECT COUNT(*)::int AS total FROM property_lead_matches m ${whereClause}`,
      params
    );
    const total = countRes.rows[0].total;

    params.push(limit, offset);
    const dataRes = await query(
      `SELECT m.*,
              p.ref_code, p.direccion AS prop_direccion, p.zona AS prop_zona,
              p.precio AS prop_precio, p.tipo_vivienda AS prop_tipo_vivienda,
              l.nom AS lead_nom, l.cognoms AS lead_cognoms, l.mobil AS lead_mobil,
              l.zona AS lead_zona, l.preu_max_mensual AS lead_preu_max
       FROM property_lead_matches m
       JOIN properties p ON p.id = m.property_id
       JOIN leads l ON l.id = m.lead_id
       ${whereClause}
       ORDER BY m.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      params
    );

    return res.json({
      items: dataRes.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('matches.list', err);
    return res.status(500).json({ error: 'server_error' });
  }
}

export async function remove(req, res) {
  try {
    const { id } = req.params;
    const r = await query('DELETE FROM property_lead_matches WHERE id = $1 RETURNING id', [id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'not_found' });
    return res.status(204).send();
  } catch (err) {
    console.error('matches.remove', err);
    return res.status(500).json({ error: 'server_error' });
  }
}
