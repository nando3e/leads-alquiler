import { query } from '../db.js';
import {
  getActiveAlertRequirements,
  leadMatchesCriteria,
  wasAlertAlreadySent,
  recordAlertSent,
  updateLeadAlertSentAt,
} from '../alerts.js';
import { notifyN8nAlert, notifyFormularioEnviado } from '../webhook.js';
import { getSession } from '../bot/session.js';
import { sendMessage as sendChatwootMessage } from '../bot/chatwoot.js';
import { getPanelConfig } from '../bot/config.js';
import { notifyAdminWhatsApp, notifyAdminEmail } from '../notify.js';

const LEAD_COLUMNS = [
  'nom', 'cognoms', 'dni_nie', 'mobil', 'fix',
  'tipus_immoble', 'preu_max_mensual', 'moblat', 'habitacions_min', 'banys_min',
  'parking', 'ascensor', 'calefaccio', 'altres', 'zona', 'zona_altres',
  'origen', 'referencia', 'situacio_laboral', 'sector_professio', 'edat',
  'mascotes', 'quanta_gent_viura', 'menors', 'observacions',
  'lang', 'whatsapp_number',
];

// Valores por defecto para columnas NOT NULL cuando el form envía vacío (evita 500)
const NOT_NULL_DEFAULTS = {
  nom: '',
  cognoms: '',
  dni_nie: '',
  mobil: '',
  tipus_immoble: 'no_importa',
  preu_max_mensual: 0,
  moblat: 'no_importa',
  zona: 'Qualsevol',
  mascotes: 'no',
  lang: 'ca',
};

function normalizeValue(col, v) {
  if (v === '' || v === undefined) return null;
  if (col === 'preu_max_mensual' && v != null) return Number(v);
  if (col === 'edat' && v != null) return parseInt(v, 10);
  if (col === 'menors' && v != null) return parseInt(v, 10);
  return v;
}

function buildInsertLead(body) {
  const keys = [];
  const values = [];
  for (const col of LEAD_COLUMNS) {
    keys.push(col);
    let v = normalizeValue(col, body[col]);
    if (v === null && col in NOT_NULL_DEFAULTS) v = NOT_NULL_DEFAULTS[col];
    values.push(v);
  }
  const placeholders = values.map((_, j) => `$${j + 1}`).join(', ');
  return {
    text: `INSERT INTO leads (${keys.join(', ')}, estat) VALUES (${placeholders}, 'completat') RETURNING *`,
    values,
  };
}

function buildUpdateLead(body) {
  const sets = [];
  const values = [];
  let idx = 1;
  for (const col of LEAD_COLUMNS) {
    sets.push(`${col} = $${idx++}`);
    values.push(normalizeValue(col, body[col]));
  }
  values.push(body.id);
  return {
    text: `UPDATE leads SET ${sets.join(', ')}, updated_at = now() WHERE id = $${idx} RETURNING *`,
    values,
  };
}

export async function postLead(req, res) {
  try {
    const body = req.body || {};
    const lang = (body.lang || 'ca').replace(/[^a-z]/gi, '') || 'ca';
    const mobil = (body.mobil || '').trim();
    if (!mobil) {
      return res.status(400).json({ error: 'mobil_required', message: 'El teléfono es obligatorio.' });
    }

    const existing = await query(
      "SELECT id FROM leads WHERE mobil = $1 AND estat IN ('completat', 'alerta_enviada') LIMIT 1",
      [mobil]
    );

    if (existing.rows.length > 0) {
      const existingId = existing.rows[0].id;
      const { text, values } = buildUpdateLead({ ...body, id: existingId });
      const update = await query(text, values);
      const lead = update.rows[0];
      const config = await getPanelConfig();
      const { getLocalizedMsg } = await import('../bot/config.js');
      const message = await getLocalizedMsg(config, 'msg_form_updated', lang);
      return res.status(200).json({
        ok: true,
        id: lead.id,
        updated: true,
        message: message || 'Dades actualitzades. Gràcies.',
      });
    }

    const { text, values } = buildInsertLead(body);
    const insert = await query(text, values);
    const lead = insert.rows[0];
    const leadId = lead.id;
    const leadPlain = { ...lead };

    await notifyFormularioEnviado(leadPlain);

    const mobilNorm = (body.mobil || '').replace(/\D/g, '');
    const sessionId = mobilNorm.length === 9 && mobilNorm.startsWith('6') ? '34' + mobilNorm : mobilNorm;
    const chatSession = sessionId ? await getSession(sessionId) || (mobilNorm !== sessionId ? await getSession(mobilNorm) : null) : null;
    if (chatSession?.account_id != null && chatSession?.conversation_id != null) {
      try {
        const config = await getPanelConfig();
        const { getLocalizedMsg } = await import('../bot/config.js');
        const sessionLang = chatSession.lang || 'es';
        const msg = await getLocalizedMsg(config, 'msg_post_form', sessionLang);
        await sendChatwootMessage(chatSession.account_id, chatSession.conversation_id, msg);
        await query("UPDATE chat_sessions SET estado = 'completed', updated_at = now() WHERE session_id = $1", [chatSession.session_id]);
      } catch (e) {
        console.error('send post-form message to Chatwoot', e);
      }
    }

    const requirements = await getActiveAlertRequirements();
    for (const req of requirements) {
      const criteria = req.criteria || {};
      if (!leadMatchesCriteria(leadPlain, criteria)) continue;
      const already = await wasAlertAlreadySent(leadId, req.id);
      if (already) continue;

      await recordAlertSent(leadId, req.id, leadPlain);
      await updateLeadAlertSentAt(leadId);
      await notifyN8nAlert(leadPlain, req.name);
      if (req.notify_whatsapp && req.admin_phone) {
        await notifyAdminWhatsApp(req.admin_phone, leadPlain, req.name);
      }
      if (req.notify_email && req.admin_email) {
        await notifyAdminEmail(req.admin_email, leadPlain, req.name);
      }
    }

    const whatsappNumber = body.whatsapp_number || null;
    if (whatsappNumber) {
      await query(
        'UPDATE leads SET whatsapp_number = $1, updated_at = now() WHERE id = $2',
        [whatsappNumber, leadId]
      );
    }

    const config = await getPanelConfig();
    const { getLocalizedMsg } = await import('../bot/config.js');
    const message = await getLocalizedMsg(config, 'msg_form_success', lang);
    return res.status(201).json({
      ok: true,
      id: lead.id,
      updated: false,
      message: message || 'Gracias. Hemos recibido tus datos.',
    });
  } catch (err) {
    console.error('postLead', err);
    const isDev = process.env.NODE_ENV !== 'production';
    return res.status(500).json({
      error: 'server_error',
      ...(isDev && { message: err.message, stack: err.stack }),
    });
  }
}

export async function getLeads(req, res) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'No autorizado' });

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const search = (req.query.search || '').trim();
    const zona = req.query.zona;
    const estat = req.query.estat;
    const origen = req.query.origen;

    let where = [];
    let params = [];
    let idx = 1;

    if (search) {
      where.push(`(nom ILIKE $${idx} OR cognoms ILIKE $${idx} OR mobil ILIKE $${idx} OR dni_nie ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }
    if (zona) {
      where.push(`zona = $${idx}`);
      params.push(zona);
      idx++;
    }
    if (estat) {
      where.push(`estat = $${idx}`);
      params.push(estat);
      idx++;
    }
    if (origen) {
      where.push(`origen = $${idx}`);
      params.push(origen);
      idx++;
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const countRes = await query(
      `SELECT COUNT(*)::int AS total FROM leads ${whereClause}`,
      params
    );
    const total = countRes.rows[0].total;

    params.push(limit, offset);
    const dataRes = await query(
      `SELECT * FROM leads ${whereClause} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
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
    console.error('getLeads', err);
    return res.status(500).json({ error: 'server_error' });
  }
}

export async function getLeadById(req, res) {
  try {
    const { id } = req.params;
    const r = await query('SELECT * FROM leads WHERE id = $1', [id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'not_found' });
    return res.json(r.rows[0]);
  } catch (err) {
    console.error('getLeadById', err);
    return res.status(500).json({ error: 'server_error' });
  }
}

export async function patchLead(req, res) {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const allowed = LEAD_COLUMNS.filter((c) => body[c] !== undefined);
    if (allowed.length === 0) return res.status(400).json({ error: 'No fields to update' });

    const sets = allowed.map((c, i) => `${c} = $${i + 2}`).join(', ');
    const values = allowed.map((c) => body[c]);
    values.unshift(id);
    await query(
      `UPDATE leads SET ${sets}, updated_at = now() WHERE id = $1`,
      values
    );
    const r = await query('SELECT * FROM leads WHERE id = $1', [id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'not_found' });
    return res.json(r.rows[0]);
  } catch (err) {
    console.error('patchLead', err);
    return res.status(500).json({ error: 'server_error' });
  }
}

export async function deleteLead(req, res) {
  try {
    const { id } = req.params;
    const r = await query('DELETE FROM leads WHERE id = $1 RETURNING id', [id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'not_found' });
    return res.status(204).send();
  } catch (err) {
    console.error('deleteLead', err);
    return res.status(500).json({ error: 'server_error' });
  }
}

function escapeCsv(str) {
  if (str == null) return '';
  const s = String(str);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function exportCsv(req, res) {
  try {
    const search = (req.query.search || '').trim();
    const zona = req.query.zona;
    const estat = req.query.estat;
    const origen = req.query.origen;

    let where = [];
    let params = [];
    let idx = 1;
    if (search) {
      where.push(`(nom ILIKE $${idx} OR cognoms ILIKE $${idx} OR mobil ILIKE $${idx} OR dni_nie ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }
    if (zona) { where.push(`zona = $${idx}`); params.push(zona); idx++; }
    if (estat) { where.push(`estat = $${idx}`); params.push(estat); idx++; }
    if (origen) { where.push(`origen = $${idx}`); params.push(origen); idx++; }
    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const r = await query(
      `SELECT * FROM leads ${whereClause} ORDER BY created_at DESC`,
      params
    );
    const cols = r.rows[0] ? Object.keys(r.rows[0]) : [];
    const header = cols.map(escapeCsv).join(',');
    const lines = [header, ...r.rows.map((row) => cols.map((c) => escapeCsv(row[c])).join(','))];
    const csv = lines.join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=leads.csv');
    return res.send('\uFEFF' + csv);
  } catch (err) {
    console.error('exportCsv', err);
    return res.status(500).json({ error: 'server_error' });
  }
}
