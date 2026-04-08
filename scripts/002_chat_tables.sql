-- Chat Bot — Creación de tablas (PostgreSQL)
-- Ejecutar una vez. Idempotente: usa IF NOT EXISTS / ON CONFLICT DO NOTHING.

-- ---------------------------------------------------------------------------
-- 1. chat_sessions — estado de la conversación (una fila por teléfono)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_sessions (
  session_id       VARCHAR(50) PRIMARY KEY,  -- teléfono sin '+' (ej: 34690859006)
  estado           VARCHAR(30) NOT NULL DEFAULT 'new',
  -- new | qualifying | form_sent | compra_notified | compra_no_ref | completed
  -- | alq_ref_ask_nom | ... | alq_ref_ask_ingressos_netos_mensuals
  intent           VARCHAR(20),              -- compra | alquiler
  reference        JSONB,                    -- datos extraídos (dirección, precio, portal...)
  capture_data     JSONB,                    -- respuestas parciales del flujo conversacional
  lang             VARCHAR(5),               -- es | ca | en
  account_id       INTEGER,                  -- Chatwoot account.id
  conversation_id  INTEGER,                  -- Chatwoot conversation.id
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_estado ON chat_sessions(estado);

-- ---------------------------------------------------------------------------
-- 2. chat_memory — historial (formato compatible con n8n Postgres Chat Memory)
--    Columna message: JSONB (rol + contenido + metadata según LangChain/n8n)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_memory (
  id          SERIAL PRIMARY KEY,
  session_id  VARCHAR(255) NOT NULL,
  message     JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_memory_session ON chat_memory(session_id, created_at);

-- ---------------------------------------------------------------------------
-- 3. agent_configs — configuración editable de agentes LLM
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agent_configs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             VARCHAR(50) NOT NULL UNIQUE,
  description      TEXT,
  system_prompt    TEXT NOT NULL DEFAULT '',
  model            VARCHAR(50) NOT NULL DEFAULT 'gpt-4.1-mini',
  temperature      DECIMAL(3,2) NOT NULL DEFAULT 0.50,
  context_window   INTEGER NOT NULL DEFAULT 10,  -- nº de mensajes del historial al LLM
  active           BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 4. Seeds: panel_config — bot activo, delay de cola, mensajes configurables
-- ---------------------------------------------------------------------------
INSERT INTO panel_config (key, value) VALUES
  ('bot_activo',         'true'),
  ('message_debounce_ms','1500'),
  ('msg_form_link',      'Genial! Para poder buscar algo acorde a lo que necesites, necesitaría que rellenaras este formulario, por favor: {FORM_URL}'),
  ('msg_form_link_ref',  'Vale, tomo nota de {REFERENCIA}. Para ayudarte a encontrar esa opción u otras que puedan encajarte, necesitaría que rellenaras este formulario: {FORM_URL}'),
  ('msg_compra_ref_ok',  'Perfecto, le notificaré a un agente y se pondrá en contacto contigo en las próximas horas.'),
  ('msg_compra_no_ref',  'Ahora mismo no tenemos información actualizada sobre esa propiedad, pero notificaré a un agente para que se ponga en contacto contigo en las próximas horas.'),
  ('msg_compra_generico','Para conocer las propiedades disponibles en compra, puedes llamarnos al {TELEFONO_ADMINISTRACION} y estaremos encantados de ayudarte.'),
  ('msg_completed',      'Ya tenemos tus datos, gracias. Si encontramos algo que se ajuste a lo que buscas te avisaremos.'),
  ('msg_post_form',      'Tenemos tus datos y el tipo de piso o casa que estás buscando. Lo vamos a revisar y te avisaremos en cuanto tengamos algo que pueda servirte. ¡Muchas gracias por confiar en nosotros!'),
  ('msg_form_success',   'Gracias. Hemos recibido tus datos.'),
  ('msg_form_updated',   'Datos actualizados. Gracias.')
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5. Seeds: agent_configs — agentes iniciales
-- ---------------------------------------------------------------------------
INSERT INTO agent_configs (name, description, system_prompt, model, temperature, context_window)
VALUES
(
  'bienvenida',
  'Primer mensaje al usuario: saludo y pregunta inicial.',
  'Eres el asistente de {APP_NAME}, una agencia inmobiliaria. Saluda amablemente y pregunta en qué puedes ayudar. El usuario puede estar interesado en alquiler o compra de una propiedad (piso, casa, terreno u otro tipo). Sé breve y cercano. Responde siempre en el mismo idioma en el que te hablen.',
  'gpt-4.1-mini',
  0.60,
  0
),
(
  'qualificador',
  'Agente principal de cualificación: detecta intención (compra/alquiler) e intenta extraer una referencia de la propiedad.',
  'Eres el asistente de {APP_NAME}, una agencia inmobiliaria.
La conversación ya ha sido iniciada por otro agente. NO te presentes, NO saludes de nuevo, NO repitas el nombre de la empresa. Continúa la conversación de forma natural desde donde se quedó.
Tu misión es:
1. Si aún no sabes si el usuario busca ALQUILER o COMPRA, pregúntale amablemente.
2. Una vez conozcas la intención, intenta averiguar si tiene alguna propiedad concreta en mente: una dirección, referencia de anuncio, portal donde la vio (Idealista, Fotocasa...), precio, o cualquier detalle que permita identificarla.
3. Haz las preguntas de forma natural, sin que parezca un formulario. Una o dos preguntas por mensaje.
4. Si el usuario dice explícitamente que NO tiene ninguna propiedad concreta en mente y solo quiere saber qué hay disponible, acepta esa respuesta sin insistir más.
5. Si es ALQUILER y ya tienes una referencia identificable, deja de pedir datos personales y finaliza la cualificación: el backend continuará con una captura guiada paso a paso.
6. No menciones que vas a guardar datos ni que tienes un formulario: eso llegará en el siguiente paso.
Responde siempre en el mismo idioma en el que te hablen.',
  'gpt-4.1-mini',
  0.50,
  10
)
ON CONFLICT (name) DO NOTHING;
