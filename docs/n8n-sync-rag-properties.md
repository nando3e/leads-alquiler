# Sync RAG de propiedades (PostgreSQL → Qdrant)

El panel dispara **`POST /api/properties/sync-rag`**. La **API Node.js** hace todo el proceso: lee propiedades activas, genera Markdown, parte el texto con el mismo tipo de splitter que en LangChain (`RecursiveCharacterTextSplitter`, separadores orientados a Markdown), pide embeddings a **Gemini** y escribe en **Qdrant**. **No hace falta n8n** para este flujo.

Código principal: [`api/lib/qdrantSync.js`](../api/lib/qdrantSync.js) y plantilla Markdown en [`api/lib/propertyMarkdown.js`](../api/lib/propertyMarkdown.js).

## Variables de entorno (API)

| Variable | Descripción |
|----------|-------------|
| `QDRANT_URL` | URL base del servidor Qdrant (ej. `https://xxx:6333`) |
| `QDRANT_API_KEY` | Opcional si Qdrant no exige API key |
| `QDRANT_COLLECTION` | Nombre de la colección (ej. `chatbot`) |
| `GEMINI_API_KEY` | Clave de Google AI Studio / Gemini |
| `RAG_CHUNK_SIZE` | Tamaño de chunk (por defecto `400`) |
| `RAG_CHUNK_OVERLAP` | Solapamiento (por defecto `100`) |
| `RAG_EMBEDDING_MODEL` | Modelo de embeddings (por defecto `text-embedding-004`) |

Tras un sync correcto, la API guarda en `panel_config` `qdrant_sync_status=synced` y `qdrant_last_sync_at`. Si falla, `qdrant_sync_status=error` (el panel lo muestra como pendiente de actualizar).

## Relación con n8n `carga_rag`

Si sigues cargando documentos desde **Drive u otra fuente** con el workflow **`carga_rag`**, usa la **misma colección** y los **mismos parámetros** de chunk y modelo que en `.env` para no mezclar dimensiones de vector distintas. Si cambias de modelo de embedding, conviene vaciar la colección o recrearla.
