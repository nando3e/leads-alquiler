-- Mensajes de formulario enviado (base castellano; si ya existen por 002, no se sobrescriben)
INSERT INTO panel_config (key, value) VALUES
  ('msg_form_success',   'Gracias. Hemos recibido tus datos.'),
  ('msg_form_updated',   'Datos actualizados. Gracias.')
ON CONFLICT (key) DO NOTHING;

-- Mensajes predefinidos en catalán
INSERT INTO panel_config (key, value) VALUES
  ('msg_form_link_ca',      'Genial! Per poder buscar alguna cosa que encaixi amb el que necessites, necessitaria que omplissis aquest formulari, si us plau: {FORM_URL}'),
  ('msg_form_link_ref_ca',  'Entesos, prenc nota de {REFERENCIA}. Per ajudar-te a trobar aquesta opcio o d''altres que puguin interessar-te, necessitaria que omplissis aquest formulari: {FORM_URL}'),
  ('msg_compra_ref_ok_ca',  'Perfecte, notificare a un agent i es posara en contacte amb tu en les properes hores.'),
  ('msg_compra_no_ref_ca',  'Ara mateix no tenim informacio actualitzada sobre aquesta propietat, pero notificare a un agent perque es posi en contacte amb tu en les properes hores.'),
  ('msg_compra_generico_ca','Per coneixer les propietats disponibles en compra, pots trucar-nos al {TELEFONO_ADMINISTRACION} i estarem encantats d''ajudar-te.'),
  ('msg_completed_ca',      'Ja tenim les teves dades, gracies. Si trobem alguna cosa que encaixi amb el que busques t''avisarem.'),
  ('msg_post_form_ca',      'Tenim les teves dades i el tipus de pis o casa que estas buscant. Ho revisarem i t''avisarem tan aviat com tinguem alguna cosa que pugui servir-te. Moltes gracies per confiar en nosaltres!'),
  ('msg_form_success_ca',   'Gràcies. Hem rebut les teves dades.'),
  ('msg_form_updated_ca',   'Dades actualitzades. Gràcies.')
ON CONFLICT (key) DO NOTHING;
