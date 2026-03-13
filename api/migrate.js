/**
 * migrate.js
 * Se ejecuta al arrancar el servidor.
 * 1. Crea la base de datos si no existe.
 * 2. Ejecuta los scripts SQL en orden (todos son idempotentes: IF NOT EXISTS).
 */

import pg from 'pg';
import { readFile } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SQL_FILES = [
  resolve(__dirname, '../scripts/001_create_tables.sql'),
  resolve(__dirname, '../scripts/002_chat_tables.sql'),
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
    console.log('[migrate] All migrations applied.');
  } finally {
    await client.end();
  }
}
