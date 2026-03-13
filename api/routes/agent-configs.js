import { query } from '../db.js';

export async function list(req, res) {
  try {
    const r = await query('SELECT * FROM agent_configs ORDER BY name');
    return res.json(r.rows);
  } catch (err) {
    console.error('list agent_configs', err);
    return res.status(500).json({ error: 'server_error' });
  }
}

export async function getOne(req, res) {
  try {
    const r = await query('SELECT * FROM agent_configs WHERE id = $1', [req.params.id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'not_found' });
    return res.json(r.rows[0]);
  } catch (err) {
    console.error('getOne agent_configs', err);
    return res.status(500).json({ error: 'server_error' });
  }
}

export async function update(req, res) {
  try {
    const { id } = req.params;
    const { description, system_prompt, model, temperature, context_window, active } = req.body || {};
    const updates = [];
    const values = [];
    let idx = 1;

    if (description !== undefined) { updates.push(`description = $${idx++}`); values.push(description); }
    if (system_prompt !== undefined) { updates.push(`system_prompt = $${idx++}`); values.push(system_prompt); }
    if (model !== undefined) { updates.push(`model = $${idx++}`); values.push(model); }
    if (temperature !== undefined) { updates.push(`temperature = $${idx++}`); values.push(Number(temperature)); }
    if (context_window !== undefined) { updates.push(`context_window = $${idx++}`); values.push(parseInt(context_window, 10)); }
    if (active !== undefined) { updates.push(`active = $${idx++}`); values.push(!!active); }

    if (updates.length === 0) return res.status(400).json({ error: 'no_fields' });

    updates.push(`updated_at = now()`);
    values.push(id);

    await query(`UPDATE agent_configs SET ${updates.join(', ')} WHERE id = $${idx}`, values);
    const r = await query('SELECT * FROM agent_configs WHERE id = $1', [id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'not_found' });
    return res.json(r.rows[0]);
  } catch (err) {
    console.error('update agent_configs', err);
    return res.status(500).json({ error: 'server_error' });
  }
}
