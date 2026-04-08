import { parse } from 'csv-parse/sync';
import XLSX from 'xlsx';
import { query } from '../db.js';

const ALLOWED = [
  'ref_code',
  'direccion',
  'zona',
  'tipo_operacion',
  'tipo_vivienda',
  'planta',
  'ascensor',
  'habitaciones',
  'banos',
  'garaje',
  'precio',
  'descripcion',
  'activo',
];

const HEADER_ALIASES = {
  ref: 'ref_code',
  referencia: 'ref_code',
  codigo: 'ref_code',
  código: 'ref_code',
  ref_code: 'ref_code',
  direccion: 'direccion',
  dirección: 'direccion',
  direccio: 'direccion',
  zona: 'zona',
  tipo_operacion: 'tipo_operacion',
  tipo: 'tipo_operacion',
  operacion: 'tipo_operacion',
  operación: 'tipo_operacion',
  tipo_vivienda: 'tipo_vivienda',
  vivienda: 'tipo_vivienda',
  planta: 'planta',
  ascensor: 'ascensor',
  habitaciones: 'habitaciones',
  habitacions: 'habitaciones',
  banos: 'banos',
  baños: 'banos',
  banys: 'banos',
  garaje: 'garaje',
  precio: 'precio',
  preu: 'precio',
  descripcion: 'descripcion',
  descripción: 'descripcion',
  descripcio: 'descripcion',
  activo: 'activo',
  active: 'activo',
};

function normalizeHeader(h) {
  if (!h || typeof h !== 'string') return null;
  const k = h.trim().toLowerCase().replace(/\s+/g, '_');
  return HEADER_ALIASES[k] || k;
}

function parseBool(v) {
  if (v == null || v === '') return true;
  const s = String(v).trim().toLowerCase();
  if (['0', 'false', 'no', 'f', 'n'].includes(s)) return false;
  if (['1', 'true', 'yes', 's', 'sí', 'si'].includes(s)) return true;
  return Boolean(v);
}

function parseRow(raw) {
  const row = {};
  for (const [k, v] of Object.entries(raw)) {
    const key = normalizeHeader(k);
    if (!key || !ALLOWED.includes(key)) continue;
    row[key] = v;
  }
  if (!row.ref_code || String(row.ref_code).trim() === '') return null;
  return {
    ref_code: String(row.ref_code).trim(),
    direccion: row.direccion != null ? String(row.direccion) : null,
    zona: row.zona != null ? String(row.zona) : null,
    tipo_operacion: normalizeTipoOperacion(row.tipo_operacion || 'alquiler'),
    tipo_vivienda: row.tipo_vivienda != null ? String(row.tipo_vivienda) : null,
    planta: row.planta != null ? String(row.planta) : null,
    ascensor: row.ascensor != null ? String(row.ascensor) : null,
    habitaciones: row.habitaciones != null && row.habitaciones !== '' ? parseInt(String(row.habitaciones), 10) : null,
    banos: row.banos != null && row.banos !== '' ? parseInt(String(row.banos), 10) : null,
    garaje: row.garaje != null ? String(row.garaje) : null,
    precio: row.precio != null && row.precio !== '' ? Number(String(row.precio).replace(',', '.')) : null,
    descripcion: row.descripcion != null ? String(row.descripcion) : null,
    activo: parseBool(row.activo),
  };
}

function normalizeTipoOperacion(v) {
  const s = (v || 'alquiler').toString().trim().toLowerCase();
  if (s === 'compra' || s === 'venta') return 'compra';
  return 'alquiler';
}

export async function list(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const search = (req.query.search || '').trim();
    const zona = req.query.zona;
    const tipo_operacion = req.query.tipo_operacion;
    const precio_min = req.query.precio_min;
    const precio_max = req.query.precio_max;
    const habitaciones = req.query.habitaciones;
    const activo = req.query.activo;

    const where = [];
    const params = [];
    let idx = 1;

    if (search) {
      where.push(
        `(ref_code ILIKE $${idx} OR direccion ILIKE $${idx} OR zona ILIKE $${idx} OR descripcion ILIKE $${idx})`
      );
      params.push(`%${search}%`);
      idx++;
    }
    if (zona) {
      where.push(`zona = $${idx}`);
      params.push(zona);
      idx++;
    }
    if (tipo_operacion) {
      where.push(`tipo_operacion = $${idx}`);
      params.push(normalizeTipoOperacion(tipo_operacion));
      idx++;
    }
    if (precio_min) {
      where.push(`precio >= $${idx}`);
      params.push(Number(precio_min));
      idx++;
    }
    if (precio_max) {
      where.push(`precio <= $${idx}`);
      params.push(Number(precio_max));
      idx++;
    }
    if (habitaciones) {
      where.push(`habitaciones = $${idx}`);
      params.push(parseInt(habitaciones, 10));
      idx++;
    }
    if (activo === 'true' || activo === 'false') {
      where.push(`activo = $${idx}`);
      params.push(activo === 'true');
      idx++;
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const countRes = await query(`SELECT COUNT(*)::int AS total FROM properties ${whereClause}`, params);
    const total = countRes.rows[0].total;

    params.push(limit, offset);
    const dataRes = await query(
      `SELECT * FROM properties ${whereClause} ORDER BY updated_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
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
    console.error('properties.list', err);
    return res.status(500).json({ error: 'server_error' });
  }
}

export async function getOne(req, res) {
  try {
    const { id } = req.params;
    const r = await query('SELECT * FROM properties WHERE id = $1', [id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'not_found' });
    return res.json(r.rows[0]);
  } catch (err) {
    console.error('properties.getOne', err);
    return res.status(500).json({ error: 'server_error' });
  }
}

export async function create(req, res) {
  try {
    const b = req.body || {};
    if (!b.ref_code || String(b.ref_code).trim() === '') {
      return res.status(400).json({ error: 'ref_code_required' });
    }
    const tipo = normalizeTipoOperacion(b.tipo_operacion);
    const r = await query(
      `INSERT INTO properties (
        ref_code, direccion, zona, tipo_operacion, tipo_vivienda, planta, ascensor,
        habitaciones, banos, garaje, precio, descripcion, activo
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING *`,
      [
        String(b.ref_code).trim(),
        b.direccion ?? null,
        b.zona ?? null,
        tipo,
        b.tipo_vivienda ?? null,
        b.planta ?? null,
        b.ascensor ?? null,
        b.habitaciones != null ? parseInt(b.habitaciones, 10) : null,
        b.banos != null ? parseInt(b.banos, 10) : null,
        b.garaje ?? null,
        b.precio != null ? Number(b.precio) : null,
        b.descripcion ?? null,
        b.activo !== false,
      ]
    );
    return res.status(201).json(r.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'duplicate_ref_code', message: 'Ya existe una propiedad con ese ref_code.' });
    }
    console.error('properties.create', err);
    return res.status(500).json({ error: 'server_error' });
  }
}

export async function update(req, res) {
  try {
    const { id } = req.params;
    const b = req.body || {};
    const fields = [];
    const vals = [];
    let i = 1;
    const map = {
      ref_code: (v) => (v != null ? String(v).trim() : null),
      direccion: (v) => v ?? null,
      zona: (v) => v ?? null,
      tipo_operacion: (v) => (v != null ? normalizeTipoOperacion(v) : null),
      tipo_vivienda: (v) => v ?? null,
      planta: (v) => v ?? null,
      ascensor: (v) => v ?? null,
      habitaciones: (v) => (v != null ? parseInt(v, 10) : null),
      banos: (v) => (v != null ? parseInt(v, 10) : null),
      garaje: (v) => v ?? null,
      precio: (v) => (v != null ? Number(v) : null),
      descripcion: (v) => v ?? null,
      activo: (v) => (v === undefined ? undefined : Boolean(v)),
    };
    for (const [key, fn] of Object.entries(map)) {
      if (b[key] === undefined) continue;
      fields.push(`${key} = $${i++}`);
      vals.push(fn(b[key]));
    }
    if (fields.length === 0) return res.status(400).json({ error: 'no_fields' });
    fields.push('updated_at = now()');
    vals.push(id);
    const r = await query(
      `UPDATE properties SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      vals
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'not_found' });
    return res.json(r.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'duplicate_ref_code' });
    }
    console.error('properties.update', err);
    return res.status(500).json({ error: 'server_error' });
  }
}

export async function remove(req, res) {
  try {
    const { id } = req.params;
    const r = await query('DELETE FROM properties WHERE id = $1 RETURNING id', [id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'not_found' });
    return res.status(204).send();
  } catch (err) {
    console.error('properties.remove', err);
    return res.status(500).json({ error: 'server_error' });
  }
}

export async function importFile(req, res) {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'file_required', message: 'Envía un archivo CSV o Excel en el campo "file".' });
    }
    const name = (req.file.originalname || '').toLowerCase();
    const buf = req.file.buffer;
    let rows = [];

    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      const wb = XLSX.read(buf, { type: 'buffer' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { defval: null });
      rows = json;
    } else {
      const text = buf.toString('utf8');
      rows = parse(text, { columns: true, skip_empty_lines: true, trim: true });
    }

    let inserted = 0;
    let updated = 0;
    const errors = [];

    for (let n = 0; n < rows.length; n++) {
      const parsed = parseRow(rows[n]);
      if (!parsed) {
        errors.push({ row: n + 2, reason: 'sin ref_code' });
        continue;
      }
      parsed.tipo_operacion = normalizeTipoOperacion(parsed.tipo_operacion);
      try {
        const ex = await query('SELECT id FROM properties WHERE ref_code = $1', [parsed.ref_code]);
        if (ex.rows.length > 0) {
          await query(
            `UPDATE properties SET
              direccion = $1, zona = $2, tipo_operacion = $3, tipo_vivienda = $4, planta = $5, ascensor = $6,
              habitaciones = $7, banos = $8, garaje = $9, precio = $10, descripcion = $11, activo = $12, updated_at = now()
              WHERE ref_code = $13`,
            [
              parsed.direccion,
              parsed.zona,
              parsed.tipo_operacion,
              parsed.tipo_vivienda,
              parsed.planta,
              parsed.ascensor,
              parsed.habitaciones,
              parsed.banos,
              parsed.garaje,
              parsed.precio,
              parsed.descripcion,
              parsed.activo,
              parsed.ref_code,
            ]
          );
          updated++;
        } else {
          await query(
            `INSERT INTO properties (
              ref_code, direccion, zona, tipo_operacion, tipo_vivienda, planta, ascensor,
              habitaciones, banos, garaje, precio, descripcion, activo
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
            [
              parsed.ref_code,
              parsed.direccion,
              parsed.zona,
              parsed.tipo_operacion,
              parsed.tipo_vivienda,
              parsed.planta,
              parsed.ascensor,
              parsed.habitaciones,
              parsed.banos,
              parsed.garaje,
              parsed.precio,
              parsed.descripcion,
              parsed.activo,
            ]
          );
          inserted++;
        }
      } catch (e) {
        errors.push({ row: n + 2, reason: e.message || String(e) });
      }
    }

    return res.json({ ok: true, inserted, updated, skipped: errors.length, errors: errors.slice(0, 50) });
  } catch (err) {
    console.error('properties.importFile', err);
    return res.status(500).json({ error: 'server_error', message: err.message });
  }
}
