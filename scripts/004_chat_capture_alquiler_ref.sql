-- Soporte para captura conversacional de alquiler con referencia.

ALTER TABLE chat_sessions
  ADD COLUMN IF NOT EXISTS capture_data JSONB;

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS intencio_contacte VARCHAR(30);

CREATE INDEX IF NOT EXISTS idx_leads_intencio_contacte ON leads(intencio_contacte);

INSERT INTO panel_config (key, value) VALUES
  ('msg_alq_ref_completed', 'Perfecto, ya tengo los datos necesarios sobre esa vivienda. Lo revisaremos y te contactaremos en cuanto podamos ayudarte.')
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Agente: captura_alquiler_ref (repregunta cuando la respuesta es ambigua)
-- ---------------------------------------------------------------------------
INSERT INTO agent_configs (name, description, system_prompt, model, temperature, context_window)
VALUES
(
  'captura_alquiler_ref',
  'Repregunta amable cuando el usuario no ha respondido de forma clara en el flujo de alquiler con referencia. Genera una sola frase de aclaración en el idioma del usuario.',
  'Eres un asistente de {APP_NAME}. En una conversación de alquiler, al usuario se le ha hecho una pregunta y ha respondido de forma poco clara o ambigua.
Tu tarea: escribe UNA sola frase breve y amable para pedir aclaración, en el mismo idioma en que habla el usuario (idioma: {__lang}). No saludes de nuevo, no repitas el nombre de la empresa.
Puedes usar como base esta frase por defecto si encaja: {DEFAULT_CLARIFICATION}
Si prefieres reformularla para que suene más natural, hazlo. Responde ÚNICAMENTE con el texto de la aclaración, sin explicaciones ni prefijos.',
  'gpt-4.1-mini',
  0.40,
  0
)
ON CONFLICT (name) DO NOTHING;
