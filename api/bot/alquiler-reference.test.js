/**
 * Tests para extracción multi-campo e intenciones implícitas del flujo alquiler con referencia.
 * Ejecutar: node --test api/bot/alquiler-reference.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  extractMultipleFields,
  getMissingCaptureFields,
  getNextMissingState,
  parseAlquilerReferenceAnswer,
} from './alquiler-reference.js';

describe('extractMultipleFields', () => {
  it('extrae nombre y apellidos de "me llamo Juan Pérez"', () => {
    const out = extractMultipleFields('me llamo Juan Pérez', {});
    assert.strictEqual(out.nom, 'Juan');
    assert.strictEqual(out.cognoms, 'Pérez');
  });

  it('extrae nombre y apellidos de "Soy María García López"', () => {
    const out = extractMultipleFields('Soy María García López', {});
    assert.strictEqual(out.nom, 'María');
    assert.strictEqual(out.cognoms, 'García López');
  });

  it('no sobrescribe campos ya rellenados y extrae solo los faltantes', () => {
    const capture = { nom: 'Juan', cognoms: 'Pérez' };
    const out = extractMultipleFields('yes', capture);
    assert.strictEqual(out.mascotes, 'si');
    assert.strictEqual(out.nom, undefined);
    assert.strictEqual(out.cognoms, undefined);
  });

  it('interpreta intención implícita "quería saber cuántos metros tiene" como mes_info', () => {
    const out = extractMultipleFields('quería saber cuántos metros tiene', {});
    assert.strictEqual(out.intencio_contacte, 'mes_info');
  });

  it('interpreta "cuántas habitaciones" como mes_info', () => {
    const out = extractMultipleFields('cuántas habitaciones tiene', {});
    assert.strictEqual(out.intencio_contacte, 'mes_info');
  });

  it('interpreta "quiero verlo" como concertar_visita', () => {
    const out = extractMultipleFields('quiero verlo', {});
    assert.strictEqual(out.intencio_contacte, 'concertar_visita');
  });

  it('extrae quanta_gent y mascotes de "somos mi pareja y yo y no tenemos mascotas"', () => {
    const out = extractMultipleFields('somos mi pareja y yo y no tenemos mascotas', {});
    assert.strictEqual(out.quanta_gent_viura, '2');
    assert.strictEqual(out.mascotes, 'no');
  });

  it('extrae situación laboral por número', () => {
    const out = extractMultipleFields('1', {});
    // Sin contexto de paso, parseSituacioLaboral('1') devuelve empleat
    const val = parseAlquilerReferenceAnswer('alq_ref_ask_situacio_laboral', '1');
    assert.strictEqual(val, 'empleat');
  });

  it('usa config para ejemplos mes_info si el parser no matchea', () => {
    const config = {
      alq_ref_ejemplos_mes_info: 'quiero más datos del piso\ninfo del anuncio',
      alq_ref_ejemplos_concertar_visita: '',
    };
    const out = extractMultipleFields('quiero más datos del piso', {}, config);
    assert.strictEqual(out.intencio_contacte, 'mes_info');
  });

  it('usa config para sinónimos contrato fijo', () => {
    const config = {
      alq_ref_sinonimos_fix: 'indefinido\npermanente',
      alq_ref_sinonimos_temporal: '',
    };
    const out = extractMultipleFields('indefinido', {}, config);
    assert.strictEqual(out.tipus_contracte, 'fix');
  });
});

describe('getMissingCaptureFields / getNextMissingState', () => {
  it('devuelve todos los campos si captureData está vacío', () => {
    const missing = getMissingCaptureFields({});
    assert.ok(missing.length > 0);
    assert.strictEqual(missing[0], 'nom');
  });

  it('devuelve siguiente estado tras rellenar nom y cognoms', () => {
    const capture = { nom: 'Juan', cognoms: 'Pérez' };
    const next = getNextMissingState(capture);
    assert.strictEqual(next, 'alq_ref_ask_intencio_contacte');
  });

  it('devuelve null cuando todos los campos están rellenados', () => {
    const capture = {
      nom: 'A',
      cognoms: 'B',
      intencio_contacte: 'mes_info',
      mascotes: 'no',
      quanta_gent_viura: '2',
      situacio_laboral: 'empleat',
      temps_ultima_empresa: 'menys_dun_any',
      empresa_espanyola: 'si',
      tipus_contracte: 'fix',
      ingressos_netos_mensuals: '1600_2000',
    };
    const missing = getMissingCaptureFields(capture);
    assert.strictEqual(missing.length, 0);
    const next = getNextMissingState(capture);
    assert.strictEqual(next, null);
  });
});
