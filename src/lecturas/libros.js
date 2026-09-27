// Catálogo de libros de lectura. Cada libro es un .json en ./libros/ —
// basta con agregar un archivo nuevo ahí para que aparezca en "Mis lecturas"
// (ver docs/COMO_AGREGAR_LIBROS.md).

const mods = import.meta.glob('./libros/*.json', { eager: true });

export const LIBROS = Object.values(mods)
  .map((m) => m.default || m)
  .filter((l) => l && l.id && Array.isArray(l.preguntas) && l.preguntas.length)
  .sort((a, b) => a.titulo.localeCompare(b.titulo, 'es'));

export function libroById(id) {
  return LIBROS.find((l) => l.id === id) || null;
}

// Pregunta con las opciones barajadas (y el índice correcto reajustado).
// Se llama de nuevo cada vez que se reintenta, así no sirve memorizar "la de arriba".
export function barajarPregunta(q) {
  const opts = q.opciones.map((texto, i) => ({ texto, ok: i === q.correcta }));
  for (let i = opts.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  return { ...q, opciones: opts.map((o) => o.texto), correcta: opts.findIndex((o) => o.ok) };
}
