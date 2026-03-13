-- Añadir campos laborales y de ingresos a leads (obligatorios en formulario desde ahora)
-- Valores: temps_ultima_empresa (menys_dun_any, dun_a_dos_anys, mes_de_dos_anys)
--          empresa_espanyola (si, no), tipus_contracte (fix, temporal)
--          ingressos_netos_mensuals (menys_1600, 1600_2000, 2000_2400)

ALTER TABLE leads ADD COLUMN IF NOT EXISTS temps_ultima_empresa VARCHAR(30);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS empresa_espanyola VARCHAR(10);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS tipus_contracte VARCHAR(20);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ingressos_netos_mensuals VARCHAR(20);

CREATE INDEX IF NOT EXISTS idx_leads_temps_ultima_empresa ON leads(temps_ultima_empresa);
CREATE INDEX IF NOT EXISTS idx_leads_empresa_espanyola ON leads(empresa_espanyola);
CREATE INDEX IF NOT EXISTS idx_leads_tipus_contracte ON leads(tipus_contracte);
CREATE INDEX IF NOT EXISTS idx_leads_ingressos_netos ON leads(ingressos_netos_mensuals);
