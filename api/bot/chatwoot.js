const BASE = (process.env.CHATWOOT_URL || '').replace(/\/$/, '');
const TOKEN = process.env.CHATWOOT_TOKEN || '';

async function request(path, method = 'GET', body = null) {
  const url = `${BASE}${path}`;
  const opts = {
    method,
    headers: {
      api_access_token: TOKEN,
      'Content-Type': 'application/json',
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  if (!res.ok) {
    const text = await res.text();
    console.error('chatwoot', method, path, res.status, text);
    throw new Error(`Chatwoot ${res.status}`);
  }
  return res.json().catch(() => ({}));
}

export async function sendMessage(accountId, conversationId, content) {
  if (!BASE || !TOKEN) return;
  const text = (content || '').replace(/\*\*/g, '*');
  await request(
    `/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`,
    'POST',
    { content: text, message_type: 'outgoing', private: false }
  );
}

export async function setContactBot(accountId, contactId, bot = true) {
  if (!BASE || !TOKEN) return;
  await request(`/api/v1/accounts/${accountId}/contacts/${contactId}`, 'PATCH', {
    custom_attributes: { bot },
  });
}
