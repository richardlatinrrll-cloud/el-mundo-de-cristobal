import { blockName, blockEmoji } from '../engine/blocks.js';
import { TOOLS } from './tools.js';

// Materiales que son "items" (no bloques). Los bloques usan su propio id numérico.
export const MATERIALES = {
  palo:    { nombre: 'Palo',    emoji: '🥢', donde: 'Fabrícalo con tablas' },
  carbon:  { nombre: 'Carbón',  emoji: '⚫', donde: 'Mina vetas de carbón en la piedra' },
  hierro:  { nombre: 'Hierro',  emoji: '⚙️', donde: 'Mina vetas de hierro, algo hondo' },
  oro:     { nombre: 'Oro',     emoji: '🟡', donde: 'Mina oro, muy hondo y raro' },
  cristal: { nombre: 'Cristal', emoji: '💠', donde: 'Mina cristal, en lo más profundo' },
};

// las claves de objetos (necesita/da/inventario) llegan como string: "7" -> 7
function normId(id) {
  return (typeof id === 'string' && /^\d+$/.test(id)) ? Number(id) : id;
}

// nombre y emoji de cualquier cosa (bloque nº, material, herramienta)
export function cosaNombre(id) {
  id = normId(id);
  if (typeof id === 'number') return blockName(id);
  if (MATERIALES[id]) return MATERIALES[id].nombre;
  if (TOOLS[id]) return TOOLS[id].nombre;
  return id;
}
export function cosaEmoji(id) {
  id = normId(id);
  if (typeof id === 'number') return blockEmoji(id);
  if (MATERIALES[id]) return MATERIALES[id].emoji;
  if (TOOLS[id]) return TOOLS[id].emoji;
  return '❓';
}
export function dondeConseguir(id) {
  id = normId(id);
  if (MATERIALES[id]) return MATERIALES[id].donde;
  if (id === 4) return 'Corta árboles';
  if (id === 3) return 'Mina piedra';
  if (id === 6) return 'Cava arena';
  if (id === 7) return 'Fabrícalo con madera';
  if (id === 9) return 'Fabrícalo con arena';
  if (id === 5) return 'Rompe hojas de los árboles';
  if (id === 8) return 'Fabrícalo con piedra';
  return 'Del mundo';
}

// receta: { id, nombre, emoji, cat, necesita:{cosa:n}, da:{cosa:n}, pista }
export const RECETAS = [
  // --- básicos ---
  { id: 'tablas',  nombre: 'Tablas (x4)',   emoji: '🟧', cat: 'Básico', necesita: { 4: 1 },            da: { 7: 4 } },
  { id: 'palos',   nombre: 'Palos (x4)',    emoji: '🥢', cat: 'Básico', necesita: { 7: 2 },            da: { palo: 4 } },
  { id: 'vidrio',  nombre: 'Vidrio (x2)',   emoji: '🔷', cat: 'Básico', necesita: { 6: 3 },            da: { 9: 2 }, pista: 'Como si lo fundieras' },
  { id: 'ladrillo',nombre: 'Ladrillo (x4)', emoji: '🧱', cat: 'Básico', necesita: { 3: 4 },            da: { 8: 4 } },
  { id: 'antorcha',nombre: 'Antorcha (x4)', emoji: '🕯️', cat: 'Básico', necesita: { palo: 1, carbon: 1 }, da: { 23: 4 }, pista: 'Da luz' },

  // --- construcción ---
  { id: 'puerta',   nombre: 'Puerta',        emoji: '🚪', cat: 'Construir', necesita: { 7: 6 },           da: { 20: 1 }, pista: 'Se abre y cierra al tocarla' },
  { id: 'ventana',  nombre: 'Ventana (x2)',  emoji: '🪟', cat: 'Construir', necesita: { 9: 4, palo: 2 },  da: { 22: 2 } },
  { id: 'valla',    nombre: 'Valla (x3)',    emoji: '🚧', cat: 'Construir', necesita: { palo: 4, 7: 1 },  da: { 24: 3 } },
  { id: 'escalera', nombre: 'Escalera (x3)', emoji: '🪜', cat: 'Construir', necesita: { palo: 7 },        da: { 25: 3 }, pista: 'Se trepa' },

  // --- herramientas ---
  { id: 'pico_piedra', nombre: 'Pico de piedra', emoji: '⛏️', cat: 'Herramientas', necesita: { 3: 3, palo: 2 },       da: { pico_piedra: 1 } },
  { id: 'pico_hierro', nombre: 'Pico de hierro', emoji: '🔨', cat: 'Herramientas', necesita: { hierro: 3, palo: 2 },  da: { pico_hierro: 1 } },
  { id: 'pico_cristal',nombre: 'Pico de cristal',emoji: '💎', cat: 'Herramientas', necesita: { cristal: 4, palo: 2, oro: 1 }, da: { pico_cristal: 1 }, pista: 'Rompe 3×3' },
  { id: 'hacha_hierro',nombre: 'Hacha de hierro',emoji: '🪓', cat: 'Herramientas', necesita: { hierro: 3, palo: 2 },  da: { hacha_hierro: 1 }, pista: 'Corta madera rápido' },
  { id: 'pala_hierro', nombre: 'Pala de hierro', emoji: '🧹', cat: 'Herramientas', necesita: { hierro: 1, palo: 2 },  da: { pala_hierro: 1 }, pista: 'Cava tierra y arena rápido' },

  // --- armas ---
  { id: 'espada_piedra', nombre: 'Espada de piedra', emoji: '🗡️', cat: 'Armas', necesita: { 3: 2, palo: 1 },       da: { espada_piedra: 1 } },
  { id: 'espada_hierro', nombre: 'Espada de hierro', emoji: '⚔️', cat: 'Armas', necesita: { hierro: 2, palo: 1 },  da: { espada_hierro: 1 } },
  { id: 'espada_cristal',nombre: 'Espada de cristal',emoji: '🔱', cat: 'Armas', necesita: { cristal: 2, palo: 1, oro: 1 }, da: { espada_cristal: 1 }, pista: 'Golpe muy fuerte' },
  { id: 'arco',          nombre: 'Arco',            emoji: '🏹', cat: 'Armas', necesita: { palo: 3, 5: 3 },       da: { arco: 1 }, pista: 'Dispara a distancia (botón de poner)' },
  { id: 'flechas',       nombre: 'Flechas (x6)',    emoji: '➤',  cat: 'Armas', necesita: { palo: 1, 3: 1 },       da: { flecha: 6 } },
];

export const CATEGORIAS = ['Básico', 'Construir', 'Herramientas', 'Armas'];

export function tengo(inv, cosa) { return inv[cosa] || 0; }

export function puedeCraftear(receta, inv) {
  return Object.entries(receta.necesita).every(([c, n]) => tengo(inv, c) >= n);
}

// aplica la receta sobre el inventario (objeto) y devuelve true si se hizo
export function craftear(receta, inv) {
  if (!puedeCraftear(receta, inv)) return false;
  for (const [c, n] of Object.entries(receta.necesita)) {
    inv[c] -= n;
    if (inv[c] <= 0) delete inv[c];
  }
  for (const [c, n] of Object.entries(receta.da)) {
    if (TOOLS[c]) continue; // las herramientas/armas van a state.herramientas, no al inventario
    inv[c] = (inv[c] || 0) + n;
  }
  return true;
}
