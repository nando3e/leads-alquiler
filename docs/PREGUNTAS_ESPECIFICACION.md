# Preguntas de especificación — Leads alquiler

Respuesta preferida: **Sí / No** o **Opción A / B / C**. Así el CTO puede pasar las respuestas al equipo como requisitos claros.

---

## 1. Autenticación y roles

| # | Pregunta | Respuesta (Sí/No o A/B) |
|---|----------|--------------------------|
| 1.1 | ¿Hay login para la aplicación (panel de la agencia)? |s |
| 1.2 | ¿Solo existe el rol "super admin" (hardcodeado por env) o habrá más roles (ej. agente, ver solo leads)? | Solo super admin / Varios roles: ___varios__ |
| 1.3 | ¿El super admin se identifica por email, por usuario, o por otro campo? | Email / Usuario / Otro: usuario_____ |
| 1.4 | ¿Contraseña: solo contraseña, o también 2FA / magic link? | Solo contraseña / 2FA / Magic link / Otro: __contraseña___ |
| 1.5 | ¿El formulario público (el que rellena el lead) lleva login o es siempre anónimo/público? | Público sin login / Con login | publico sin login. 

---

## 2. Super admin y entorno

| # | Pregunta | Respuesta (Sí/No o A/B) |
|---|----------|--------------------------|
| 2.1 | ¿Super admin: un solo usuario fijo (ej. `SUPER_ADMIN_EMAIL` en .env) o lista de emails? | Un solo usuario / Lista de emails |un solo usuario
| 2.2 | ¿El primer super admin se crea con seed/migración o se registra manualmente la primera vez? | Seed/migración / Registro manual | hardcoded en env
| 2.3 | ¿Hay distintos entornos (dev, staging, prod) con distintos .env? | Sí / No, solo uno | solo uno

---

## 3. Panel de la agencia (después del login)

| # | Pregunta | Respuesta (Sí/No o A/B) |
|---|----------|--------------------------|
| 3.1 | ¿El panel debe existir en el MVP o se deja para después? | MVP / Después |mvp
| 3.2 | Si existe en MVP: ¿qué debe poder hacer el super admin? (marcar lo que aplique) | Ver listado de leads / si, Configurar requisitos de alerta ,si/ Ver logs/alertas enviadas, si / Editar/borrar leads, si / Otro: filtros por valores de los campos_____ |
| 3.3 | ¿Listado de leads: paginado o "ver todos"? | Paginado / Ver todos / Ambos |ambos
| 3.4 | ¿Se pueden exportar leads (CSV/Excel)? | Sí / No | si
| 3.5 | ¿Filtros en el listado (por fecha, zona, estado, etc.)? | Sí / No |si
| 3.6 | ¿Búsqueda por nombre/teléfono/email? | Sí / No |si

---

## 4. Requisitos de alerta (configurables)

| # | Pregunta | Respuesta (Sí/No o A/B) |
|---|----------|--------------------------|
| 4.1 | ¿Quién configura los requisitos en el MVP? | Solo super admin / Varios roles | varios
| 4.2 | ¿Dónde se configuran? | Panel web (React) / Archivo .env / n8n / Otro: _____ | panel web
| 4.3 | ¿Qué criterios deben ser configurables? (marcar los que apliquen) | Presupuesto min/max / Zonas / Mascotas sí/no / Nº personas / Moblat sí/no / Situación laboral / Otros: _____ | todos esos de momento
| 4.4 | ¿Puede haber varios "conjuntos" de requisitos (ej. perfil A y perfil B) o solo uno? | Solo uno / Varios conjuntos | varios
| 4.5 | ¿URL del webhook de n8n para alertas: configurable en panel o fija en .env? | Panel / .env | en env.

---

## 5. Formulario (lead)

| # | Pregunta | Respuesta (Sí/No o A/B) |
|---|----------|--------------------------|
| 5.1 | ¿Idiomas del formulario en MVP? | ES, CA, EN, FR / Solo ES y CA / Otros: __es, ca, __ |
| 5.2 | ¿Idioma por defecto si no hay `lang` en la URL? | ES / CA / Detectar navegador / Preguntar | ca
| 5.3 | ¿Campos obligatorios: todos los de la ficha o solo un subconjunto? | Todos los de la ficha / Subconjunto (indicar cuáles): _____datos a recoger sólo alquiler
nom
cognoms
dni/nie
mobil
casa / pis / indiferent
preu màxim mensual
moblat? Si/no/ indiferent
habitacions mínimes? numero o indiferent
banys minims?
parking must have? si no indif
ascensor must have? si no indif
calefacció must have? si no indif
altres must have? Terrassa, 
zona: Olot, sant joan les fonts, rodalies, altres:

revista: la comarca, viu, reclam

estalvis? 
Situació laboral actual? trabajando temporal, trabajando fijo
sector o profesión 
Edat?
Mascotes? Si no
cuanta gent viurà?
menors?
 | 
| 5.4 | ¿Guardar borradores (lead que no ha enviado) o solo cuando envía? | Solo al enviar / También borradores |
| 5.5 | ¿Un mismo teléfono/email puede enviar varias veces (varios leads) o se actualiza el existente? | Varios leads / Actualizar el mismo lead |
| 5.6 | ¿Después de enviar: solo "Gracias" + botón WhatsApp, o también email de confirmación al lead? | Solo gracias + WhatsApp / También email al lead |
| 5.7 | ¿URL del formulario: una base fija (ej. `/form`) y el resto por query (`?lang=es&zona=...`)? | Sí / No, prefiero: _____ |

---

## 6. WhatsApp y n8n 

| # | Pregunta | Respuesta (Sí/No o A/B) |
|---|----------|--------------------------|
| 6.1 | ¿Quién proporciona la API de WhatsApp (Twilio, WhatsApp Business API, otro)? | Twilio / WhatsApp Business API / Otro: __yo me encargo en n8n. builderbot___ |
| 6.2 | ¿El número de WhatsApp de "Volver a WhatsApp" es fijo (uno por entorno) o configurable? | Fijo en .env / Configurable en panel | configurable en el panel
| 6.3 | ¿Estado de conversación (por teléfono): lo guarda n8n (su DB) o debe guardarse en nuestra DB? | n8n / Nuestra DB / No importa | lo guardo en una base de datos chat_memory. lo gestiono con n8n,.
| 6.4 | ¿Cuando n8n envía el link al formulario: el link lo genera nuestro backend (Node) o n8n monta la URL completa? | Nuestro backend / n8n | backend
| 6.5 | ¿Tras completar el formulario: el backend Node notifica a n8n (ej. "lead X completado") o no hace falta? | Sí notificar / No hace falta | sí, estaria bien, mandando a webhook 

---

## 7. Base de datos

| # | Pregunta | Respuesta (Sí/No o A/B) |
|---|----------|--------------------------|
| 7.1 | ¿Motor de DB? | PostgreSQL / MySQL / SQLite (solo dev) / Otro: _____ postgres|
| 7.2 | ¿Acceso a la DB: solo nuestro backend Node, o también n8n (para leer/escribir leads)? | Solo Node / También n8n / Ambos | ambos
| 7.3 | ¿Migraciones: sí (ej. TypeORM, Prisma, Knex) o scripts SQL a mano? | Migraciones / Scripts SQL | no lo tengo claro. 
| 7.4 | ¿Datos sensibles (DNI, teléfono): hay que enmascarar en logs y en panel? | Sí / No | no
| 7.5 | ¿Retención de datos: borrar leads antiguos tras X tiempo o conservar todo? | Conservar todo / Borrar tras: _____ |conservar de momento. sihay que borrar ya lo haré con crons des de n8n

---

## 8. Despliegue y entorno técnico

| # | Pregunta | Respuesta (Sí/No o A/B) |
|---|----------|--------------------------|
| 8.1 | ¿Dónde se desplegará (MVP)? | VPS / Railway / Render / Vercel + backend aparte / Otro: _____ | vps dockerizado desde railway, en dokploy con compose
| 8.2 | ¿Frontend y backend en el mismo repo o repos separados? | Mismo repo (monorepo) / Repos separados | junto
| 8.3 | ¿Versión de Node? | 20 LTS / 22 / Otra: _____ |
| 8.4 | ¿TypeScript en backend y frontend? | Sí / Solo backend / Solo frontend / No | puede ser javascript? o tiene qu ser ts?
| 8.5 | ¿HTTPS obligatorio en producción? | Sí / No | pensaba adjudicar el certificado desde dokploy ocn traefik
| 8.6 | ¿Dominio y URL del formulario ya definidos? | Sí: _____ / No | no

---

## 9. Marca y copy

| # | Pregunta | Respuesta (Sí/No o A/B) |
|---|----------|--------------------------|
| 9.1 | ¿Nombre de la inmobiliaria / producto para títulos y mensajes? | _____ | Gestoria Agil, en .env
| 9.2 | ¿Logo o solo texto en el formulario y en el panel? | Logo + texto / Solo texto | logo y texto.
| 9.3 | ¿Textos del formulario y mensajes WhatsApp los aporta el cliente o los redactamos nosotros? | Cliente / Nosotros / Reparto: _____ | cliente
| 9.4 | ¿Política de privacidad / aviso legal: enlace en el formulario obligatorio? | Sí / No | no

---

## 10. Alertas y webhook n8n

| # | Pregunta | Respuesta (Sí/No o A/B) |
|---|----------|--------------------------|
| 10.1 | ¿Payload al webhook: enviar todo el lead (todos los campos) o solo un subconjunto? | Todo el lead / Subconjunto: _____ | todo
| 10.2 | ¿Formato del payload? | JSON / Otro: _____ |json
| 10.3 | ¿Autenticación del webhook (n8n recibe solo si lleva header/token)? | Sí / No | no
| 10.4 | ¿Guardar en nuestro sistema que "ya se envió alerta" para no duplicar? | Sí / No | si

---

## 11. Edge cases y límites

| # | Pregunta | Respuesta (Sí/No o A/B) |
|---|----------|--------------------------|
| 11.1 | ¿Límite de envíos del formulario por IP o por teléfono (anti-spam)? | Sí: _____ / No | si. configurable.
| 11.2 | ¿Si el lead ya existía (mismo teléfono): actualizar y volver a evaluar alerta o no re-enviar alerta? | reenviar si cambian los campos relevantes para la alerta
Actualizar y re-evaluar / Actualizar sin re-enviar / No actualizar |
| 11.3 | ¿Mensajes de error del formulario: en el idioma del usuario o siempre en uno? | Mismo idioma del formulario / Siempre ES (o otro): _____ | mismo idioma 
| 11.4 | ¿Hay requisitos legales (GDPR, consentimiento explícito para guardar datos)? | Sí / No / No seguro | debe haber una nota informativa.

---

## Cómo usar este documento

1. Rellena cada celda "Respuesta" con Sí/No o la opción que corresponda.
2. Donde ponga "_____", escribe lo que aplique.
3. El CTO puede copiar las respuestas a un **documento de requisitos** o a tickets para el equipo.
4. Si algo no lo tienes decidido, pon "TBD" y se cierra después.

Cuando lo tengas rellenado (o por bloques), se puede bajar a **especificación técnica** (modelo de datos, endpoints, flujos de n8n) paso a paso.
