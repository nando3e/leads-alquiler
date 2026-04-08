-- Catálogo de propiedades (panel + sincronización con Qdrant fuera de este repo)

CREATE TABLE IF NOT EXISTS properties (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_code        VARCHAR(50) NOT NULL,
  direccion       VARCHAR(500),
  zona            VARCHAR(100),
  tipo_operacion  VARCHAR(20) NOT NULL,
  tipo_vivienda   VARCHAR(50),
  planta          VARCHAR(20),
  ascensor        VARCHAR(10),
  habitaciones    INTEGER,
  banos           INTEGER,
  garaje          VARCHAR(10),
  precio          DECIMAL(12,2),
  descripcion     TEXT,
  activo          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_properties_ref_code ON properties (ref_code);
CREATE INDEX IF NOT EXISTS idx_properties_tipo_operacion ON properties (tipo_operacion);
CREATE INDEX IF NOT EXISTS idx_properties_zona ON properties (zona);
CREATE INDEX IF NOT EXISTS idx_properties_activo ON properties (activo);
