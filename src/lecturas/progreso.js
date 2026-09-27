// Avance de "Mis lecturas" (modo dominio):
// - Cada nivel del minijuego es una RONDA de hasta PREGUNTAS_POR_RONDA preguntas.
// - Entran primero las que falló antes (pendientes) y se completa con nuevas,
//   siempre en el orden del libro (así el nivel "recorre" la historia).
// - Acertar AL PRIMER INTENTO → la pregunta queda dominada y no vuelve.
//   Fallar (aunque después la acierte para abrir la puerta) → sigue pendiente.
// - Lo de una ronda solo se guarda al TERMINAR el nivel: si sale a la mitad,
//   esa ronda se pierde y la repite entera.
// - Libro logrado = todas las preguntas dominadas.
import { state, save, saveLecturas } from '../game/state.js';
import { LIBROS, libroById } from './libros.js';

export const PREGUNTAS_POR_RONDA = 20;

// libro que se asigna solo la primera vez (el de la prueba actual)
const LIBRO_INICIAL = 'el-jardin-secreto';

const clave = (q) => q.p;

function avance(libroId) {
  const l = state.lecturas.libros;
  if (!l[libroId]) l[libroId] = { dominadas: [], pendientes: [], rondas: 0, completado: false, fecha: null };
  return l[libroId];
}

export function resumen(libro) {
  const a = avance(libro.id);
  const claves = new Set(libro.preguntas.map(clave));
  const dominadas = a.dominadas.filter((k) => claves.has(k)).length;
  const pendientes = a.pendientes.filter((k) => claves.has(k) && !a.dominadas.includes(k)).length;
  const total = libro.preguntas.length;
  return { total, dominadas, pendientes, nuevas: total - dominadas - pendientes, rondas: a.rondas, completado: a.completado };
}

export function armarRonda(libro, n = PREGUNTAS_POR_RONDA) {
  const a = avance(libro.id);
  const dom = new Set(a.dominadas);
  const pend = new Set(a.pendientes);
  const conIdx = libro.preguntas.map((q, i) => ({ q, i }));
  const fallas = conIdx.filter(({ q }) => pend.has(clave(q)) && !dom.has(clave(q)));
  const nuevas = conIdx.filter(({ q }) => !pend.has(clave(q)) && !dom.has(clave(q)));
  return [...fallas, ...nuevas].slice(0, n).sort((x, y) => x.i - y.i).map(({ q }) => q);
}

// resultados: [{ q, primeraOk }]. Devuelve el resumen actualizado.
export function registrarRonda(libro, resultados) {
  if (state.maestro) return resumen(libro);   // probando con la clave maestra: no cuenta
  const a = avance(libro.id);
  const dom = new Set(a.dominadas);
  const pend = new Set(a.pendientes);
  for (const { q, primeraOk } of resultados) {
    const k = clave(q);
    if (primeraOk) { dom.add(k); pend.delete(k); } else if (!dom.has(k)) pend.add(k);
  }
  a.dominadas = [...dom];
  a.pendientes = [...pend];
  a.rondas++;
  const r = resumen(libro);
  if (r.dominadas >= r.total && !a.completado) { a.completado = true; a.fecha = new Date().toISOString().slice(0, 10); }
  save();
  return resumen(libro);
}

// --- libro obligatorio (lo decide el papá con la clave maestra) ---
export function initLecturas() {
  if (state.lecturas.init) return;
  state.lecturas.init = true;
  if (libroById(LIBRO_INICIAL)) state.lecturas.obligatoria = LIBRO_INICIAL;
  saveLecturas();
}

// libro obligatorio que todavía no está dominado (o null)
export function lecturaObligatoriaPendiente() {
  const id = state.lecturas.obligatoria;
  const libro = id && libroById(id);
  if (!libro) return null;
  return resumen(libro).completado ? null : libro;
}

export function asignarObligatoria(libroId) { state.lecturas.obligatoria = libroId; saveLecturas(); }
export function liberarObligatoria() { state.lecturas.obligatoria = null; saveLecturas(); }
export function reiniciarLibro(libroId) { delete state.lecturas.libros[libroId]; saveLecturas(); }

export { LIBROS };
