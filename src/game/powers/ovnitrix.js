// Ovnitrix: te transformas en un alienígena hecho con el ADN de un enemigo
// que ya derrotaste. Cada especie derrotada (enemigos, jefes, dinosaurios)
// queda "escaneada" para siempre y se puede usar después como alien, con sus
// propios poderes (nombres propios, no de ninguna serie con copyright).
//
// - Al principio, con pocos ADN escaneados, la transformación sale AL AZAR.
// - Con UMBRAL_CONTROL o más especies escaneadas, el jugador ELIGE cuál usar.
// - Dura DURACION_S segundos.

import { state, save } from '../state.js';
import { toast } from '../../ui/toast.js';

export const DURACION_S = 60;
export const UMBRAL_CONTROL = 3;   // desde cuántos ADN escaneados se puede elegir

// dinosaurios que cuentan como "enemigo" capturable (los animales normales, no)
export const DINOS_CAPTURABLES = ['trex', 'braquiosaurio', 'triceratops', 'raptor'];

// catálogo de alienígenas: uno por cada especie capturable. `stats` se
// combina con las del jugador en aplicarPoderEquipado (ver main.js).
export const ALIENS = {
  // --- enemigos comunes ---
  sombra:        { nombre: 'Sombrizo',        emoji: '👻', color: 0x2b1e3a, stats: { invisible: true, sprintMul: 1.6 } },
  veloz:         { nombre: 'Rafaguero',       emoji: '💨', color: 0x1e2f3a, stats: { sprintMul: 2.6, jumpV: 10 } },
  saltarin:      { nombre: 'Resortín',        emoji: '🦘', color: 0x143a1e, stats: { jumpV: 16, sprintMul: 1.4 } },
  bruto:         { nombre: 'Macizo',          emoji: '🪨', color: 0x3a1e1e, stats: { gemDano: 1.8, empuje: 0.5, sprintMul: 1.2 } },
  acechador:     { nombre: 'Vistalarga',      emoji: '👁️', color: 0x241a2e, stats: { reach: 9, sprintMul: 1.8, visionNocturna: true } },
  larguirucho:   { nombre: 'Elástico',        emoji: '🦴', color: 0xe9e5da, stats: { reach: 10, sprintMul: 2.0 } },
  gigante:       { nombre: 'Coloso Menor',    emoji: '🦵', color: 0x8a7357, stats: { jumpV: 13, gemDano: 1.6, empuje: 0.4, sprintMul: 1.1 } },
  automata:      { nombre: 'Autómata Domado', emoji: '🤖', color: 0x6b7280, stats: { instaBreak: true, gemDano: 1.7, empuje: 0.45, reach: 8 } },
  // --- jefes ---
  golem:         { nombre: 'Trol Aliado',     emoji: '🗿', color: 0x6f7d5a, stats: { gemDano: 2.0, empuje: 0.35, jumpV: 11 } },
  rayo:          { nombre: 'Dragonoide',      emoji: '🐉', color: 0x33507e, stats: { flying: true, sprintMul: 2.3 } },
  ojo:           { nombre: 'Titanoide',       emoji: '🔥', color: 0xb0442e, stats: { instaBreak: true, gemDano: 2.1, reach: 9 } },
  coloso:        { nombre: 'Elfo Sombra',     emoji: '🌑', color: 0x3a2f52, stats: { flying: true, invisible: true } },
  // --- dinosaurios ---
  trex:          { nombre: 'T-Rexoide',       emoji: '🦖', color: 0x5f6b3a, stats: { gemDano: 1.9, sprintMul: 1.7 } },
  braquiosaurio: { nombre: 'Cuellargo',       emoji: '🦕', color: 0x6a7d8f, stats: { reach: 11, empuje: 0.4, jumpV: 9 } },
  triceratops:   { nombre: 'Trikeroide',      emoji: '🦏', color: 0x7a6a54, stats: { gemDano: 1.5, empuje: 0.4, sprintMul: 1.3 } },
  raptor:        { nombre: 'Raptor Veloz',    emoji: '🦎', color: 0x8a6a3a, stats: { sprintMul: 2.8, jumpV: 12 } },
};

export function alienDef(id) {
  return ALIENS[id] || null;
}

export function especimenesCapturados() {
  return state.ovnitrix?.capturados || [];
}

export function puedeElegir() {
  return especimenesCapturados().length >= UMBRAL_CONTROL;
}

// llamar cuando el jugador derrota a un enemigo/jefe/dinosaurio capturable.
// devuelve true si era una especie nueva (para avisar).
export function capturarEspecimen(id) {
  if (!ALIENS[id]) return false;
  state.ovnitrix = state.ovnitrix || { capturados: [] };
  if (state.ovnitrix.capturados.includes(id)) return false;
  state.ovnitrix.capturados.push(id);
  save();
  const a = ALIENS[id];
  toast(`🛸 ¡ADN escaneado: ${a.emoji} ${a.nombre}! Nuevo alien para el Ovnitrix.`, 2600);
  return true;
}
