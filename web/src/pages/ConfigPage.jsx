import { useState, useEffect, useCallback, Fragment } from 'react';
import { useAuth } from '../lib/auth';

const LANGS = [
  { code: '', label: 'Castellà (base)' },
  { code: 'ca', label: 'Català' },
  { code: 'en', label: 'English' },
];

function CopyField({ label, value }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [value]);
  return (
    <div>
      <label className="block text-sm font-medium text-neutral-700 mb-1">{label}</label>
      <div className="flex gap-2">
        <input
          type="text"
          readOnly
          value={value}
          className="flex-1 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-600 font-mono"
        />
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50 whitespace-nowrap"
        >
          {copied ? '✓ Copiat' : 'Copiar'}
        </button>
      </div>
    </div>
  );
}

export default function ConfigPage() {
  const { api } = useAuth();
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // En local: API suele estar en :3001. Si usas ngrok, define VITE_API_PUBLIC_URL en .env (ej. https://xxx.ngrok.io)
  const apiBase =
    import.meta.env.VITE_API_PUBLIC_URL ||
    window.location.origin.replace(/:5173$/, ':3001');
  const webhookUrl = `${apiBase.replace(/\/$/, '')}/api/chatwoot/webhook`;

  useEffect(() => {
    api('/api/panel-config')
      .then((r) => r.json())
      .then(setConfig)
      .finally(() => setLoading(false));
  }, [api]);

  function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    api('/api/panel-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    })
      .then((r) => r.json())
      .then(setConfig)
      .finally(() => setSaving(false));
  }

  if (loading) return <p className="text-neutral-500">Carregant...</p>;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-neutral-900">Configuració del panell</h2>

      {/* URL del webhook de Chatwoot */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6 max-w-xl space-y-2">
        <h3 className="text-sm font-semibold text-neutral-800 mb-3">Webhook de Chatwoot</h3>
        <p className="text-xs text-neutral-500 mb-3">
          Copia aquesta URL i configura-la a Chatwoot → Settings → Integrations → Webhooks (event: <code>message_created</code>).
          En local, Chatwoot no pot cridar <code>localhost:3001</code>. Per provar el bot sense desplegar, obre un túnel (p. ex. <code>ngrok http 3001</code>) i crea <code>web/.env</code> amb <code>VITE_API_PUBLIC_URL=https://la-url-que-et-doni-ngrok</code>; després reinicia el frontend i torna aquí per copiar la URL correcta.
        </p>
        <CopyField label="URL del webhook" value={webhookUrl} />
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-xl border border-neutral-200 p-6 max-w-2xl space-y-6">
        <h3 className="text-sm font-semibold text-neutral-800">General</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Nombre WhatsApp (Volver a WhatsApp)
            </label>
            <input
              type="text"
              value={config.whatsapp_return_number || ''}
              onChange={(e) => setConfig((c) => ({ ...c, whatsapp_return_number: e.target.value }))}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              placeholder="34600000000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Nom de l'empresa
            </label>
            <input
              type="text"
              value={config.company_name || ''}
              onChange={(e) => setConfig((c) => ({ ...c, company_name: e.target.value }))}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              placeholder="Gestoria Agil"
            />
          </div>
        </div>

        <hr className="border-neutral-100" />
        <div>
          <h3 className="text-sm font-semibold text-neutral-800 mb-1">Comportament del bot</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Bot actiu
            </label>
            <select
              value={config.bot_activo || 'true'}
              onChange={(e) => setConfig((c) => ({ ...c, bot_activo: e.target.value }))}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            >
              <option value="true">Sí — el bot respon automàticament</option>
              <option value="false">No — mode manual (l'agència respon)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Espera per agrupar missatges (ms)
            </label>
            <input
              type="number"
              min="500"
              max="10000"
              step="100"
              value={config.message_debounce_ms || '1500'}
              onChange={(e) => setConfig((c) => ({ ...c, message_debounce_ms: e.target.value }))}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
            <p className="text-xs text-neutral-400 mt-1">
              Si l'usuari envia múltiples missatges seguits, s'espera aquest temps per agrupar-los en una sola resposta. 1500ms = 1,5 s recomanat.
            </p>
          </div>
        </div>

        <h3 className="text-sm font-semibold text-neutral-800 mb-1">Missatges del bot</h3>
          <p className="text-xs text-neutral-500 mb-4">
            Variables disponibles: <code className="bg-neutral-100 px-1 rounded">{'{FORM_URL}'}</code> · <code className="bg-neutral-100 px-1 rounded">{'{REFERENCIA}'}</code> · <code className="bg-neutral-100 px-1 rounded">{'{TELEFONO_ADMINISTRACION}'}</code>.
            <br />Si deixes buit un idioma, es traduirà automàticament des del castellà.
          </p>
          <div className="space-y-5">
            {[
              { key: 'msg_form_link', label: 'Formulari (sense referència)', hint: 'S\'envia quan l\'usuari vol alquiler però no ha dit cap pis concret.' },
              { key: 'msg_form_link_ref', label: 'Formulari (amb referència)', hint: 'S\'envia quan l\'usuari ha mencionat un pis concret. Usa {REFERENCIA} per incloure les dades del pis.' },
              { key: 'msg_compra_ref_ok', label: 'Compra — referència identificada', hint: 'L\'usuari vol comprar i ha donat dades identificables. S\'avisarà a un agent.' },
              { key: 'msg_compra_no_ref', label: 'Compra — sense referència clara', hint: 'L\'usuari vol comprar però no s\'ha pogut identificar la propietat.' },
              { key: 'msg_compra_generico', label: 'Compra — consulta genèrica', hint: 'L\'usuari no té cap propietat concreta en ment. Usa {TELEFONO_ADMINISTRACION}.' },
              { key: 'msg_completed', label: 'Ja és client (formulari ja enviat)', hint: 'Si torna a escriure un cop completat el flux.' },
              { key: 'msg_post_form', label: 'Agraïment post-formulari (WhatsApp)', hint: 'S\'envia per WhatsApp quan l\'usuari envia el formulari.' },
              { key: 'msg_form_success', label: 'Formulari enviat (èxit a la web)', hint: 'Missatge que es mostra a la pàgina del formulari quan es registra un lead nou.' },
              { key: 'msg_form_updated', label: 'Formulari actualitzat (èxit a la web)', hint: 'Missatge que es mostra quan el lead ja existia i s\'han actualitzat les dades.' },
            ].map(({ key, label, hint }) => (
              <div key={key} className="rounded-lg border border-neutral-200 p-3 bg-white">
                <label className="block text-sm font-medium text-neutral-700 mb-0.5">{label}</label>
                <p className="text-xs text-neutral-400 mb-2">{hint}</p>
                {LANGS.map(({ code, label: langLabel }) => {
                  const fullKey = code ? `${key}_${code}` : key;
                  return (
                    <div key={fullKey} className="mb-1.5">
                      <span className="text-xs font-medium text-neutral-500">{langLabel}</span>
                      <textarea
                        rows={2}
                        value={config[fullKey] || ''}
                        onChange={(e) => setConfig((c) => ({ ...c, [fullKey]: e.target.value }))}
                        placeholder={code ? 'Buit = traducció automàtica des del castellà' : ''}
                        className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm mt-0.5"
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-neutral-900 text-white px-4 py-2 text-sm font-medium hover:bg-neutral-800 disabled:opacity-50"
        >
          {saving ? 'Desant...' : 'Desar canvis'}
        </button>
      </form>
    </div>
  );
}

