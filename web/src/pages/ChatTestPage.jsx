import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../lib/auth';

const ESTADO_COLORS = {
  new: 'bg-neutral-100 text-neutral-600',
  qualifying: 'bg-blue-100 text-blue-700',
  form_sent: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  compra_notified: 'bg-purple-100 text-purple-700',
  compra_no_ref: 'bg-orange-100 text-orange-700',
};

function randomId() {
  return `test_${Math.random().toString(36).slice(2, 8)}`;
}

function Badge({ label, className }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

export default function ChatTestPage() {
  const { api } = useAuth();
  const [sessionId, setSessionId] = useState(randomId);
  const [draftSession, setDraftSession] = useState('');
  const [editingSession, setEditingSession] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionState, setSessionState] = useState({ estado: 'new', intent: null, reference: null });
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Cargar historial al cambiar sesión
  useEffect(() => {
    api(`/api/chat/${sessionId}`)
      .then((r) => r.json())
      .then(({ session, history }) => {
        setSessionState(session || { estado: 'new', intent: null, reference: null });
        setMessages(
          (history || []).map((m) => ({ role: m.role, content: m.content }))
        );
      })
      .catch(() => {
        setSessionState({ estado: 'new', intent: null, reference: null });
        setMessages([]);
      });
  }, [sessionId, api]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(e) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setError(null);
    setMessages((m) => [...m, { role: 'human', content: text }]);
    setLoading(true);

    try {
      const res = await api('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, message: text }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al procesar el mensaje');
        setMessages((m) => m.slice(0, -1));
        return;
      }

      setSessionState({ estado: data.estado, intent: data.intent, reference: data.reference });
      if (data.reply) {
        setMessages((m) => [...m, { role: 'ai', content: data.reply }]);
      }
    } catch (err) {
      setError('Error de red: ' + err.message);
      setMessages((m) => m.slice(0, -1));
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  async function resetSession() {
    await api(`/api/chat/${sessionId}`, { method: 'DELETE' });
    setMessages([]);
    setSessionState({ estado: 'new', intent: null, reference: null });
    setError(null);
  }

  function newSession() {
    setSessionId(randomId());
    setMessages([]);
    setSessionState({ estado: 'new', intent: null, reference: null });
    setError(null);
  }

  function applyCustomSession() {
    const s = draftSession.trim();
    if (!s) return;
    setSessionId(s);
    setEditingSession(false);
    setDraftSession('');
  }

  const estadoColor = ESTADO_COLORS[sessionState?.estado] || 'bg-neutral-100 text-neutral-600';

  return (
    <div className="flex flex-col h-full" style={{ height: 'calc(100vh - 3rem)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Chat de prueba</h2>
          <p className="text-sm text-neutral-500">
            Simula el flujo del bot tal como lo vivirá el usuario en WhatsApp
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={resetSession}
            className="text-sm border border-neutral-200 rounded-lg px-3 py-1.5 text-neutral-600 hover:bg-neutral-50"
          >
            Reiniciar sesión
          </button>
          <button
            type="button"
            onClick={newSession}
            className="text-sm bg-neutral-900 text-white rounded-lg px-3 py-1.5 hover:bg-neutral-800"
          >
            Nueva sesión
          </button>
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Panel de chat */}
        <div className="flex flex-col flex-1 min-w-0 bg-white rounded-xl border border-neutral-200 overflow-hidden">
          {/* Barra de sesión */}
          <div className="px-4 py-2.5 border-b border-neutral-100 bg-neutral-50 flex items-center gap-2 shrink-0">
            <span className="text-xs text-neutral-500">Sesión:</span>
            {editingSession ? (
              <div className="flex items-center gap-1 flex-1">
                <input
                  type="text"
                  value={draftSession}
                  onChange={(e) => setDraftSession(e.target.value)}
                  placeholder="ej: 34612345678"
                  onKeyDown={(e) => e.key === 'Enter' && applyCustomSession()}
                  className="text-xs border border-neutral-300 rounded px-2 py-1 flex-1"
                  autoFocus
                />
                <button onClick={applyCustomSession} className="text-xs text-blue-600 hover:underline">OK</button>
                <button onClick={() => setEditingSession(false)} className="text-xs text-neutral-400 hover:underline">Cancel</button>
              </div>
            ) : (
              <>
                <code className="text-xs text-neutral-700 bg-neutral-100 px-1.5 py-0.5 rounded">{sessionId}</code>
                <button
                  onClick={() => { setDraftSession(sessionId); setEditingSession(true); }}
                  className="text-xs text-neutral-400 hover:text-neutral-600"
                >
                  editar
                </button>
              </>
            )}
          </div>

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-neutral-400 text-sm mt-8">
                Escribe el primer mensaje para iniciar la conversación
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'human' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-xs lg:max-w-sm xl:max-w-md px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === 'human'
                      ? 'bg-green-500 text-white rounded-br-sm'
                      : 'bg-neutral-100 text-neutral-900 rounded-bl-sm'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-neutral-100 text-neutral-500 px-4 py-2.5 rounded-2xl rounded-bl-sm text-sm">
                  <span className="animate-pulse">···</span>
                </div>
              </div>
            )}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2">
                {error}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form onSubmit={sendMessage} className="border-t border-neutral-100 p-3 flex gap-2 shrink-0">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe un mensaje…"
              disabled={loading}
              className="flex-1 rounded-full border border-neutral-300 px-4 py-2 text-sm focus:outline-none focus:border-neutral-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-full bg-green-500 text-white px-4 py-2 text-sm font-medium hover:bg-green-600 disabled:opacity-40"
            >
              Enviar
            </button>
          </form>
        </div>

        {/* Panel de estado */}
        <div className="w-64 shrink-0 flex flex-col gap-3">
          <div className="bg-white rounded-xl border border-neutral-200 p-4">
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">Estado de sesión</p>

            <div className="space-y-2.5">
              <div>
                <p className="text-xs text-neutral-500 mb-1">Estado</p>
                <Badge label={sessionState?.estado || 'new'} className={estadoColor} />
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-1">Intención</p>
                <Badge
                  label={sessionState?.intent || '—'}
                  className={
                    sessionState?.intent === 'alquiler'
                      ? 'bg-blue-100 text-blue-700'
                      : sessionState?.intent === 'compra'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-neutral-100 text-neutral-500'
                  }
                />
              </div>
            </div>
          </div>

          {sessionState?.reference && (
            <div className="bg-white rounded-xl border border-neutral-200 p-4">
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">Referencia extraída</p>
              <pre className="text-xs text-neutral-700 bg-neutral-50 rounded-lg p-2 overflow-auto max-h-48 whitespace-pre-wrap">
                {JSON.stringify(sessionState.reference, null, 2)}
              </pre>
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-xs font-semibold text-amber-700 mb-1">Modo prueba</p>
            <p className="text-xs text-amber-600 leading-relaxed">
              Los mensajes se guardan en BD pero no se llama a Chatwoot ni BuilderBot.
              Los estados evolucionan igual que en producción.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 p-4">
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">Mensajes rápidos</p>
            <div className="flex flex-col gap-1">
              {[
                'Hola',
                'Busco piso de alquiler',
                'Quiero comprar una casa',
                'Vi uno en Idealista por 800€/mes en Gracia',
                'No tengo ninguno concreto',
                'Solo quiero saber qué tenéis',
              ].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => { setInput(q); inputRef.current?.focus(); }}
                  className="text-left text-xs text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 rounded px-2 py-1 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
