# Lista de campos y diseño de tablas

Referencia única para backend, frontend y n8n. Solo alquiler. Donde aplique se usa **selección (dropdown)**; "indiferent" se traduce a **"No importa"** en etiquetas y valor `no_importa` en DB.

---

## 1. Campos del formulario: tipo de control y opciones

**Leyenda:** `Control` = tipo en el formulario. `Valores en DB` = valor que se guarda (minúsculas, snake_case). Solo los que no puedan ser selección van como texto/número libre.

### Contacto / identificación (solo texto)
| # | Campo (DB) | Control | Obligatorio | Valores / Notas |
|---|------------|---------|-------------|------------------|
| 1 | `nom` | Input texto | Sí | Nombre |
| 2 | `cognoms` | Input texto | Sí | Apellidos |
| 3 | `dni_nie` | Input texto | Sí | DNI o NIE |
| 4 | `mobil` | Input texto (tel) | Sí | Teléfono móvil (WhatsApp) |
| 5 | `fix` | Input texto (tel) | No | Teléfono fijo |

### Búsqueda (alquiler)
| # | Campo (DB) | Control | Obligatorio | Opciones (valor en DB) |
|---|------------|---------|-------------|------------------------|
| 6 | `tipus_immoble` | **Select** | Sí | Casa → `casa`, Pis → `pis`, No importa → `no_importa` |
| 7 | `preu_max_mensual` | Input número | Sí | Preu màxim mensual (€) |
| 8 | `moblat` | **Select** | Sí | Sí → `si`, No → `no`, No importa → `no_importa` |
| 9 | `habitacions_min` | **Select** | No | 1, 2, 3, 4, 5+, No importa → `1`, `2`, `3`, `4`, `5_mes`, `no_importa` |
| 10 | `banys_min` | **Select** | No | 1, 2, 3+, No importa → `1`, `2`, `3_mes`, `no_importa` |
| 11 | `parking` | **Select** | No | Sí → `si`, No → `no`, No importa → `no_importa` |
| 12 | `ascensor` | **Select** | No | Sí → `si`, No → `no`, No importa → `no_importa` |
| 13 | `calefaccio` | **Select** | No | Sí → `si`, No → `no`, No importa → `no_importa` |
| 14 | `altres` | **Multi-select** (opcional) + texto opcional | No | Opciones: Terrassa, Balcó, Jardí, Altres. Si "Altres" → input texto "Especificar". No obligatorio. Guardar: JSON array de códigos + texto libre, o texto concatenado |
| 15 | `zona` | **Select** | Sí | Qualsevol → `Qualsevol`, Olot → `Olot`, Sant Joan les Fonts → `Sant Joan les Fonts`, Rodalies → `Rodalies`, Altres → `Altres`. Si "Altres" → mostrar input texto |
| 16 | `zona_altres` | Input texto | No | Solo visible si zona = Altres. Texto libre |

### Origen y referencia (solo bot / n8n; no en formulario)

Se conservan en la tabla; **los rellena el bot desde n8n**, no el formulario.

| # | Campo (DB) | Quién rellena | Notas |
|---|------------|----------------|--------|
| 17 | `origen` | n8n | Canal: idealista, fotocasa, habitaclia, pisos_com, la_comarca, viu, reclam, generico |
| 18 | `referencia` | n8n | "generico", "ref-123", "piso calle X", etc. |

### Perfil del candidato
| # | Campo (DB) | Control | Obligatorio | Opciones / Notas |
|---|------------|---------|-------------|------------------|
| 19 | `situacio_laboral` | **Select** | No | Empleat per compte d'altri → `empleat`, Autònom → `autonom`, Aturat → `aturat`, Estudiant → `estudiant`, Jubilat → `jubilat`, Altres → `altres` |
| 20 | `sector_professio` | Input texto | No | Etiqueta: "Sector, professió o empresa". Texto libre. |
| 21 | `edat` | Input número | No | Edad (entero) |
| 22 | `mascotes` | **Select** | Sí | Sí → `si`, No → `no` |
| 23 | `quanta_gent_viura` | **Select** | No | Etiqueta: "Quantes persones viuran?". Valores 1, 2, 3, 4, 5, 6+ (`1`..`6_mes`) |
| 24 | `menors` | Input número | No | Etiqueta: "Menors d'edat". Número de menores (entero, 0 si no hay) |
| 25 | `observacions` | Textarea | No | Altres coses a comentar (texto libre) |

### Metadatos (rellenados por sistema)
| Campo (DB) | Tipo | Notas |
|------------|------|--------|
| `id` | uuid | PK |
| `lang` | string | `es` \| `ca` \| `en` |
| `estat` | string | `completat` \| `alerta_enviada` |
| `whatsapp_number` | string | Para "volver a WhatsApp" |
| `alert_sent_at` | timestamp \| null | Control de alertas |
| `created_at`, `updated_at` | timestamp | |

---

### Resumen de valores estándar en DB

- **Sí/No/No importa:** siempre `si`, `no`, `no_importa`.
- **Habitaciones:** `1`, `2`, `3`, `4`, `5_mes`, `no_importa`.
- **Baños:** `1`, `2`, `3_mes`, `no_importa`.
- **Zona:** `Qualsevol`, `Olot`, `Sant Joan les Fonts`, `Rodalies`, `Altres` (y si Altres, texto en `zona_altres`).
- **Origen:** `idealista`, `fotocasa`, `habitaclia`, `pisos_com`, `la_comarca`, `viu`, `reclam`, `generico`.
- **Referencia:** texto libre (`generico`, `ref-123`, `piso calle Rozas`, etc.).
- **Situación laboral:** `empleat`, `autonom`, `aturat`, `estudiant`, `jubilat`, `altres`.

---

## 2. Diseño de tablas (PostgreSQL)

### Tabla `leads`

Una fila por lead. Mismo teléfono puede generar varios leads (varios registros) según 5.5; si más adelante se decide “actualizar el mismo”, se puede identificar por `mobil` y hacer UPDATE.

```text
leads
├── id                    UUID PRIMARY KEY DEFAULT gen_random_uuid()
├── nom                   VARCHAR(255) NOT NULL
├── cognoms               VARCHAR(255) NOT NULL
├── dni_nie               VARCHAR(50) NOT NULL
├── mobil                 VARCHAR(50) NOT NULL
├── fix                   VARCHAR(50)
├── tipus_immoble         VARCHAR(20) NOT NULL   -- casa | pis | no_importa
├── preu_max_mensual      DECIMAL(10,2) NOT NULL
├── moblat                VARCHAR(20) NOT NULL  -- si | no | no_importa
├── habitacions_min       VARCHAR(10)            -- 1 | 2 | 3 | 4 | 5_mes | no_importa
├── banys_min             VARCHAR(10)            -- 1 | 2 | 3_mes | no_importa
├── parking               VARCHAR(20)            -- si | no | no_importa
├── ascensor              VARCHAR(20)
├── calefaccio            VARCHAR(20)
├── altres                TEXT                   -- opciones + texto "altres" (ej. JSON o concatenado)
├── zona                  VARCHAR(50) NOT NULL   -- Olot | Sant Joan les Fonts | Rodalies | Altres
├── zona_altres           VARCHAR(255)           -- si zona = Altres
├── origen                 VARCHAR(30)            -- idealista | fotocasa | habitaclia | pisos_com | la_comarca | viu | reclam | generico
├── referencia             VARCHAR(255)           -- generico | ref-123 | piso calle X | texto libre
├── situacio_laboral      VARCHAR(30)            -- empleat | autonom | aturat | estudiant | jubilat | altres
├── sector_professio      VARCHAR(255)
├── edat                  INTEGER
├── mascotes              VARCHAR(10) NOT NULL   -- si | no
├── quanta_gent_viura     VARCHAR(10)            -- 1 | 2 | 3 | 4 | 5 | 6_mes (o INTEGER si se prefiere)
├── menors                INTEGER               -- número de menors (0 si cap)
├── observacions          TEXT                   -- altres coses a comentar
├── lang                  VARCHAR(5) NOT NULL    -- es | ca | en
├── estat                 VARCHAR(20) NOT NULL DEFAULT 'completat'  -- completat | alerta_enviada
├── whatsapp_number       VARCHAR(50)
├── alert_sent_at         TIMESTAMPTZ
├── created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
└── updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
```

Índices útiles: `mobil`, `estat`, `zona`, `created_at`, `lang`.

---

### Tabla `alert_requirements` (conjuntos de requisitos)

Varios conjuntos (perfil A, B, etc.) según 4.4. Cada fila = un conjunto de reglas. Criterios configurables: presupuesto min/max, zonas, mascotas, nº personas, moblat, situación laboral (4.3).

```text
alert_requirements
├── id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
├── name        VARCHAR(100) NOT NULL   -- ej. "Perfil ideal", "Urgent"
├── active      BOOLEAN NOT NULL DEFAULT true
├── criteria    JSONB NOT NULL          -- ver ejemplo abajo
├── created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
└── updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
```

Ejemplo de `criteria` (JSON):

```json
{
  "preu_min": 600,
  "preu_max": 1200,
  "zones": ["Olot", "Sant Joan les Fonts"],
  "mascotes": false,
  "moblat": null,
  "quanta_gent_max": 4,
  "situacio_laboral": ["fix", "temporal"]
}
```

Al guardar un lead, el backend recorre los `alert_requirements` activos, evalúa si el lead cumple cada uno y, si cumple, llama al webhook de n8n (URL en .env) y registra el envío (tabla siguiente). Varios conjuntos = puede disparar el webhook para más de un perfil; el payload puede incluir `alert_requirement_id` o `profile_name`.

---

### Tabla `alert_sent` (evitar duplicar / re-enviar solo si cambian datos relevantes)

Según 10.4 (guardar que ya se envió) y 11.2 (re-enviar si cambian campos relevantes para la alerta).

```text
alert_sent
├── id                    UUID PRIMARY KEY DEFAULT gen_random_uuid()
├── lead_id               UUID NOT NULL REFERENCES leads(id)
├── alert_requirement_id  UUID NOT NULL REFERENCES alert_requirements(id)
├── sent_at               TIMESTAMPTZ NOT NULL DEFAULT now()
├── payload_snapshot      JSONB       -- opcional: copia de los campos que cuentan para la regla
└── UNIQUE(lead_id, alert_requirement_id)  -- un envío por lead y perfil (o permitir varios si quieres historial)
```

Lógica sugerida:

- Si el lead **no** tiene fila en `alert_sent` para ese `alert_requirement_id` → evaluar criterios; si cumple → POST webhook y INSERT en `alert_sent`.
- Si **sí** tiene fila: comparar campos relevantes del lead con `payload_snapshot` (o con el último estado guardado). Si cambió algo que afecta al criterio → volver a evaluar; si cumple → nuevo POST y nuevo INSERT (o UPDATE según cómo quieras el historial).

También puedes poner en `leads` un único `alert_sent_at` si solo tienes un conjunto de requisitos; con **varios conjuntos**, `alert_sent` por (lead_id, alert_requirement_id) es más claro.

---

### Tabla `users` (varios roles, 1.2 y 4.1)

Super admin: un usuario fijo, identificado por env (usuario + contraseña o email). Resto de usuarios/roles desde el panel.

```text
users
├── id           UUID PRIMARY KEY DEFAULT gen_random_uuid()
├── username     VARCHAR(100) NOT NULL UNIQUE
├── password_hash VARCHAR(255) NOT NULL
├── role         VARCHAR(30) NOT NULL   -- super_admin | admin | agente | ...
├── active       BOOLEAN NOT NULL DEFAULT true
├── created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
└── updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
```

- Super admin: no se crea por registro; se comprueba en login contra env (ej. `SUPER_ADMIN_USERNAME`, `SUPER_ADMIN_PASSWORD_HASH`).
- Resto: CRUD desde el panel; solo super admin (o los que tú definas) pueden configurar requisitos de alerta (4.1).

---

### Tabla `panel_config` (opcional)

Para número “Volver a WhatsApp” y otros valores configurables desde el panel (6.2).

```text
panel_config
├── key   VARCHAR(100) PRIMARY KEY   -- ej. whatsapp_return_number, company_name
└── value TEXT
```

---

## 3. Resumen para el equipo

- **Formulario (React):** usa solo los campos de la sección 1 que quieras mostrar; los metadatos (`id`, `lang`, `estat`, `created_at`, etc.) los rellena el backend.
- **Backend (Node):** INSERT/UPDATE en `leads`; lectura de `alert_requirements`; evaluación de criterios; POST al webhook n8n; INSERT en `alert_sent` (y opcional `payload_snapshot`).
- **n8n:** puede leer/escribir `leads` (y si hace falta `panel_config`) según 7.2; el estado de chat lo gestionas tú en tu base (chat_memory) desde n8n.
- **Panel:** listado/filtros/export de `leads`; CRUD de `alert_requirements` y de `users` (según roles); edición de “Volver a WhatsApp” en `panel_config` si usas esa tabla.

---

## 4. Antes de construir — checklist

Lo que conviene tener cerrado o creado antes de picar código.

| # | Qué | Estado / Notas |
|---|-----|-----------------|
| 1 | **Scripts SQL** de creación de tablas (leads, alert_requirements, alert_sent, users, panel_config) | Pendiente → siguiente paso |
| 2 | **Variables de entorno** (.env.example): DATABASE_URL, SUPER_ADMIN_USERNAME, SUPER_ADMIN_PASSWORD_HASH, N8N_ALERT_WEBHOOK_URL, APP_NAME (Gestoria Agil), etc. | Lista en doc o .env.example |
| 3 | **Contrato del formulario**: payload POST (campos y nombres) que envía el front al backend | Definido en §1 |
| 4 | **Contrato del webhook de alerta**: qué envía el backend a n8n (todo el lead, JSON) | Ya definido en especificación |
| 5 | **Estructura del repo**: monorepo (front + back juntos), carpetas /api y /web o /frontend | Decidir antes de crear estructura |
| 6 | **Idiomas (ES, CA, EN)**: keys para etiquetas del formulario; copy lo aporta el cliente después | Keys derivables de §1 |
| 7 | **URL base** del formulario y del panel (dominio) | TBD cuando exista |
| 8 | **Número WhatsApp** "Volver a WhatsApp": configurable en panel; valor por defecto en .env | OK en especificación |

**Opcional para arrancar:** límite anti-spam configurable; nota informativa/aviso legal en el formulario.

Con **1 + 2 + 5** cerrados y **3** implícito en §1, se puede empezar: proyecto, DB, endpoint de submit, formulario React. Panel y alertas en siguiente iteración.
