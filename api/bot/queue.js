/**
 * Cola in-memory por teléfono: agrupa mensajes que llegan seguidos
 * y procesa una sola vez tras message_debounce_ms.
 */

const pending = new Map();

export function enqueue(phone, payload, delayMs, processFn) {
  if (pending.has(phone)) {
    clearTimeout(pending.get(phone).timer);
    pending.get(phone).payloads.push(payload);
  } else {
    pending.set(phone, { payloads: [payload] });
  }

  const entry = pending.get(phone);
  entry.timer = setTimeout(() => {
    pending.delete(phone);
    processFn(phone, entry.payloads).catch((err) => {
      console.error('bot queue process', phone, err);
    });
  }, delayMs);
}
