# Cómo dar acceso CRUD al MCP de Postgres (realstate)

## Por qué `--access-mode=unrestricted` no cambia nada

Esa opción es de **Cursor**: controla qué puede hacer el agente en el workspace (archivos, terminal, etc.). **No** controla si el servidor MCP puede escribir en la base de datos.

La limitación **solo lectura** viene del **servidor MCP** que usas para Postgres: ese servidor expone una herramienta que solo ejecuta `SELECT` (o transacciones read-only). Para tener CRUD hay que usar un servidor MCP que permita escritura.

---

## Opción 1: Usar un servidor MCP con acceso completo

Hay servidores MCP que exponen herramientas para ejecutar DML/DDL (INSERT, UPDATE, DELETE, CREATE TABLE, etc.). Ejemplo:

### mcp-postgres-full-access

- **GitHub:** https://github.com/syahiidkamil/mcp-postgres-full-access  
- **NPM:** `mcp-postgres-full-access`

En la config de Cursor (por ejemplo `~/.cursor/mcp.json` o `.cursor/mcp.json` del proyecto) añade o sustituye el bloque del servidor Postgres por uno que use este paquete. Ejemplo de estructura (revisa la documentación del repo por el nombre exacto del comando y variables):

```json
{
  "mcpServers": {
    "postgres-realstate": {
      "command": "npx",
      "args": ["-y", "mcp-postgres-full-access"],
      "env": {
        "POSTGRES_CONNECTION_STRING": "postgresql://realstate_admin:TU_PASSWORD@HOST:PUERTO/leads_qualifier"
      }
    }
  }
}
```

Sustituye `TU_PASSWORD`, `HOST` y `PUERTO` por los valores reales. Si ya tienes otro servidor para realstate (por ejemplo `postgres-realstate`), cambia ese bloque para que use un servidor de **full access** en lugar del que solo hace lecturas.

---

## Opción 2: Variable de entorno en tu servidor actual

Algunos servidores MCP de Postgres permiten habilitar escritura con una variable de entorno (por ejemplo `ALLOW_WRITE=true` o `READ_ONLY=false`). Depende del paquete que estés usando.

1. Revisa la documentación o el código del servidor MCP que tienes configurado para realstate (nombre del paquete en `args`).
2. Si existe esa variable, añádela en `env` en tu `mcp.json`:

```json
"env": {
  "POSTGRES_CONNECTION_STRING": "...",
  "ALLOW_WRITE": "true"
}
```

---

## Opción 3: Segundo servidor solo para realstate con CRUD

Puedes dejar el servidor actual (solo lectura) y añadir **otro** servidor que apunte a la misma base pero con un paquete de acceso completo, con otro nombre, por ejemplo `postgres-realstate-write`. Así en el chat puedes usar uno para consultas y otro cuando necesites que ejecute CREATE/INSERT/UPDATE/DELETE.

---

## Dónde se configura

- **Global:** `~/.cursor/mcp.json` (Windows: `C:\Users\TU_USUARIO\.cursor\mcp.json`)
- **Proyecto:** `c:\Users\nando\APPS\leads_alquiler\.cursor\mcp.json`

Después de cambiar la config, reinicia Cursor o recarga la ventana para que cargue el servidor MCP nuevo o actualizado.

---

## Resumen

| Qué quieres | Dónde se cambia |
|-------------|------------------|
| CRUD en la base | Servidor MCP (otro paquete o variable de entorno del servidor), **no** Cursor |
| Permisos del agente en Cursor | `--access-mode=unrestricted` (archivos, terminal, etc.) |

Para tener acceso CRUD al Postgres de realstate, el paso necesario es usar un servidor MCP que permita escritura (opción 1 u otra similar) o activar la opción de escritura del que ya usas (opción 2).
