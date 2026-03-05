# Leads Alquiler

Sistema de registro de candidatos a alquiler: formulario público + panel con login, filtros, reglas de alerta y webhook a n8n.

## Requisitos

- Node 18+
- PostgreSQL (base `leads_qualifier` con tablas creadas)

## Instalación

```bash
# Raíz
npm install

# API
cd api && npm install && cd ..

# Front (web)
cd web && npm install && cd ..
```

## Configuración

1. Copia `.env.example` a `.env` en la raíz del proyecto.
2. Rellena `DATABASE_URL`, `SUPER_ADMIN_USERNAME` y `SUPER_ADMIN_PASSWORD_HASH`.
   - Para generar el hash del super admin:
   ```bash
   node -e "const bcrypt=require('bcryptjs'); bcrypt.hash('tu_password', 10).then(console.log)"
   ```
   (ejecutar desde `api` donde está bcryptjs)
3. Opcional: `N8N_ALERT_WEBHOOK_URL`, `JWT_SECRET`, `APP_NAME`, `FRONTEND_URL`, `PORT`.

## Desarroll

```bash
# API (puerto 3001) + Web (puerto 5173) a la vez
npm run dev
```

Por separado:

```bash
npm run dev:api   # http://localhost:3001
npm run dev:web   # http://localhost:5173 (proxy /api → 3001)
```

## Rutas

- **Público:** `/form` — formulario de solicitud (idiomas: ca, es, en).
- **Login:** `/login` — acceso al panel.
- **Panel (protegido):** `/panel/leads`, `/panel/alert-rules`, `/panel/alert-sent`, `/panel/config`.

## API

- `POST /api/auth/login` — login (username, password).
- `POST /api/leads` — envío del formulario (público).
- `GET /api/form-config` — número WhatsApp “volver” (público).
- `GET/PATCH/DELETE /api/leads`, `GET /api/leads/export` — panel (Bearer token).
- `GET/POST/PUT/DELETE /api/alert-requirements` — panel.
- `GET /api/alert-sent` — panel.
- `GET/PUT /api/panel-config` — panel.

## Webhook n8n

Cuando un lead cumple una regla de alerta activa, se envía un `POST` a `N8N_ALERT_WEBHOOK_URL` con un JSON:

- `event`: `"lead_alert"`
- `requirement_name`: nombre de la regla
- `lead`: objeto con todos los campos del lead
- `at`: ISO timestamp
