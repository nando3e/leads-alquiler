import 'dotenv/config';
import { runMigrations } from './migrate.js';
import express from 'express';
import cors from 'cors';
import { query } from './db.js';
import { authMiddleware } from './auth.js';
import * as leads from './routes/leads.js';
import * as auth from './routes/auth.js';
import * as alertRequirements from './routes/alert-requirements.js';
import * as panelConfig from './routes/panel-config.js';
import * as alertSent from './routes/alert-sent.js';
import * as dashboard from './routes/dashboard.js';
import * as chatwoot from './routes/chatwoot.js';
import * as agentConfigs from './routes/agent-configs.js';
import * as chat from './routes/chat.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || true, credentials: true }));
app.use(express.json());

app.get('/api/health', (_, res) => res.json({ ok: true }));

app.post('/api/auth/login', auth.postLogin);

app.post('/api/leads', leads.postLead);

app.post('/api/chatwoot/webhook', chatwoot.webhook);

app.get('/api/form-config', async (_, res) => {
  try {
    const r = await query('SELECT key, value FROM panel_config WHERE key = $1', ['whatsapp_return_number']);
    const fromDb = r.rows[0]?.value?.trim() || '';
    const fromEnv = (process.env.WHATSAPP_RETURN_NUMBER || '').trim();
    const whatsapp_return_number = fromDb || fromEnv;
    return res.json({ whatsapp_return_number });
  } catch (e) {
    const fromEnv = (process.env.WHATSAPP_RETURN_NUMBER || '').trim();
    return res.json({ whatsapp_return_number: fromEnv });
  }
});

app.get('/api/dashboard/stats', authMiddleware, dashboard.getStats);

app.get('/api/panel-config', authMiddleware, panelConfig.getAll);
app.put('/api/panel-config', authMiddleware, panelConfig.set);

app.get('/api/leads', authMiddleware, leads.getLeads);
app.get('/api/leads/export', authMiddleware, leads.exportCsv);
app.get('/api/leads/:id', authMiddleware, leads.getLeadById);
app.patch('/api/leads/:id', authMiddleware, leads.patchLead);
app.delete('/api/leads/:id', authMiddleware, leads.deleteLead);

app.get('/api/alert-requirements', authMiddleware, alertRequirements.list);
app.get('/api/alert-requirements/:id', authMiddleware, alertRequirements.getOne);
app.post('/api/alert-requirements', authMiddleware, alertRequirements.create);
app.put('/api/alert-requirements/:id', authMiddleware, alertRequirements.update);
app.delete('/api/alert-requirements/:id', authMiddleware, alertRequirements.remove);

app.get('/api/alert-sent', authMiddleware, alertSent.list);

app.get('/api/agent-configs', authMiddleware, agentConfigs.list);
app.get('/api/agent-configs/:id', authMiddleware, agentConfigs.getOne);
app.put('/api/agent-configs/:id', authMiddleware, agentConfigs.update);

app.post('/api/chat/message', authMiddleware, chat.postMessage);
app.get('/api/chat/:session_id', authMiddleware, chat.getSessionState);
app.delete('/api/chat/:session_id', authMiddleware, chat.deleteSession);

runMigrations()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`API http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('[migrate] Fatal error, server not started:', err);
    process.exit(1);
  });
