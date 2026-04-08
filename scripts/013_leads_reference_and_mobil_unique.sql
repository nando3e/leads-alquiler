-- Referencia JSON del chat (n8n) y unicidad por móvil para upserts

ALTER TABLE leads ADD COLUMN IF NOT EXISTS reference JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_mobil_unique ON leads (mobil);
