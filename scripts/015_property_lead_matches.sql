-- Tabla de matches propiedad ↔ lead (matching híbrido SQL + semántico)

CREATE TABLE IF NOT EXISTS property_lead_matches (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id  UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  lead_id      UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  match_score  REAL,
  match_source VARCHAR(10) NOT NULL DEFAULT 'event',
  notified     BOOLEAN NOT NULL DEFAULT false,
  notified_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_plm_property_lead
  ON property_lead_matches (property_id, lead_id);

CREATE INDEX IF NOT EXISTS idx_plm_lead_id
  ON property_lead_matches (lead_id);

CREATE INDEX IF NOT EXISTS idx_plm_notified
  ON property_lead_matches (notified) WHERE notified = false;
