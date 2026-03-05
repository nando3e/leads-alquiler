const N8N_ALERT_URL = process.env.N8N_ALERT_WEBHOOK_URL;
const N8N_FORM_URL = process.env.WEBHOOK_FORMULARIO_ENVIADO;

export async function notifyN8nAlert(lead, requirementName) {
  if (!N8N_ALERT_URL) return;

  const payload = {
    event: 'lead_alert',
    requirement_name: requirementName,
    lead: { ...lead },
    at: new Date().toISOString(),
  };

  const res = await fetch(N8N_ALERT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    console.error('n8n alert webhook failed', res.status, await res.text());
  }
}

/** Solo se llama cuando es la primera vez del lead (INSERT), no en UPDATE. */
export async function notifyFormularioEnviado(lead) {
  if (!N8N_FORM_URL) return;

  const payload = {
    event: 'formulario_enviado',
    first_time: true,
    lead: { ...lead },
    at: new Date().toISOString(),
  };

  const res = await fetch(N8N_FORM_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    console.error('webhook formulario enviado failed', res.status, await res.text());
  }
}
