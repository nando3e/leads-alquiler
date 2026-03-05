-- Leads Alquiler — Creación de tablas (PostgreSQL)
-- Ejecutar una vez contra la base de datos. Idempotente: usa IF NOT EXISTS.

-- ---------------------------------------------------------------------------
-- 1. Tabla leads
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leads (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom                   VARCHAR(255) NOT NULL,
  cognoms               VARCHAR(255) NOT NULL,
  dni_nie               VARCHAR(50) NOT NULL,
  mobil                 VARCHAR(50) NOT NULL,
  fix                   VARCHAR(50),
  tipus_immoble         VARCHAR(20) NOT NULL,
  preu_max_mensual      DECIMAL(10,2) NOT NULL,
  moblat                VARCHAR(20) NOT NULL,
  habitacions_min       VARCHAR(10),
  banys_min             VARCHAR(10),
  parking               VARCHAR(20),
  ascensor              VARCHAR(20),
  calefaccio            VARCHAR(20),
  altres                TEXT,
  zona                  VARCHAR(50) NOT NULL,
  zona_altres           VARCHAR(255),
  origen                VARCHAR(30),
  referencia            VARCHAR(255),
  situacio_laboral      VARCHAR(30),
  sector_professio      VARCHAR(255),
  edat                  INTEGER,
  mascotes              VARCHAR(10) NOT NULL,
  quanta_gent_viura     VARCHAR(10),
  menors                INTEGER,
  observacions          TEXT,
  lang                  VARCHAR(5) NOT NULL,
  estat                 VARCHAR(20) NOT NULL DEFAULT 'completat',
  whatsapp_number       VARCHAR(50),
  alert_sent_at         TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_mobil ON leads(mobil);
CREATE INDEX IF NOT EXISTS idx_leads_estat ON leads(estat);
CREATE INDEX IF NOT EXISTS idx_leads_zona ON leads(zona);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_lang ON leads(lang);
CREATE INDEX IF NOT EXISTS idx_leads_origen ON leads(origen);

-- ---------------------------------------------------------------------------
-- 2. Tabla alert_requirements (conjuntos de reglas de alerta)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alert_requirements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,
  active      BOOLEAN NOT NULL DEFAULT true,
  criteria    JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 3. Tabla alert_sent (registro de alertas enviadas por lead y perfil)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alert_sent (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id               UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  alert_requirement_id  UUID NOT NULL REFERENCES alert_requirements(id) ON DELETE CASCADE,
  sent_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload_snapshot      JSONB,
  UNIQUE(lead_id, alert_requirement_id)
);

CREATE INDEX IF NOT EXISTS idx_alert_sent_lead_id ON alert_sent(lead_id);
CREATE INDEX IF NOT EXISTS idx_alert_sent_alert_requirement_id ON alert_sent(alert_requirement_id);

-- ---------------------------------------------------------------------------
-- 4. Tabla users (panel; super admin no está aquí, se valida por env)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(30) NOT NULL,
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- ---------------------------------------------------------------------------
-- 5. Tabla panel_config (whatsapp_return_number, company_name, etc.)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS panel_config (
  key   VARCHAR(100) PRIMARY KEY,
  value TEXT
);

-- Valores iniciales opcionales (descomentar si quieres seeds)
-- INSERT INTO panel_config (key, value) VALUES ('whatsapp_return_number', '')
--   ON CONFLICT (key) DO NOTHING;
-- INSERT INTO panel_config (key, value) VALUES ('company_name', 'Gestoria Agil')
--   ON CONFLICT (key) DO NOTHING;
