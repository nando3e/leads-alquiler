import { query } from '../db.js';
import { clearConfigCache } from '../bot/config.js';

export async function getAll(req, res) {
  try {
    const r = await query('SELECT key, value FROM panel_config');
    const config = {};
    for (const row of r.rows) {
      config[row.key] = row.value;
    }
    return res.json(config);
  } catch (err) {
    console.error('getAll panel_config', err);
    const detail = process.env.NODE_ENV !== 'production' ? err.message : undefined;
    return res.status(500).json({ error: 'server_error', ...(detail && { detail }) });
  }
}

export async function set(req, res) {
  try {
    const body = req.body || {};
    clearConfigCache();
    for (const [key, value] of Object.entries(body)) {
      if (!key || typeof key !== 'string') continue;
      await query(
        `INSERT INTO panel_config (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = $2`,
        [key, value == null ? '' : String(value)]
      );
    }
    const r = await query('SELECT key, value FROM panel_config');
    const config = {};
    for (const row of r.rows) {
      config[row.key] = row.value;
    }
    return res.json(config);
  } catch (err) {
    console.error('set panel_config', err);
    return res.status(500).json({ error: 'server_error' });
  }
}
