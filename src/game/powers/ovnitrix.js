// Ovnitrix: te transformas en un alienígena (forma, tamaño y poderes propios)
// durante un rato. Nombres y diseños propios, no de ninguna serie con
// copyright.
//
// - 3 aliens BASE: los tienes desde que desbloqueas el poder, sin hacer nada.
// - 7 aliens de ESPECÍMENES: son enemigos raros que aparecen por el mundo
//   (ver `alienigena: true` en game/mobs.js); al derrotar uno por primera vez
//   queda "escaneado" para siempre.
// - Al principio (con pocos especímenes escaneados) la transformación sale al
//   AZAR entre los disponibles. Con UMBRAL_CONTROL o más escaneados, el
//   jugador ELIGE cuál usar.

import { state, save } from '../state.js';
import { toast } from '../../ui/toast.js';

export const DURACION_S = 60;
export const UMBRAL_CONTROL = 3;   // especímenes escaneados para poder elegir

// `visual` se pasa al constructor de malla de los enemigos (game/mobs.js
// `makeMesh`) para que el jugador tome literalmente esa forma y tamaño.
export const ALIENS = {
  // --- 3 aliens base: disponibles desde el principio ---
  calorox: {
    nombre: 'Calorox', emoji: '🔥', base: true,
    visual: { size: 1.1, color: 0xd94a1e, eye: 0xffdd55, forma: 'calorox' },
    stats: { gemDano: 1.9, sprintMul: 1.2 },
    especial: 'lava',
  },
  rafaguero: {
    nombre: 'Rafaguero', emoji: '💨', base: true,
    visual: { size: 0.85, color: 0x2f8fd9, eye: 0xdfffff, forma: 'rafaguero' },
    stats: { sprintMul: 2.6, jumpV: 10 },
  },
  diamantoide: {
    nombre: 'Diamantoide', emoji: '💎', base: true,
    visual: { size: 1.4, color: 0xa0e8f0, eye: 0xffffff, forma: 'diamantoide' },
    // pesado y resistente, no ágil: mucha fuerza y casi no te empujan, pero
    // menos veloz y salta menos que en tu forma normal (a propósito)
    stats: { gemDano: 2.2, empuje: 0.2, sprintMul: 0.75, jumpV: 6 },
  },
  // --- 7 aliens de especímenes: hay que derrotarlos primero (game/mobs.js) ---
  voltarion: {
    nombre: 'Voltarión', emoji: '⚡',
    visual: { size: 1.0, color: 0x3355ff, eye: 0xccffff, forma: 'voltarion' },
    stats: { gemDano: 1.5, sprintMul: 1.5 },
  },
  sombrizo: {
    nombre: 'Sombrizo', emoji: '👻',
    visual: { size: 0.95, color: 0x2b1e3a, eye: 0xff4d4d, forma: 'sombrizo' },
    stats: { invisible: true, sprintMul: 1.6 },
  },
  congelim: {
    nombre: 'Congelim', emoji: '❄️',
    visual: { size: 1.05, color: 0x8fd8ff, eye: 0xffffff, forma: 'congelim' },
    stats: { empuje: 0.5, gemDano: 1.4, jumpV: 10 },
  },
  alado: {
    nombre: 'Alado', emoji: '🦅',
    visual: { size: 0.9, color: 0x8a5a2e, eye: 0xffe14d, forma: 'alado' },
    stats: { flying: true, sprintMul: 1.4 },
  },
  elastiko: {
    nombre: 'Elastiko', emoji: '🤸',
    visual: { size: 1.15, color: 0xe9e5da, eye: 0x4be0ff, forma: 'elastiko' },
    stats: { reach: 10, sprintMul: 1.8 },
  },
  espinoide: {
    nombre: 'Espinoide', emoji: '🦔',
    visual: { size: 1.2, color: 0x3a1e1e, eye: 0xff8a3d, forma: 'espinoide' },
    stats: { gemDano: 1.7, empuje: 0.5 },
  },
  titanoide: {
    nombre: 'Titanoide', emoji: '🗿',
    visual: { size: 1.6, color: 0xb0442e, eye: 0xff3020, forma: 'gigante' },
    stats: { instaBreak: true, gemDano: 2.0, reach: 9 },
  },
};

const BASE_IDS = Object.keys(ALIENS).filter((id) => ALIENS[id].base);

export function alienDef(id) {
  return ALIENS[id] || null;
}

// especímenes que ya derrotaste (sin los 3 base, esos siempre están). Filtra
// ids que ya no existan en el catálogo (por si cambió en una actualización).
export function especimenesEscaneados() {
  return (state.ovnitrix?.capturados || []).filter((id) => ALIENS[id] && !ALIENS[id].base);
}

// TODOS los aliens que puedes usar ahora mismo (base + escaneados)
export function aliensDisponibles() {
  return [...BASE_IDS, ...especimenesEscaneados()];
}

export function puedeElegir() {
  return especimenesEscaneados().length >= UMBRAL_CONTROL;
}

// llamar cuando el jugador derrota a un enemigo (game/mobs.js _kill). Devuelve
// true si era un espécimen del Ovnitrix nuevo (para avisar).
export function capturarEspecimen(id) {
  const a = ALIENS[id];
  if (!a || a.base) return false;   // solo especímenes, los base no se "capturan"
  state.ovnitrix = state.ovnitrix || { capturados: [] };
  if (state.ovnitrix.capturados.includes(id)) return false;
  state.ovnitrix.capturados.push(id);
  save();
  toast(`🛸 ¡ADN escaneado: ${a.emoji} ${a.nombre}! Nuevo alien para el Ovnitrix.`, 2600);
  return true;
}
