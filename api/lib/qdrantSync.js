import { randomUUID } from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { QdrantClient } from '@qdrant/js-client-rest';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { query } from '../db.js';
import { clearConfigCache } from '../panelConfig.js';
import { propertyToMarkdown } from './propertyMarkdown.js';

const EMBED_BATCH = 100;
const UPSERT_BATCH = 64;

async function setPanelKeys(pairs) {
  clearConfigCache();
  for (const [key, value] of Object.entries(pairs)) {
    await query(
      `INSERT INTO panel_config (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = $2`,
      [key, value == null ? '' : String(value)]
    );
  }
}

export function validateRagEnv() {
  const missing = [];
  if (!(process.env.QDRANT_URL || '').trim()) missing.push('QDRANT_URL');
  if (!(process.env.QDRANT_COLLECTION || '').trim()) missing.push('QDRANT_COLLECTION');
  if (!(process.env.GEMINI_API_KEY || '').trim()) missing.push('GEMINI_API_KEY');
  if (missing.length) return `Faltan variables: ${missing.join(', ')}`;
  return null;
}

function getSplitter() {
  const chunkSize = Math.max(50, parseInt(process.env.RAG_CHUNK_SIZE, 10) || 400);
  const chunkOverlap = Math.max(0, parseInt(process.env.RAG_CHUNK_OVERLAP, 10) || 100);
  return new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
    separators: ['\n## ', '\n### ', '\n- ', '\n\n', '\n', ' '],
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
  if (out.length !== texts.length) {
    throw new Error('embeddings_batch_length_mismatch');
  }
  return out;
}

/**
 * Sincroniza propiedades activas hacia Qdrant (Markdown → chunks → Gemini → vectores).
 * Actualiza panel_config al terminar (synced) o en error.
 */
export async function runSync(rows) {
  const collection = (process.env.QDRANT_COLLECTION || '').trim();
  const qdrantUrl = (process.env.QDRANT_URL || '').trim();
  const qdrantKey = (process.env.QDRANT_API_KEY || '').trim();

  const parsed = new URL(qdrantUrl);
  const client = new QdrantClient({
    url: qdrantUrl,
    port: parsed.port ? parseInt(parsed.port, 10) : (parsed.protocol === 'https:' ? 443 : 6333),
    ...(qdrantKey ? { apiKey: qdrantKey } : {}),
  });

  const splitter = getSplitter();
  const model = getEmbeddingModel();

  /** @type {{ ref_code: string, content: string }[]} */
  const chunks = [];
  for (const row of rows) {
    const ref = String(row.ref_code || '').trim();
    const md = propertyToMarkdown(row);
    const parts = await splitter.splitText(md);
    for (const content of parts) {
      if (!content.trim()) continue;
      chunks.push({ ref_code: ref, content: content.trim() });
    }
  }

  const dimProbe = await embedBatch(model, [' ']);
  const vectorSize = dimProbe[0]?.length;
  if (!vectorSize) throw new Error('embedding_dimension_unknown');

  await client.deleteCollection(collection).catch(() => {});
  await client.createCollection(collection, {
    vectors: { size: vectorSize, distance: 'Cosine' },
  });

  if (chunks.length === 0) {
    const now = new Date().toISOString();
    await setPanelKeys({
      qdrant_last_sync_at: now,
      qdrant_sync_status: 'synced',
    });
    return;
  }

  for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
    const slice = chunks.slice(i, i + EMBED_BATCH);
    const texts = slice.map((c) => c.content);
    const vectors = await embedBatch(model, texts);
    const points = [];
    for (let j = 0; j < slice.length; j++) {
      points.push({
        id: randomUUID(),
        vector: vectors[j],
        payload: {
          ref_code: slice[j].ref_code,
          content: slice[j].content,
        },
      });
    }
    for (let u = 0; u < points.length; u += UPSERT_BATCH) {
      await client.upsert(collection, {
        wait: true,
        points: points.slice(u, u + UPSERT_BATCH),
      });
    }
  }

  const now = new Date().toISOString();
  await setPanelKeys({
    qdrant_last_sync_at: now,
    qdrant_sync_status: 'synced',
  });
}

export async function runSyncSafe(rows) {
  try {
    await runSync(rows);
  } catch (err) {
    console.error('[qdrantSync]', err);
    await setPanelKeys({
      qdrant_sync_status: 'error',
    }).catch((e) => console.error('[qdrantSync] panel_config', e));
  }
}
