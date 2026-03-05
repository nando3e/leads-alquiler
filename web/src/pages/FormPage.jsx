import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getLangFromSearch, useI18n } from '../lib/i18n';

const TIPUS_OPTS = [
  { value: 'casa', labelKey: 'casa' },
  { value: 'pis', labelKey: 'pis' },
  { value: 'no_importa', labelKey: 'no_importa' },
];
const SINO_OPTS = [
  { value: 'si', labelKey: 'si' },
  { value: 'no', labelKey: 'no' },
  { value: 'no_importa', labelKey: 'no_importa' },
];
const HABITACIONS_OPTS = ['1', '2', '3', '4', '5_mes', 'no_importa'];
const BANYS_OPTS = ['1', '2', '3_mes', 'no_importa'];
const ZONA_OPTS = [
  { value: 'Qualsevol', labelKey: 'zona_cualsevol' },
  'Olot',
  'Sant Joan les Fonts',
  'Rodalies',
  'Altres',
];
const SITUACIO_OPTS = [
  { value: 'empleat', labelKey: 'empleat' },
  { value: 'autonom', labelKey: 'autonom' },
  { value: 'aturat', labelKey: 'aturat' },
  { value: 'estudiant', labelKey: 'estudiant' },
  { value: 'jubilat', labelKey: 'jubilat' },
  { value: 'altres', labelKey: 'altres' },
];
const QUANTA_GENT_OPTS = ['1', '2', '3', '4', '5', '6_mes'];

export default function FormPage() {
  const [searchParams] = useSearchParams();
  const [lang, setLang] = useState(() => {
    const l = searchParams.get('lang') || 'ca';
    return ['es', 'ca', 'en'].includes(l) ? l : 'ca';
  });
  const { t } = useI18n(lang);
  const [form, setForm] = useState({
    nom: '', cognoms: '', dni_nie: '', mobil: '', fix: '',
    tipus_immoble: 'no_importa', preu_max_mensual: '', moblat: 'no_importa',
    habitacions_min: '', banys_min: '', parking: 'no_importa', ascensor: 'no_importa', calefaccio: 'no_importa',
    altres: '', zona: '', zona_altres: '',
    situacio_laboral: '', sector_professio: '', edat: '', mascotes: 'no',
    quanta_gent_viura: '', menors: '', observacions: '',
    lang: 'ca', whatsapp_number: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('');

  useEffect(() => {
    form.lang = lang;
  }, [lang, form]);

  useEffect(() => {
    fetch('/api/form-config')
      .then((r) => r.json())
      .then((d) => setWhatsappNumber(d.whatsapp_return_number || ''));
  }, []);

  function update(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const payload = { ...form, lang };
    if (!payload.mobil?.trim()) {
      setError(t.required);
      setLoading(false);
      return;
    }
    try {
      const r = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(data.message || t.errorGeneric);
        setLoading(false);
        return;
      }
      setSubmitted(true);
      const waUrlToOpen = whatsappNumber
        ? `https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent('He completado mi solicitud de alquiler.')}`
        : null;
      if (waUrlToOpen) window.open(waUrlToOpen, '_blank', 'noopener,noreferrer');
    } catch {
      setError(t.errorGeneric);
    } finally {
      setLoading(false);
    }
  }

  const waUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent('He completado mi solicitud de alquiler.')}`
    : null;

  if (submitted) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-8 max-w-md text-center">
          <h1 className="text-xl font-semibold text-neutral-900 mb-2">{t.successTitle}</h1>
          <p className="text-neutral-600 mb-6">{t.successMessage}</p>
          {waUrl && (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-lg bg-green-600 text-white px-6 py-3 font-medium hover:bg-green-700"
            >
              {t.backToWhatsApp}
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-8 px-4">
      <div className="max-w-xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex gap-2">
            {['ca', 'es', 'en'].map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className={`rounded-lg px-3 py-1 text-sm ${lang === l ? 'bg-neutral-900 text-white' : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'}`}
              >
                {l === 'ca' ? 'Català' : l === 'es' ? 'Español' : 'English'}
              </button>
            ))}
          </div>
          {waUrl && (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-green-600 hover:text-green-700 font-medium"
            >
              {t.backToWhatsApp}
            </a>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-6 md:p-8">
          <h1 className="text-xl font-semibold text-neutral-900 mb-6">{t.formTitle}</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">{t.nom} *</label>
                <input type="text" value={form.nom} onChange={(e) => update('nom', e.target.value)} className="input" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">{t.cognoms} *</label>
                <input type="text" value={form.cognoms} onChange={(e) => update('cognoms', e.target.value)} className="input" required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">{t.dni_nie} *</label>
              <input type="text" value={form.dni_nie} onChange={(e) => update('dni_nie', e.target.value)} className="input" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">{t.mobil} *</label>
              <input type="tel" value={form.mobil} onChange={(e) => update('mobil', e.target.value)} className="input" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">{t.fix}</label>
              <input type="tel" value={form.fix} onChange={(e) => update('fix', e.target.value)} className="input" />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">{t.tipus_immoble} *</label>
              <select value={form.tipus_immoble} onChange={(e) => update('tipus_immoble', e.target.value)} className="input" required>
                {TIPUS_OPTS.map((o) => (
                  <option key={o.value} value={o.value}>{t[o.labelKey]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">{t.preu_max_mensual} *</label>
              <input type="number" min="0" step="50" value={form.preu_max_mensual} onChange={(e) => update('preu_max_mensual', e.target.value)} className="input" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">{t.moblat} *</label>
              <select value={form.moblat} onChange={(e) => update('moblat', e.target.value)} className="input" required>
                {SINO_OPTS.map((o) => (
                  <option key={o.value} value={o.value}>{t[o.labelKey]}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">{t.habitacions_min}</label>
                <select value={form.habitacions_min} onChange={(e) => update('habitacions_min', e.target.value)} className="input">
                  <option value="">—</option>
                  {HABITACIONS_OPTS.map((v) => (
                    <option key={v} value={v}>{v === '5_mes' ? '5+' : v === 'no_importa' ? t.no_importa : v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">{t.banys_min}</label>
                <select value={form.banys_min} onChange={(e) => update('banys_min', e.target.value)} className="input">
                  <option value="">—</option>
                  {BANYS_OPTS.map((v) => (
                    <option key={v} value={v}>{v === '3_mes' ? '3+' : v === 'no_importa' ? t.no_importa : v}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">{t.parking}</label>
                <select value={form.parking} onChange={(e) => update('parking', e.target.value)} className="input">
                  {SINO_OPTS.map((o) => (
                    <option key={o.value} value={o.value}>{t[o.labelKey]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">{t.ascensor}</label>
                <select value={form.ascensor} onChange={(e) => update('ascensor', e.target.value)} className="input">
                  {SINO_OPTS.map((o) => (
                    <option key={o.value} value={o.value}>{t[o.labelKey]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">{t.calefaccio}</label>
                <select value={form.calefaccio} onChange={(e) => update('calefaccio', e.target.value)} className="input">
                  {SINO_OPTS.map((o) => (
                    <option key={o.value} value={o.value}>{t[o.labelKey]}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">{t.altres_requisits}</label>
              <input type="text" value={form.altres} onChange={(e) => update('altres', e.target.value)} className="input" placeholder="Terrassa, balcó..." />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">{t.zona} *</label>
              <select value={form.zona} onChange={(e) => update('zona', e.target.value)} className="input" required>
                <option value="">—</option>
                {ZONA_OPTS.map((opt) => {
                  const value = typeof opt === 'string' ? opt : opt.value;
                  const label = typeof opt === 'string' ? opt : t[opt.labelKey];
                  return <option key={value} value={value}>{label}</option>;
                })}
              </select>
            </div>
            {form.zona === 'Altres' && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">{t.zona_altres}</label>
                <input type="text" value={form.zona_altres} onChange={(e) => update('zona_altres', e.target.value)} className="input" />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">{t.situacio_laboral}</label>
              <select value={form.situacio_laboral} onChange={(e) => update('situacio_laboral', e.target.value)} className="input">
                <option value="">—</option>
                {SITUACIO_OPTS.map((o) => (
                  <option key={o.value} value={o.value}>{t[o.labelKey]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">{t.sector_professio}</label>
              <input type="text" value={form.sector_professio} onChange={(e) => update('sector_professio', e.target.value)} className="input" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">{t.edat}</label>
                <input type="number" min="0" max="120" value={form.edat} onChange={(e) => update('edat', e.target.value)} className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">{t.mascotes} *</label>
                <select value={form.mascotes} onChange={(e) => update('mascotes', e.target.value)} className="input" required>
                  <option value="si">{t.si}</option>
                  <option value="no">{t.no}</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">{t.quanta_gent_viura}</label>
                <select value={form.quanta_gent_viura} onChange={(e) => update('quanta_gent_viura', e.target.value)} className="input">
                  <option value="">—</option>
                  {QUANTA_GENT_OPTS.map((v) => (
                    <option key={v} value={v}>{v === '6_mes' ? '6+' : v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">{t.menors}</label>
                <input type="number" min="0" value={form.menors} onChange={(e) => update('menors', e.target.value)} className="input" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">{t.observacions}</label>
              <textarea value={form.observacions} onChange={(e) => update('observacions', e.target.value)} className="input min-h-[80px]" rows={3} />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-neutral-900 text-white font-medium hover:bg-neutral-800 disabled:opacity-50"
            >
              {loading ? t.sending : t.submit}
            </button>
          </form>
        </div>
      </div>

      <style>{`
        .input {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid #d4d4d4;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          color: #171717;
        }
        .input:focus {
          outline: none;
          ring: 2px;
          border-color: #a3a3a3;
        }
      `}</style>
    </div>
  );
}
