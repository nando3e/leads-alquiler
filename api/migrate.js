/**
 * migrate.js
 * Se ejecuta al arrancar el servidor.
 * 1. Crea la base de datos si no existe.
 * 2. Ejecuta los scripts SQL en orden (todos son idempotentes: IF NOT EXISTS).
 */

import pg from 'pg';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// En Docker: scripts están en /app/scripts. En local: en repo/scripts (../scripts).
const scriptsDir = existsSync(resolve(__dirname, 'scripts'))
  ? resolve(__dirname, 'scripts')
  : resolve(__dirname, '../scripts');

const SQL_FILES = [
  resolve(scriptsDir, '001_create_tables.sql'),
  resolve(scriptsDir, '002_chat_tables.sql'),
  resolve(scriptsDir, '003_leads_empleo_ingresos.sql'),
  resolve(scriptsDir, '004_chat_capture_alquiler_ref.sql'),
  resolve(scriptsDir, '005_agent_captura_alquiler_ref.sql'),
  resolve(scriptsDir, '006_captura_agent_prompt_flow.sql'),
  resolve(scriptsDir, '007_alq_ref_questions_config.sql'),
  resolve(scriptsDir, '008_captura_agent_capturar_datos.sql'),
  resolve(scriptsDir, '009_alq_ref_interpretacion.sql'),
  resolve(scriptsDir, '010_ensure_agents.sql'),
  resolve(scriptsDir, '012_properties_table.sql'),
  resolve(scriptsDir, '013_leads_reference_and_mobil_unique.sql'),
  resolve(scriptsDir, '014_properties_mascotas.sql'),
];

function parseConnectionString(url) {
  // Extrae el nombre de la base de datos de la URL y devuelve una URL a postgres (sin db)
  const u = new URL(url);
  const dbName = u.pathname.replace(/^\//, '');
  u.pathname = '/postgres'; // base de datos por defecto para crear la nuestra
  return { adminUrl: u.toString(), dbName };
}

export async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required');

  const { adminUrl, dbName } = parseConnectionString(databaseUrl);

  // 1. Conectar a postgres (base de datos de sistema) para crear la nuestra si no existe
  const adminClient = new pg.Client({ connectionString: adminUrl });
  try {
    await adminClient.connect();
    const exists = await adminClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );
    if (exists.rowCount === 0) {
      console.log(`[migrate] Creating database "${dbName}"...`);
      await adminClient.query(`CREATE DATABASE "${dbName}"`);
      console.log(`[migrate] Database "${dbName}" created.`);
    }
  } catch (err) {
    // Si no tiene permiso para crear la BD, solo lo avisamos pero continuamos
    console.warn('[migrate] Could not auto-create database (may already exist or lack permissions):', err.message);
  } finally {
    await adminClient.end();
  }

  // 2. Conectar a la base de datos real y ejecutar los scripts SQL en orden
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    for (const file of SQL_FILES) {
      const sql = await readFile(file, 'utf8');
      console.log(`[migrate] Running ${file.split(/[/\\]/).pop()}...`);
      await client.query(sql);
    }
    const check = await client.query("SELECT 1 FROM agent_configs LIMIT 1").catch((e) => ({ error: e }));
    if (check.error) {
      console.warn('[migrate] Warning: agent_configs not readable:', check.error.message);
    } else {
      console.log('[migrate] All migrations applied.');
    }
  } finally {
    await client.end();
  }
}
