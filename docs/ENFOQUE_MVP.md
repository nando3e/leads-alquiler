# Enfoque MVP — Leads alquiler (WhatsApp + n8n + formulario)

## Objetivo
Registrar candidatos que buscan piso de alquiler con datos estructurados, sin que la inmobiliaria tenga que repetir las mismas preguntas. **Todos** se registran; la agencia luego filtra y monta alertas. MVP = simple, sin scoring ni alertas automáticas en esta fase.

---

## Arquitectura (simple)

```
WhatsApp  <--->  API (tu backend o proveedor)  <--->  n8n
                                                        |
                                                        v
                                                   Base de datos
                                                        ^
Formulario web (React, enlace desde WhatsApp)  -------+
     (envío → Backend Node → DB + si cumple requisitos → webhook n8n)
```

- **n8n**: recibe mensajes (webhook), guarda estado de conversación, hace comprobaciones/inserts en tablas, devuelve la respuesta a WhatsApp.
- **WhatsApp**: solo entrada/salida de mensajes; la lógica vive en n8n.
- **Formulario**: enlace que n8n envía; recogida masiva de campos; al enviar, guardar (vía n8n o directo DB) y mostrar “Gracias” + botón “Volver a WhatsApp”.
- **Base de datos**: una tabla (o muy pocas) para leads con todos los campos de la ficha de lloguer.

---

## Flujo del MVP

### 1. Entrada por WhatsApp (todo en n8n)
1. **Saludo** (mensaje fijo).
2. **Idioma**: detectar por primer mensaje o preguntar con botones (ES / CA / EN / FR). Guardar en estado.
3. **4–5 preguntas cortas** (mensajes plantilla en el idioma elegido):
   - Zona deseada (ej. Olot, Sant Joan, Rodalies, Altres).
   - Preu màxim (número).
   - Quantes persones viuen / vivirán.
   - Moblat: Sí / No.
   - Mascotes: Sí / No.
4. **Envío del enlace al formulario**: mismo formulario con `?lang=es|ca|en|fr` (y opcionalmente zona, preu, persones, moblat, mascotes para precargar). Mensaje tipo: “Completa tus datos aquí: [link]. Al terminar puedes volver por WhatsApp.”

No hay pre-filtro que corte la conversación: todo el que llega recibe el link y puede completar.

### 2. Formulario web
- **Una sola página** (o pocas secciones), campos según la ficha de lloguer (solo alquiler, sin obra nova ni compra).
- **Idioma**: según `lang` en la URL; etiquetas y mensajes en ES/CA/EN/FR.
- **Al enviar**:  
  - Envío de datos a n8n (webhook) o inserción en DB (y n8n solo si quieres notificar).  
  - Pantalla de confirmación + botón “Volver a WhatsApp” (enlace `wa.me/...?text=He completado el formulario`).

### 3. Base de datos
- **Una tabla `leads`** (o `leads_alquiler`) con columnas para:
  - Datos de contacto: nom, cognoms, DNI/NIE, mòbil, fix, mail, disponibilitat/horari.
  - Búsqueda: tipus (pis/casa/etc.), preu màxim, moblat, habitacions, banys, pàrquing, ascensor, calefacció, altres, zona.
  - Perfil: situació laboral, edat, mascotes, observacions, quantes persones.
  - Metadatos: idioma, teléfono WhatsApp, fecha, estado (ej. `formulario_pendiente` / `completado`).
- n8n hace **INSERT** cuando:
  - Se responden las preguntas iniciales (lead “parcial”) y/o cuando llega el webhook del formulario (actualizar o insertar completo).

---

## Alerta sencilla (configurable por la agencia)

- **Sin matching con propiedades**: no se cruza el lead con un catálogo de pisos.
- La agencia define **requisitos** (ej.: presupuesto mínimo/máximo, zonas, sin mascotas, número de personas, etc.).
- Cuando un lead se guarda (formulario completado o datos mínimos), se **evalúa** si cumple esos requisitos.
- **Si cumple** → se envía la info del lead a un **webhook de n8n** (POST con payload del lead). Desde n8n tú decides qué hacer: Telegram, email, otra herramienta, etc.
- Los requisitos se guardan en configuración (DB o panel) y son editables por la agencia, sin tocar código.

---

## Stack: Node + React (recomendado para el MVP)

- **React**: formulario multiidioma para el lead + (opcional) mini panel para la agencia (ver leads, configurar requisitos de alerta).
- **Node** (Express o Fastify): API que recibe el submit del formulario, guarda en DB, lee los requisitos configurados, evalúa si el lead cumple y, si sí, hace POST al webhook de n8n con los datos del lead.
- **Un solo lenguaje** (JavaScript/TypeScript) en backend y frontend; despliegue simple; suficiente para reglas del tipo “presupuesto entre X y Y”, “zona en [Olot, …]”, “mascotas = no”, etc.
- **Python** no hace falta para este MVP: las reglas son comparaciones y listas; Node las resuelve bien. Reservaría Python si más adelante hubiera lógica pesada de datos o ML.

---

## Campos (según ficha Fitxes d'Immo — solo LLOGUER)

| Grupo        | Campo              | Tipo / Notas                    |
|-------------|--------------------|----------------------------------|
| Contacto    | Nom                | Texto                            |
| Contacto    | Cognoms            | Texto                            |
| Contacto    | DNI/NIE            | Texto                            |
| Contacto    | Mòbil              | Texto                            |
| Contacto    | Fix                | Texto (opcional)                 |
| Contacto    | Disponibilitat     | Texto libre (horario)            |
| Contacto    | Mail               | Email                            |
| Búsqueda    | Preu màxim         | Número                           |
| Búsqueda    | Moblat             | Sí / No                          |
| Búsqueda    | Habitacions        | Número                           |
| Búsqueda    | Banys              | Número                           |
| Búsqueda    | Pàrquing           | Sí / No (o N/A)                  |
| Búsqueda    | Ascensor           | Sí / No (o N/A)                  |
| Búsqueda    | Calefacció         | Sí / No (o N/A)                  |
| Búsqueda    | Altres             | Texto libre                      |
| Búsqueda    | Zona               | Olot, Sant Joan, Rodalies, Altres |
| Perfil      | Situació laboral   | Texto libre                      |
| Perfil      | Edat               | Número o rango                   |
| Perfil      | Mascotes           | Sí / No                          |
| Perfil      | Observacions       | Texto libre                      |
| (extra MVP) | Persones que viuen | Número (pregunta WhatsApp)       |

Los campos “Portal” y “Revista” de la ficha son internos; no los pide el lead en el MVP.

---

## Responsabilidades técnicas (MVP)

| Componente   | Responsabilidad MVP |
|-------------|----------------------|
| **n8n**     | Webhook entrante desde API WhatsApp; estado de conversación (por teléfono o ID); mensajes de salida hacia WhatsApp; validaciones básicas; INSERT/UPDATE en tabla de leads. |
| **API WhatsApp** | Recibir mensajes y pasarlos a n8n; enviar las respuestas que n8n devuelve. |
| **Formulario** | Página web responsive (React), multiidioma por `lang`; envío por POST al backend Node; confirmación + “Volver a WhatsApp”. |
| **Backend Node** | Recibe submit del formulario; guarda en DB; lee requisitos de alerta; si el lead cumple → POST al webhook de n8n. |
| **DB**      | Tabla de leads; tabla o config de requisitos de alerta (configurables por la agencia). |

---

## Qué NO hacemos en el MVP
- Scoring ni puntuación automática.
- Matching con inmuebles (la alerta es solo “cumple requisitos” → webhook n8n).
- Múltiples formularios por idioma (solo uno con `lang`).
- IA para interpretar respuestas (solo mensajes y botones fijos; si hace falta, se añade después).
- Campos de compra, obra nova ni portales/revistas para el lead.

---

## Orden sugerido para implementar (cuando confirmes)

1. **DB**: tabla `leads` + tabla o config de **requisitos de alerta** (configurables).
2. **Backend Node**: API que recibe el submit del formulario, guarda lead, evalúa requisitos y, si cumple, POST al webhook de n8n.
3. **n8n**: flujo WhatsApp (webhook → saludo → idioma → 4–5 preguntas → guardar en DB → enviar enlace al formulario); y workflow que reciba el webhook de “alerta” y haga lo que quieras (Telegram, email, etc.).
4. **Formulario React**: página única, multiidioma por `lang`, POST al backend Node; confirmación + “Volver a WhatsApp”.
5. **Integración**: API WhatsApp ↔ n8n; probar flujo completo y alerta al webhook.

Cuando confirmes que este enfoque te encaja (idiomas, número de preguntas por WhatsApp y campos del form), pasamos al **Paso 1 concreto**: diseño de la tabla y, si quieres, el flujo de n8n paso a paso sin código aún, o con el primer workflow.
