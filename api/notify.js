/**
 * Notificaciones al administrador cuando se dispara una alerta de lead.
 * - WhatsApp: vía BuilderBot (mismo módulo que usa el bot)
 * - Email: vía SMTP con nodemailer
 */

import { notifyAgent as sendBuilderBot } from './builderbot.js';

function buildAlertMessage(lead, requirementName) {
  const lines = [
    `🔔 *Alerta: ${requirementName}*`,
    `Nou lead: ${lead.nom || ''} ${lead.cognoms || ''}`.trim(),
    lead.mobil ? `📱 ${lead.mobil}` : null,
    lead.zona ? `📍 Zona: ${lead.zona}` : null,
    lead.preu_max_mensual ? `💰 Preu màx: ${lead.preu_max_mensual} €` : null,
    lead.situacio_laboral ? `💼 ${lead.situacio_laboral}` : null,
  ].filter(Boolean);
  return lines.join('\n');
}

export async function notifyAdminWhatsApp(adminPhone, lead, requirementName) {
  if (!adminPhone) return;
  try {
    const msg = buildAlertMessage(lead, requirementName);
    await sendBuilderBot(adminPhone, msg);
  } catch (err) {
    console.error('notifyAdminWhatsApp', err);
  }
}

export async function notifyAdminEmail(adminEmail, lead, requirementName) {
  if (!adminEmail) return;

  const SMTP_HOST = process.env.SMTP_HOST;
  const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
  const SMTP_USER = process.env.SMTP_USER;
  const SMTP_PASS = process.env.SMTP_PASS;
  const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn('notifyAdminEmail: SMTP not configured (SMTP_HOST, SMTP_USER, SMTP_PASS)');
    return;
  }

  // Importación dinámica para no romper si nodemailer no está instalado
  let nodemailer;
  try {
    nodemailer = (await import('nodemailer')).default;
  } catch {
    console.warn('notifyAdminEmail: nodemailer not installed. Run: npm install nodemailer');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  const subject = `🔔 Alerta: ${requirementName} — nou lead ${lead.nom || ''} ${lead.cognoms || ''}`.trim();
  const html = `
    <h2>Alerta de lead: ${requirementName}</h2>
    <table cellpadding="6" style="border-collapse:collapse">
      <tr><td><b>Nom</b></td><td>${lead.nom || ''} ${lead.cognoms || ''}</td></tr>
      <tr><td><b>Mòbil</b></td><td>${lead.mobil || '-'}</td></tr>
      <tr><td><b>Zona</b></td><td>${lead.zona || '-'}</td></tr>
      <tr><td><b>Preu màx</b></td><td>${lead.preu_max_mensual ? lead.preu_max_mensual + ' €' : '-'}</td></tr>
      <tr><td><b>Tipus immoble</b></td><td>${lead.tipus_immoble || '-'}</td></tr>
      <tr><td><b>Situació laboral</b></td><td>${lead.situacio_laboral || '-'}</td></tr>
      <tr><td><b>Idioma</b></td><td>${lead.lang || '-'}</td></tr>
    </table>
  `;

  try {
    await transporter.sendMail({
      from: SMTP_FROM,
      to: adminEmail,
      subject,
      html,
    });
  } catch (err) {
    console.error('notifyAdminEmail SMTP error', err);
  }
}
