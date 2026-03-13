-- Preguntas del flujo "alquiler con referencia" editables desde Configuración.
-- Claves: alq_ref_q_<paso>_<lang>. Solo insertamos si no existen (no sobrescribir ediciones).

INSERT INTO panel_config (key, value) VALUES
  ('alq_ref_q_nom_es', 'Perfecto. Para ayudarte con esa vivienda, ¿me dices tu nombre?'),
  ('alq_ref_q_nom_ca', 'Perfecte. Per ajudar-te amb aquest habitatge, em pots dir el teu nom?'),
  ('alq_ref_q_nom_en', 'Perfect. To help you with that property, what is your first name?'),
  ('alq_ref_q_cognoms_es', 'Gracias. ¿Y tus apellidos?'),
  ('alq_ref_q_cognoms_ca', 'Gràcies. I els teus cognoms?'),
  ('alq_ref_q_cognoms_en', 'Thanks. And your surname?'),
  ('alq_ref_q_intencio_es', '¿Te interesa más 1) recibir más información sobre el piso o 2) concertar una visita? Puedes escribirme el número si te va mejor.'),
  ('alq_ref_q_intencio_ca', 'T''interessa més 1) rebre més informació sobre el pis o 2) concertar una visita? Si vols, em pots escriure el número.'),
  ('alq_ref_q_intencio_en', 'Would you prefer 1) more information about the property or 2) to arrange a viewing? You can reply with the number if easier.'),
  ('alq_ref_q_mascotes_es', '¿Tenéis mascotas? Puedes responder sí o no.'),
  ('alq_ref_q_mascotes_ca', 'Teniu mascotes? Pots respondre sí o no.'),
  ('alq_ref_q_mascotes_en', 'Do you have pets? You can answer yes or no.'),
  ('alq_ref_q_quanta_gent_es', '¿Cuántas personas viviríais en la vivienda?'),
  ('alq_ref_q_quanta_gent_ca', 'Quantes persones viuríeu a l''habitatge?'),
  ('alq_ref_q_quanta_gent_en', 'How many people would live in the property?'),
  ('alq_ref_q_situacio_es', '¿Cuál es vuestra situación laboral?
1. Cuenta ajena
2. Cuenta propia / autónomo
3. En paro
4. Estudiante
5. Jubilado
6. Otros'),
  ('alq_ref_q_situacio_ca', 'Quina és la vostra situació laboral?
1. Compte aliè
2. Compte propi / autònom
3. A l''atur
4. Estudiant
5. Jubilat
6. Altres'),
  ('alq_ref_q_situacio_en', 'What is your employment situation?
1. Employed
2. Self-employed
3. Unemployed
4. Student
5. Retired
6. Other'),
  ('alq_ref_q_temps_empresa_es', '¿Cuánto tiempo llevas en la última empresa?
1. Menos de un año
2. De 1 a 2 años
3. Más de 2 años'),
  ('alq_ref_q_temps_empresa_ca', 'Quant temps fa que ets a l''última empresa?
1. Menys d''un any
2. D''1 a 2 anys
3. Més de 2 anys'),
  ('alq_ref_q_temps_empresa_en', 'How long have you been in your current company?
1. Less than one year
2. Between 1 and 2 years
3. More than 2 years'),
  ('alq_ref_q_empresa_esp_es', '¿Es una empresa española? Puedes responder 1) sí o 2) no.'),
  ('alq_ref_q_empresa_esp_ca', 'És una empresa espanyola? Pots respondre 1) sí o 2) no.'),
  ('alq_ref_q_empresa_esp_en', 'Is it a Spanish company? You can reply 1) yes or 2) no.'),
  ('alq_ref_q_contracte_es', '¿Tu contrato es 1) fijo o 2) temporal?'),
  ('alq_ref_q_contracte_ca', 'El teu contracte és 1) fix o 2) temporal?'),
  ('alq_ref_q_contracte_en', 'Is your contract 1) permanent or 2) temporary?'),
  ('alq_ref_q_ingressos_es', '¿En qué rango está vuestro ingreso mensual neto?
1. Menos de 1.600 €
2. De 1.600 a 2.000 €
3. De 2.000 a 2.400 €'),
  ('alq_ref_q_ingressos_ca', 'En quin rang estan els vostres ingressos mensuals nets?
1. Menys de 1.600 €
2. De 1.600 a 2.000 €
3. De 2.000 a 2.400 €'),
  ('alq_ref_q_ingressos_en', 'Which range best matches your net monthly income?
1. Less than 1,600 €
2. 1,600 to 2,000 €
3. 2,000 to 2,400 €')
ON CONFLICT (key) DO NOTHING;
