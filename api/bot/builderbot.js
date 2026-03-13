const BASE = 'https://app.builderbot.cloud/api/v2';
const PROJECT = process.env.BUILDERBOT_PROJECT || '';
const TOKEN = process.env.BUILDERBOT_TOKEN || '';

export async function notifyAgent(phone, content) {
  if (!PROJECT || !TOKEN) return;
  const url = `${BASE}/${PROJECT}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-builderbot': TOKEN,
    },
    body: JSON.stringify({
      messages: { content },
      number: String(phone).replace(/\D/g, ''),
      checkIfExists: false,
    }),
  });
  if (!res.ok) {
    console.error('builderbot notify', res.status, await res.text());
  }
}
