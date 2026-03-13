# Despliegue con Docker Compose (Dokploy / VPS)

## Arquitectura de redes

```
Traefik (dokploy-network)
    └── leads-web:80  (nginx)
            └── /api  → proxy → leads-api:3001
                                    └── ${CLIENT_KEY}-postgres:5432  (chatbot-network)
```

- **`leads-internal`**: red privada entre `api` y `web`. Solo ellos dos.
- **`${CLIENT_KEY}_chatbot-network`**: red del compose del cliente (postgres, chatwoot, n8n...). La API se une para llegar a postgres sin pasar por el exterior.
- **`dokploy-network`**: red de Traefik. Solo `web` se une para recibir tráfico externo.
- **Sin puertos expuestos**: Traefik enruta por dominio. El 3001 del VPS sigue libre.

## Variables necesarias en `.env` de producción

```env
CLIENT_KEY=nombre_cliente   # igual al del compose del cliente
DOMAIN=leads.tudominio.com  # dominio público para Traefik

DATABASE_URL=postgresql://usuario:password@nombre_cliente-postgres:5432/leads_qualifier
FRONTEND_URL=https://leads.tudominio.com
```

El resto de variables (tokens, API keys, SMTP...) igual que en `.env.example`.

## Primer despliegue

1. Clonar el repo en el VPS (o subir a Dokploy via Git).
2. Crear `.env` en la raíz (copia de `.env.example`) y rellenar todos los valores.
3. Asegurarse de que la base de datos `leads_qualifier` existe en postgres:
   ```sql
   CREATE DATABASE leads_qualifier;
   ```
   (se puede crear desde n8n, pgAdmin, o conectando al contenedor de postgres).
4. Ejecutar las migraciones SQL:
   ```bash
   # Conectar al contenedor de postgres del cliente y ejecutar los scripts
   docker exec -i ${CLIENT_KEY}-postgres psql -U usuario -d leads_qualifier < scripts/001_create_tables.sql
   docker exec -i ${CLIENT_KEY}-postgres psql -U usuario -d leads_qualifier < scripts/002_chat_tables.sql
   ```
5. Arrancar:
   ```bash
   docker compose up -d --build
   ```
6. Traefik detecta automáticamente el contenedor `web` y emite el certificado SSL para `DOMAIN`.

## Múltiples clientes (mismo compose, distinto dominio)

Cada cliente tiene su propio `CLIENT_KEY` y `DOMAIN`:
- Los contenedores se llaman `${CLIENT_KEY}-leads-api` y `${CLIENT_KEY}-leads-web` → no colisionan.
- El router de Traefik se llama `${CLIENT_KEY}-leads` → único por cliente.
- La red interna se llama `${CLIENT_KEY}_chatbot-network` → la correcta para cada cliente.
- El dominio es diferente → Traefik enruta a cada web por Host header.

Mismo puerto 80 en todos los contenedores, Traefik lo gestiona todo.

## Webhook de Chatwoot

Una vez desplegado, el webhook es:
```
https://${DOMAIN}/api/chatwoot/webhook
```
Configúralo en Chatwoot → Settings → Integrations → Webhooks (evento: `message_created`).
