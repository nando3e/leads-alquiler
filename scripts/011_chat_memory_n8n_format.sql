-- Migración: chat_memory al formato que crea n8n (Postgres Chat Memory / LangChain)
-- Ejecutar en pgAdmin sobre la base de datos correcta.
--
-- AVISO: borra todas las filas de chat_memory. Haz backup antes si necesitas conservar historial.
--
-- Esquema objetivo (coincide con la tabla que genera n8n):
--   id          SERIAL PRIMARY KEY
--   session_id  VARCHAR(255)
--   message     JSONB
--   created_at  TIMESTAMPTZ

DROP TABLE IF EXISTS chat_memory;

CREATE TABLE chat_memory (
  id          SERIAL PRIMARY KEY,
  session_id  VARCHAR(255) NOT NULL,
  message     JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_memory_session
  ON chat_memory (session_id, created_at);
