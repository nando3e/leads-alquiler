import { GoogleGenerativeAI } from '@google/generative-ai';
import { QdrantClient } from '@qdrant/js-client-rest';
import { query } from '../db.js';
import { validateRagEnv } from './qdrantSync.js';
import { notifyPropertyLeadMatch } from '../webhook.js';

const EMBED_BATCH = 50;

function getScoreThreshold() {
  const v = parseFloat(process.env.MATCH_SCORE_THRESHOLD);
  return Number.isFinite(v) ? v : 0.7;
}

function getQdrantClient() {
  const qdrantUrl = (process.env.QDRANT_URL || '').trim();
  const qdrantKey = (process.env.QDRANT_API_KEY || '').trim();
  const parsed = new URL(qdrantUrl);
  return new QdrantClient({
    url: qdrantUrl,
    port: parsed.port
      ? parseInt(parsed.port, 10)
      : parsed.protocol === 'https:' ? 443 : 6333,
    ...(qdrantKey ? { apiKey: qdrantKey } : {}),
  });
}

function getEmbeddingModel() {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  const modelName = (process.env.RAG_EMBEDDING_MODEL || '').trim() || 'text-embedding-004';
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: modelName });
}

async function embedBatch(model, texts) {
  if (texts.length === 0) return [];
  const res = await model.batchEmbedContents({
    requests: texts.map((text) => ({
      content: { role: 'user', parts: [{ text }] },
    })),
  });
  const out = res.embeddings?.map((e) => e.values) || [];
  if (out.length !== texts.length) throw new Error('embeddings_batch_length_mismatch');
  return out;
}

/**
 * Convierte las preferencias de un lead en texto natural para embedding.
 */
export function leadToSearchText(lead) {
  const parts = [];

  const tipo = lead.tipus_immoble && lead.tipus_immoble !== 'no_importa'
    ? lead.tipus_immoble : 'vivienda';
  const zona = lead.zona && lead.zona !== 'Qualsevol' ? lead.zona : null;
  parts.push(`Busco ${tipo}${zona ? ` en ${zona}` : ''} de alquiler.`);

  if (lead.preu_max_mensual && Number(lead.preu_max_mensual) > 0) {
    parts.push(`Presupuesto máximo: ${lead.preu_max_mensual} €/mes.`);
  }

  const habMin = lead.habitacions_min;
  if (habMin && habMin !== 'no_importa') {
    const n = habMin === '5_mes' ? '5 o más' : habMin;
    parts.push(`Mínimo ${n} habitaciones.`);
  }

  const banyMin = lead.banys_min;
  if (banyMin && banyMin !== 'no_importa') {
    const n = banyMin === '3_mes' ? '3 o más' : banyMin;
    parts.push(`Mínimo ${n} baños.`);
  }

  if (lead.mascotes === 'si') parts.push('Necesito que admitan mascotas.');
  if (lead.parking === 'si') parts.push('Con parking.');
  if (lead.ascensor === 'si') parts.push('Con ascensor.');
  if (lead.moblat === 'si') parts.push('Amueblado.');

  if (lead.zona_altres) parts.push(`Otras zonas: ${lead.zona_altres}.`);
  if (lead.observacions) parts.push(lead.observacions);

  return parts.join(' ');
}

/**
 * SQL pre-filtro: dada una propiedad, devuelve leads activos que encajan.
 * Retorna array de lead rows completas.
 */
export async function sqlPreFilterByProperty(propertyId) {
  const res = await query(`
    SELECT l.*
    FROM leads l, properties p
    WHERE p.id = $1
      AND p.activo = true
      AND l.estat IN ('completat', 'alerta_enviada')
      AND (
        l.zona IS NULL OR l.zona = '' OR l.zona = 'Qualsevol'
        OR LOWER(TRIM(l.zona)) = LOWER(TRIM(p.zona))
      )
      AND (
        l.preu_max_mensual IS NULL OR l.preu_max_mensual = 0
        OR l.preu_max_mensual >= p.precio
      )
      AND (
        l.habitacions_min IS NULL OR l.habitacions_min = '' OR l.habitacions_min = 'no_importa'
        OR (CASE
              WHEN l.habitacions_min = '5_mes' THEN 5
              WHEN l.habitacions_min ~ '^[0-9]+$' THEN CAST(l.habitacions_min AS INTEGER)
              ELSE 0
            END) <= COALESCE(p.habitaciones, 99)
      )
      AND (
        l.banys_min IS NULL OR l.banys_min = '' OR l.banys_min = 'no_importa'
        OR (CASE
              WHEN l.banys_min = '3_mes' THEN 3
              WHEN l.banys_min ~ '^[0-9]+$' THEN CAST(l.banys_min AS INTEGER)
              ELSE 0
            END) <= COALESCE(p.banos, 99)
      )
      AND (l.mascotes IS NULL OR l.mascotes != 'si' OR p.mascotas = true)
      AND (
        l.tipus_immoble IS NULL OR l.tipus_immoble = '' OR l.tipus_immoble = 'no_importa'
        OR LOWER(TRIM(l.tipus_immoble)) = LOWER(TRIM(p.tipo_vivienda))
      )
      AND (
        l.parking IS NULL OR l.parking = '' OR l.parking = 'no_importa' OR l.parking = 'no'
        OR LOWER(TRIM(p.garaje)) IN ('si', 'sí', 'yes', 's', 'true', '1')
      )
      AND (
        l.ascensor IS NULL OR l.ascensor = '' OR l.ascensor = 'no_importa' OR l.ascensor = 'no'
        OR LOWER(TRIM(p.ascensor)) IN ('si', 'sí', 'yes', 's', 'true', '1')
      )
      AND NOT EXISTS (
        SELECT 1 FROM property_lead_matches m
        WHERE m.lead_id = l.id AND m.property_id = p.id
      )
  `, [propertyId]);
  return res.rows;
}

/**
 * SQL pre-filtro batch: devuelve pares (lead_id, property_id) candidatos
 * para leads que aun no tienen match con ninguna propiedad activa nueva.
 */
export async function sqlPreFilterBatch() {
  const res = await query(`
    SELECT l.id AS lead_id, p.id AS property_id, l.zona AS l_zona,
           p.ref_code AS p_ref_code
    FROM leads l
    CROSS JOIN properties p
    WHERE p.activo = true
      AND l.estat IN ('completat', 'alerta_enviada')
      AND (
        l.zona IS NULL OR l.zona = '' OR l.zona = 'Qualsevol'
        OR LOWER(TRIM(l.zona)) = LOWER(TRIM(p.zona))
      )
      AND (
        l.preu_max_mensual IS NULL OR l.preu_max_mensual = 0
        OR l.preu_max_mensual >= p.precio
      )
      AND (
        l.habitacions_min IS NULL OR l.habitacions_min = '' OR l.habitacions_min = 'no_importa'
        OR (CASE
              WHEN l.habitacions_min = '5_mes' THEN 5
              WHEN l.habitacions_min ~ '^[0-9]+$' THEN CAST(l.habitacions_min AS INTEGER)
              ELSE 0
            END) <= COALESCE(p.habitaciones, 99)
      )
      AND (
        l.banys_min IS NULL OR l.banys_min = '' OR l.banys_min = 'no_importa'
        OR (CASE
              WHEN l.banys_min = '3_mes' THEN 3
              WHEN l.banys_min ~ '^[0-9]+$' THEN CAST(l.banys_min AS INTEGER)
              ELSE 0
            END) <= COALESCE(p.banos, 99)
      )
      AND (l.mascotes IS NULL OR l.mascotes != 'si' OR p.mascotas = true)
      AND (
        l.tipus_immoble IS NULL OR l.tipus_immoble = '' OR l.tipus_immoble = 'no_importa'
        OR LOWER(TRIM(l.tipus_immoble)) = LOWER(TRIM(p.tipo_vivienda))
      )
      AND (
        l.parking IS NULL OR l.parking = '' OR l.parking = 'no_importa' OR l.parking = 'no'
        OR LOWER(TRIM(p.garaje)) IN ('si', 'sí', 'yes', 's', 'true', '1')
      )
      AND (
        l.ascensor IS NULL OR l.ascensor = '' OR l.ascensor = 'no_importa' OR l.ascensor = 'no'
        OR LOWER(TRIM(p.ascensor)) IN ('si', 'sí', 'yes', 's', 'true', '1')
      )
      AND NOT EXISTS (
        SELECT 1 FROM property_lead_matches m
        WHERE m.lead_id = l.id AND m.property_id = p.id
      )
  `);
  return res.rows;
}

/**
 * Inserta un match si no existe. Si se inserta, notifica via webhook.
 * Retorna true si se insertó (nuevo match), false si ya existía.
 */
async function insertMatch(propertyId, leadId, score, source) {
  const res = await query(`
    INSERT INTO property_lead_matches (property_id, lead_id, match_score, match_source, notified, notified_at)
    VALUES ($1, $2, $3, $4, true, now())
    ON CONFLICT (property_id, lead_id) DO NOTHING
    RETURNING id
  `, [propertyId, leadId, score, source]);

  if (res.rows.length > 0) {
    try {
      const pRes = await query('SELECT * FROM properties WHERE id = $1', [propertyId]);
      const lRes = await query('SELECT * FROM leads WHERE id = $1', [leadId]);
      if (pRes.rows[0] && lRes.rows[0]) {
        notifyPropertyLeadMatch(lRes.rows[0], pRes.rows[0], score);
      }
    } catch (err) {
      console.error('[match] Error notificando match:', err);
    }
    return true;
  }
  return false;
}

/**
 * Flujo completo de matching para UNA propiedad nueva/editada.
 * Se ejecuta en background (no bloquea la API).
 */
export async function runMatchForProperty(propertyId) {
  const propRes = await query(
    'SELECT id, ref_code FROM properties WHERE id = $1 AND activo = true',
    [propertyId]
  );
  if (propRes.rows.length === 0) return;
  const prop = propRes.rows[0];

  const leads = await sqlPreFilterByProperty(propertyId);
  if (leads.length === 0) {
    console.log(`[match] Propiedad ${prop.ref_code}: 0 leads candidatos`);
    return;
  }
  console.log(`[match] Propiedad ${prop.ref_code}: ${leads.length} leads candidatos SQL`);

  const ragReady = !validateRagEnv();
  if (!ragReady) {
    for (const lead of leads) {
      await insertMatch(propertyId, lead.id, null, 'event');
    }
    console.log(`[match] ${leads.length} matches guardados (sin ranking semántico, RAG no configurado)`);
    return;
  }

  const threshold = getScoreThreshold();
  const collection = (process.env.QDRANT_COLLECTION || '').trim();
  const client = getQdrantClient();
  const model = getEmbeddingModel();
  let saved = 0;

  for (let i = 0; i < leads.length; i += EMBED_BATCH) {
    const batch = leads.slice(i, i + EMBED_BATCH);
    const texts = batch.map(leadToSearchText);
    const vectors = await embedBatch(model, texts);

    for (let j = 0; j < batch.length; j++) {
      const lead = batch[j];
      const vector = vectors[j];
      if (!vector) continue;

      const results = await client.search(collection, {
        vector,
        limit: 50,
        with_payload: true,
      });

      let bestScore = 0;
      for (const hit of results) {
        if (hit.payload?.ref_code === prop.ref_code && hit.score > bestScore) {
          bestScore = hit.score;
        }
      }

      if (bestScore >= threshold) {
        await insertMatch(propertyId, lead.id, bestScore, 'event');
        saved++;
      }
    }
  }

  console.log(`[match] Propiedad ${prop.ref_code}: ${saved} matches guardados (umbral ${threshold})`);
}

/**
 * Wrapper seguro que captura errores sin crashear el proceso.
 */
export async function runMatchForPropertySafe(propertyId) {
  try {
    await runMatchForProperty(propertyId);
  } catch (err) {
    console.error('[match] Error matching propiedad:', err);
  }
}

/**
 * Flujo batch del cron: cruza TODOS los leads activos con TODAS las
 * propiedades activas, descartando pares que ya tienen match.
 */
export async function runMatchForNewLeads() {
  console.log('[match-cron] Iniciando matching batch...');

  const candidates = await sqlPreFilterBatch();
  if (candidates.length === 0) {
    console.log('[match-cron] 0 pares candidatos nuevos');
    return { total: 0, saved: 0 };
  }
  console.log(`[match-cron] ${candidates.length} pares candidatos SQL`);

  const ragReady = !validateRagEnv();
  if (!ragReady) {
    for (const c of candidates) {
      await insertMatch(c.property_id, c.lead_id, null, 'cron');
    }
    console.log(`[match-cron] ${candidates.length} matches guardados (sin ranking semántico)`);
    return { total: candidates.length, saved: candidates.length };
  }

  const leadIds = [...new Set(candidates.map((c) => c.lead_id))];
  const leadsRes = await query(
    `SELECT * FROM leads WHERE id = ANY($1)`,
    [leadIds]
  );
  const leadsMap = new Map(leadsRes.rows.map((l) => [l.id, l]));

  const refByPropId = new Map(candidates.map((c) => [c.property_id, c.p_ref_code]));

  const threshold = getScoreThreshold();
  const collection = (process.env.QDRANT_COLLECTION || '').trim();
  const client = getQdrantClient();
  const model = getEmbeddingModel();

  const candidatesByLead = new Map();
  for (const c of candidates) {
    if (!candidatesByLead.has(c.lead_id)) candidatesByLead.set(c.lead_id, []);
    candidatesByLead.get(c.lead_id).push(c);
  }

  let saved = 0;
  const uniqueLeads = [...candidatesByLead.keys()];

  for (let i = 0; i < uniqueLeads.length; i += EMBED_BATCH) {
    const batchLeadIds = uniqueLeads.slice(i, i + EMBED_BATCH);
    const batchLeads = batchLeadIds.map((id) => leadsMap.get(id)).filter(Boolean);
    const texts = batchLeads.map(leadToSearchText);
    const vectors = await embedBatch(model, texts);

    for (let j = 0; j < batchLeads.length; j++) {
      const lead = batchLeads[j];
      const vector = vectors[j];
      if (!vector) continue;

      const results = await client.search(collection, {
        vector,
        limit: 200,
        with_payload: true,
      });

      const scores = new Map();
      for (const hit of results) {
        const ref = hit.payload?.ref_code;
        if (!ref) continue;
        const prev = scores.get(ref) || 0;
        if (hit.score > prev) scores.set(ref, hit.score);
      }

      const propCandidates = candidatesByLead.get(lead.id) || [];
      for (const c of propCandidates) {
        const refCode = refByPropId.get(c.property_id);
        const score = scores.get(refCode) || 0;
        if (score >= threshold) {
          await insertMatch(c.property_id, c.lead_id, score, 'cron');
          saved++;
        }
      }
    }
  }

  console.log(`[match-cron] ${saved} matches guardados de ${candidates.length} candidatos (umbral ${threshold})`);
  return { total: candidates.length, saved };
}

/**
 * Wrapper seguro para el cron.
 */
export async function runMatchForNewLeadsSafe() {
  try {
    return await runMatchForNewLeads();
  } catch (err) {
    console.error('[match-cron] Error:', err);
    return { total: 0, saved: 0, error: err.message };
  }
}
