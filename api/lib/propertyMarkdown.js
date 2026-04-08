function displaySiNo(v) {
  if (v === true || v === 1) return 'Sí';
  if (v === false || v === 0) return 'No';
  const s = v != null ? String(v).trim().toLowerCase() : '';
  if (['no', 'false', '0', 'n'].includes(s)) return 'No';
  if (['sí', 'si', 'yes', 'true', '1', 's'].includes(s)) return 'Sí';
  return v != null && String(v).trim() !== '' ? String(v).trim() : '—';
}

/** Convierte una fila de properties a Markdown para el RAG (plantilla acordada). */
export function propertyToMarkdown(row) {
  const ref = row.ref_code || '';
  const zonaLabel = (row.zona || '').trim() || '—';
  const tipoViv = (row.tipo_vivienda || '').trim() || 'Propiedad';
  const titulo = `${tipoViv} en ${zonaLabel}`;
  const op = row.tipo_operacion === 'compra' ? 'Compra' : 'Alquiler';
  const precio =
    row.precio != null && row.precio !== ''
      ? row.tipo_operacion === 'compra'
        ? `${row.precio} €`
        : `${row.precio} €/mes`
      : '—';
  const desc = (row.descripcion || '').trim() || '—';
  const lines = [
    `## ${ref} - ${titulo}`,
    `- Tipo operación: ${op}`,
    `- Zona: ${zonaLabel}`,
    `- Dirección: ${(row.direccion || '').trim() || '—'}`,
    `- Tipo vivienda: ${(row.tipo_vivienda || '').trim() || '—'}`,
    `- Planta: ${(row.planta || '').trim() || '—'}`,
    `- Ascensor: ${displaySiNo(row.ascensor)}`,
    `- Habitaciones: ${row.habitaciones != null ? row.habitaciones : '—'}`,
    `- Baños: ${row.banos != null ? row.banos : '—'}`,
    `- Garaje: ${displaySiNo(row.garaje)}`,
    `- Precio: ${precio}`,
    `- Descripción: ${desc}`,
  ];
  return lines.join('\n');
}
