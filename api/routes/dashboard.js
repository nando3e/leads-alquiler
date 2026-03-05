import { query } from '../db.js';

function buildWhere(filters) {
  const conditions = [];
  const params = [];
  let idx = 1;
  if (filters.zona) {
    conditions.push(`zona = $${idx++}`);
    params.push(filters.zona);
  }
  if (filters.situacio_laboral) {
    conditions.push(`situacio_laboral = $${idx++}`);
    params.push(filters.situacio_laboral);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return { where, params };
}

export async function getStats(req, res) {
  try {
    const zona = (req.query.zona || '').trim() || null;
    const situacio_laboral = (req.query.situacio_laboral || '').trim() || null;
    const from = (req.query.from || '').trim() || null;
    const to = (req.query.to || '').trim() || null;

    const filters = {};
    if (zona) filters.zona = zona;
    if (situacio_laboral) filters.situacio_laboral = situacio_laboral;
    const { where, params } = buildWhere(filters);
    const baseParams = [...params];
    const extraAnd = where ? ` AND ${where.replace(/\$\d+/g, (m) => {
      const n = parseInt(m.slice(1), 10);
      return `$${n + 1}`;
    }).replace('WHERE ', '')}` : '';

    const totalRes = await query(
      `SELECT COUNT(*)::int AS c FROM leads ${where}`,
      baseParams
    );

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayIso = todayStart.toISOString();
    const todayRes = await query(
      `SELECT COUNT(*)::int AS c FROM leads WHERE created_at >= $1${extraAnd}`,
      [todayIso, ...baseParams]
    );

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekIso = weekStart.toISOString();
    const weekRes = await query(
      `SELECT COUNT(*)::int AS c FROM leads WHERE created_at >= $1${extraAnd}`,
      [weekIso, ...baseParams]
    );

    let periodCount = null;
    if (from && to) {
      const periodAnd = where ? ` AND ${where.replace(/\$\d+/g, (m) => {
        const n = parseInt(m.slice(1), 10);
        return `$${n + 2}`;
      }).replace('WHERE ', '')}` : '';
      const periodRes = await query(
        `SELECT COUNT(*)::int AS c FROM leads WHERE created_at >= $1 AND created_at < $2::date + interval '1 day'${periodAnd}`,
        [from, to, ...baseParams]
      );
      periodCount = periodRes?.rows[0]?.c ?? 0;
    }

    return res.json({
      total: totalRes.rows[0]?.c ?? 0,
      new_today: todayRes.rows[0]?.c ?? 0,
      new_this_week: weekRes.rows[0]?.c ?? 0,
      new_period: periodCount,
      filters: { zona: zona || null, situacio_laboral: situacio_laboral || null, from, to },
    });
  } catch (err) {
    console.error('getStats', err);
    return res.status(500).json({ error: 'server_error' });
  }
}
