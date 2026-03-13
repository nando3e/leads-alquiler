import { query } from '../db.js';

export async function list(req, res) {
  try {
    const r = await query(
      'SELECT * FROM alert_requirements ORDER BY name'
    );
    return res.json(r.rows);
  } catch (err) {
    console.error('list alert_requirements', err);
    return res.status(500).json({ error: 'server_error' });
  }
}

export async function getOne(req, res) {
  try {
    const { id } = req.params;
    const r = await query('SELECT * FROM alert_requirements WHERE id = $1', [id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'not_found' });
    return res.json(r.rows[0]);
  } catch (err) {
    console.error('getOne alert_requirements', err);
    return res.status(500).json({ error: 'server_error' });
  }
}

export async function create(req, res) {
  try {
    const { name, active = true, criteria, notify_whatsapp = false, notify_email = false, admin_phone = null, admin_email = null } = req.body || {};
    if (!name || !criteria || typeof criteria !== 'object') {
      return res.status(400).json({ error: 'name and criteria required' });
    }
    const r = await query(
      `INSERT INTO alert_requirements (name, active, criteria, notify_whatsapp, notify_email, admin_phone, admin_email)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, !!active, JSON.stringify(criteria), !!notify_whatsapp, !!notify_email, admin_phone || null, admin_email || null]
    );
    return res.status(201).json(r.rows[0]);
  } catch (err) {
    console.error('create alert_requirements', err);
    return res.status(500).json({ error: 'server_error' });
  }
}

export async function update(req, res) {
  try {
    const { id } = req.params;
    const { name, active, criteria, notify_whatsapp, notify_email, admin_phone, admin_email } = req.body || {};
    const updates = [];
    const values = [];
    let idx = 1;
    if (name !== undefined) {
      updates.push(`name = $${idx++}`);
      values.push(name);
    }
    if (active !== undefined) {
      updates.push(`active = $${idx++}`);
      values.push(!!active);
    }
    if (criteria !== undefined) {
      updates.push(`criteria = $${idx++}`);
      values.push(JSON.stringify(criteria));
    }
    if (notify_whatsapp !== undefined) {
      updates.push(`notify_whatsapp = $${idx++}`);
      values.push(!!notify_whatsapp);
    }
    if (notify_email !== undefined) {
      updates.push(`notify_email = $${idx++}`);
      values.push(!!notify_email);
    }
    if (admin_phone !== undefined) {
      updates.push(`admin_phone = $${idx++}`);
      values.push(admin_phone || null);
    }
    if (admin_email !== undefined) {
      updates.push(`admin_email = $${idx++}`);
      values.push(admin_email || null);
    }
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    updates.push(`updated_at = now()`);
    values.push(id);
    await query(
      `UPDATE alert_requirements SET ${updates.join(', ')} WHERE id = $${idx}`,
      values
    );
    const r = await query('SELECT * FROM alert_requirements WHERE id = $1', [id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'not_found' });
    return res.json(r.rows[0]);
  } catch (err) {
    console.error('update alert_requirements', err);
    return res.status(500).json({ error: 'server_error' });
  }
}

export async function remove(req, res) {
  try {
    const { id } = req.params;
    const r = await query('DELETE FROM alert_requirements WHERE id = $1 RETURNING id', [id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'not_found' });
    return res.status(204).send();
  } catch (err) {
    console.error('remove alert_requirements', err);
    return res.status(500).json({ error: 'server_error' });
  }
}
