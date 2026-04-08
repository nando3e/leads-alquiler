-- Propiedades: admite mascotas (booleano)

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS mascotas BOOLEAN NOT NULL DEFAULT false;
