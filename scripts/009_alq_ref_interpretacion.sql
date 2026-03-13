-- Valores por defecto para interpretación del flujo (ejemplos y sinónimos).
INSERT INTO panel_config (key, value) VALUES
  ('alq_ref_ejemplos_mes_info', 'quería saber cuántos metros tiene
cuántas habitaciones
información sobre el piso
qué precio tiene
información del piso'),
  ('alq_ref_ejemplos_concertar_visita', 'quiero verlo
agendar visita
concertar visita
ver el piso'),
  ('alq_ref_sinonimos_fix', 'fijo
indefinido
permanente
permanent'),
  ('alq_ref_sinonimos_temporal', 'temporal
eventual
temporary')
ON CONFLICT (key) DO NOTHING;
