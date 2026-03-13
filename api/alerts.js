import { query } from './db.js';

function parseNum(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function leadMatchesCriteria(lead, criteria) {
  if (!criteria || typeof criteria !== 'object') return false;

  const preuMin = parseNum(criteria.preu_min);
  const preuMax = parseNum(criteria.preu_max);
  if (preuMin != null && (lead.preu_max_mensual == null || lead.preu_max_mensual < preuMin)) return false;
  if (preuMax != null && (lead.preu_max_mensual == null || lead.preu_max_mensual > preuMax)) return false;

  if (Array.isArray(criteria.zones) && criteria.zones.length > 0) {
    const zona = (lead.zona || '').trim();
    if (!zona || !criteria.zones.includes(zona)) return false;
  }

  if (criteria.mascotes === false && lead.mascotes === 'si') return false;
  if (criteria.mascotes === true && lead.mascotes !== 'si') return false;

  if (criteria.moblat === true && lead.moblat !== 'si') return false;
  if (criteria.moblat === false && lead.moblat === 'si') return false;

  const quantaMax = parseNum(criteria.quanta_gent_max);
  if (quantaMax != null && lead.quanta_gent_viura != null) {
    const n = parseInt(lead.quanta_gent_viura, 10);
    if (!Number.isNaN(n) && n > quantaMax) return false;
  }

  if (Array.isArray(criteria.situacio_laboral) && criteria.situacio_laboral.length > 0) {
    const sl = (lead.situacio_laboral || '').trim();
    if (!sl || !criteria.situacio_laboral.includes(sl)) return false;
  }
  if (criteria.intencio_contacte != null && criteria.intencio_contacte !== '') {
    const ic = (lead.intencio_contacte || '').trim();
    if (ic !== criteria.intencio_contacte) return false;
  }

  if (criteria.tipus_immoble != null && criteria.tipus_immoble !== '') {
    const t = (lead.tipus_immoble || '').trim();
    if (criteria.tipus_immoble !== 'no_importa' && t !== criteria.tipus_immoble) return false;
  }

  if (criteria.habitacions_min != null && criteria.habitacions_min !== '' && criteria.habitacions_min !== 'no_importa') {
    const h = lead.habitacions_min;
    if (h == null || h === '' || h === 'no_importa') return false;
    const order = ['1', '2', '3', '4', '5_mes'];
    const idxLead = order.indexOf(h);
    const idxCrit = order.indexOf(criteria.habitacions_min);
    if (idxLead === -1 || idxCrit === -1 || idxLead < idxCrit) return false;
  }

  if (criteria.banys_min != null && criteria.banys_min !== '' && criteria.banys_min !== 'no_importa') {
    const b = lead.banys_min;
    if (b == null || b === '' || b === 'no_importa') return false;
    const order = ['1', '2', '3_mes'];
    const idxLead = order.indexOf(b);
    const idxCrit = order.indexOf(criteria.banys_min);
    if (idxLead === -1 || idxCrit === -1 || idxLead < idxCrit) return false;
  }

  if (criteria.parking != null && criteria.parking !== '' && criteria.parking !== 'no_importa') {
    const p = (lead.parking || '').trim();
    if (p !== criteria.parking) return false;
  }
  if (criteria.ascensor != null && criteria.ascensor !== '' && criteria.ascensor !== 'no_importa') {
    const a = (lead.ascensor || '').trim();
    if (a !== criteria.ascensor) return false;
  }
  if (criteria.calefaccio != null && criteria.calefaccio !== '' && criteria.calefaccio !== 'no_importa') {
    const c = (lead.calefaccio || '').trim();
    if (c !== criteria.calefaccio) return false;
  }

  const edatMin = parseNum(criteria.edat_min);
  const edatMax = parseNum(criteria.edat_max);
  if (edatMin != null && (lead.edat == null || lead.edat < edatMin)) return false;
  if (edatMax != null && (lead.edat == null || lead.edat > edatMax)) return false;

  const menorsMax = parseNum(criteria.menors_max);
  if (menorsMax != null && lead.menors != null && lead.menors > menorsMax) return false;

  if (Array.isArray(criteria.origen) && criteria.origen.length > 0) {
    const o = (lead.origen || '').trim();
    if (!o || !criteria.origen.includes(o)) return false;
  }

  if (Array.isArray(criteria.temps_ultima_empresa) && criteria.temps_ultima_empresa.length > 0) {
    const t = (lead.temps_ultima_empresa || '').trim();
    if (!t || !criteria.temps_ultima_empresa.includes(t)) return false;
  }
  if (criteria.empresa_espanyola != null && criteria.empresa_espanyola !== '') {
    const e = (lead.empresa_espanyola || '').trim();
    if (e !== criteria.empresa_espanyola) return false;
  }
  if (criteria.tipus_contracte != null && criteria.tipus_contracte !== '') {
    const c = (lead.tipus_contracte || '').trim();
    if (c !== criteria.tipus_contracte) return false;
  }
  if (Array.isArray(criteria.ingressos_netos_mensuals) && criteria.ingressos_netos_mensuals.length > 0) {
    const i = (lead.ingressos_netos_mensuals || '').trim();
    if (!i || !criteria.ingressos_netos_mensuals.includes(i)) return false;
  }

  return true;
}

export async function getActiveAlertRequirements() {
  const res = await query(
    'SELECT id, name, criteria, notify_whatsapp, notify_email, admin_phone, admin_email FROM alert_requirements WHERE active = true'
  );
  return res.rows;
}

export async function wasAlertAlreadySent(leadId, requirementId) {
  const res = await query(
    'SELECT 1 FROM alert_sent WHERE lead_id = $1 AND alert_requirement_id = $2',
    [leadId, requirementId]
  );
  return res.rows.length > 0;
}

export async function recordAlertSent(leadId, requirementId, payloadSnapshot = null) {
  await query(
    'INSERT INTO alert_sent (lead_id, alert_requirement_id, payload_snapshot) VALUES ($1, $2, $3)',
    [leadId, requirementId, payloadSnapshot ? JSON.stringify(payloadSnapshot) : null]
  );
}

export async function updateLeadAlertSentAt(leadId) {
  await query(
    "UPDATE leads SET alert_sent_at = now(), estat = 'alerta_enviada', updated_at = now() WHERE id = $1",
    [leadId]
  );
}
