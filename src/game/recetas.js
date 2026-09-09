import { blockName, blockEmoji } from '../engine/blocks.js';
import { TOOLS } from './tools.js';

// Materiales que son "items" (no bloques). Los bloques usan su propio id numérico.
export const MATERIALES = {
  palo:    { nombre: 'Palo',    emoji: '🥢', donde: 'Fabrícalo con tablas' },
  carbon:  { nombre: 'Carbón',  emoji: '⚫', donde: 'Mina vetas de carbón en la piedra' },
  hierro:  { nombre: 'Hierro',  emoji: '⚙️', donde: 'Mina vetas de hierro, algo hondo' },
  oro:     { nombre: 'Oro',     emoji: '🟡', donde: 'Mina oro, muy hondo y raro' },
  cristal: { nombre: 'Cristal', emoji: '💠', donde: 'Mina cristal, en lo más profundo' },
  // --- de la caza de animales ---
  carne:        { nombre: 'Carne',        emoji: '🥩', donde: 'Caza animales (⛏️ o arco)' },
  carne_cocida: { nombre: 'Carne cocida', emoji: '🍖', donde: 'Cocina carne con carbón' },
  cuero:        { nombre: 'Cuero',        emoji: '🟤', donde: 'Caza animales grandes' },
  pluma:        { nombre: 'Pluma',        emoji: '🪶', donde: 'Caza pájaros' },
  lana:         { nombre: 'Lana',         emoji: '🧶', donde: 'Caza ovejas' },
};

// items de comida: al usarlos recuperan vida
export const COMIDA = { carne: 15, carne_cocida: 40, lana: 0 };

// piezas de armadura de cuero (cada una fabricada reduce un poco el daño)
export const ARMADURA = ['casco_cuero', 'peto_cuero', 'pantalon_cuero', 'botas_cuero'];
export const ARMADURA_NOMBRE = {
  casco_cuero: 'Casco de cuero', peto_cuero: 'Peto de cuero',
  pantalon_cuero: 'Pantalón de cuero', botas_cuero: 'Botas de cuero',
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
  if (ARMADURA_NOMBRE[id]) return ARMADURA_NOMBRE[id];
  if (id === 'flecha') return 'Flecha';
  if (TOOLS[id]) return TOOLS[id].nombre;
  return id;
}
export function cosaEmoji(id) {
  id = normId(id);
  if (typeof id === 'number') return blockEmoji(id);
  if (MATERIALES[id]) return MATERIALES[id].emoji;
  if (id === 'casco_cuero') return '🪖';
  if (id === 'peto_cuero') return '🦺';
  if (id === 'pantalon_cuero') return '👖';
  if (id === 'botas_cuero') return '🥾';
  if (id === 'flecha') return '➤';
  if (TOOLS[id]) return TOOLS[id].emoji;
  return '❓';
}
export function dondeConseguir(id) {
  id = normId(id);
  if (MATERIALES[id]) return MATERIALES[id].donde;
  if (id === 'flecha') return 'Fabrícala con palo + piedra o pluma';
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
  { id: 'flechas_pluma', nombre: 'Flechas con pluma (x8)', emoji: '🪶', cat: 'Armas', necesita: { palo: 1, pluma: 2 }, da: { flecha: 8 }, pista: 'Vuelan más rápido' },

  // --- comida y ropa (de la caza) ---
  { id: 'carne_cocida', nombre: 'Carne cocida (x2)', emoji: '🍖', cat: 'Comida y ropa', necesita: { carne: 2, carbon: 1 }, da: { carne_cocida: 2 }, pista: 'Cura mucha más vida que la cruda' },
  { id: 'casco_cuero',    nombre: 'Casco de cuero',    emoji: '🪖', cat: 'Comida y ropa', necesita: { cuero: 3 }, da: { casco_cuero: 1 },    pista: 'Menos daño de los enemigos' },
  { id: 'peto_cuero',     nombre: 'Peto de cuero',     emoji: '🦺', cat: 'Comida y ropa', necesita: { cuero: 5 }, da: { peto_cuero: 1 } },
  { id: 'pantalon_cuero', nombre: 'Pantalón de cuero', emoji: '👖', cat: 'Comida y ropa', necesita: { cuero: 4 }, da: { pantalon_cuero: 1 } },
  { id: 'botas_cuero',    nombre: 'Botas de cuero',    emoji: '🥾', cat: 'Comida y ropa', necesita: { cuero: 2 }, da: { botas_cuero: 1 } },
];

export const CATEGORIAS = ['Básico', 'Construir', 'Herramientas', 'Armas', 'Comida y ropa'];

// --- Tablero de armado (3×3): hay que COLOCAR los materiales en su forma ---
// P = palo. Cada celda es un id de cosa (número de bloque como string, o
// material) o null (vacía). Se compara recortando los bordes vacíos.
const P = 'palo';
export const FORMAS = [
  { id: 'palos',        nombre: 'Palos (x4)',       emoji: '🥢', da: { palo: 4 },
    patron: [[null, null, null], ['7', null, null], ['7', null, null]] },
  { id: 'antorcha',     nombre: 'Antorcha (x4)',    emoji: '🕯️', da: { 23: 4 },
    patron: [[null, 'carbon', null], [null, P, null], [null, null, null]] },
  { id: 'pico_piedra',  nombre: 'Pico de piedra',   emoji: '⛏️', da: { pico_piedra: 1 },
    patron: [['3', '3', '3'], [null, P, null], [null, P, null]] },
  { id: 'pico_hierro',  nombre: 'Pico de hierro',   emoji: '🔨', da: { pico_hierro: 1 },
    patron: [['hierro', 'hierro', 'hierro'], [null, P, null], [null, P, null]] },
  { id: 'hacha_hierro', nombre: 'Hacha de hierro',  emoji: '🪓', da: { hacha_hierro: 1 },
    patron: [['hierro', 'hierro', null], ['hierro', P, null], [null, P, null]] },
  { id: 'pala_hierro',  nombre: 'Pala de hierro',   emoji: '🥄', da: { pala_hierro: 1 },
    patron: [[null, 'hierro', null], [null, P, null], [null, P, null]] },
  { id: 'espada_hierro', nombre: 'Espada de hierro', emoji: '⚔️', da: { espada_hierro: 1 },
    patron: [[null, 'hierro', null], [null, 'hierro', null], [null, P, null]] },
  { id: 'espada_piedra', nombre: 'Espada de piedra', emoji: '🗡️', da: { espada_piedra: 1 },
    patron: [[null, '3', null], [null, '3', null], [null, P, null]] },
  { id: 'puerta',       nombre: 'Puerta',           emoji: '🚪', da: { 20: 1 },
    patron: [['7', '7', null], ['7', '7', null], ['7', '7', null]] },
  { id: 'escalera',     nombre: 'Escalera (x3)',    emoji: '🪜', da: { 25: 3 },
    patron: [[P, null, P], [P, P, P], [P, null, P]] },
  { id: 'valla',        nombre: 'Valla (x3)',       emoji: '🚧', da: { 24: 3 },
    patron: [[P, P, P], [P, P, P], [null, null, null]] },
  { id: 'arco',         nombre: 'Arco',             emoji: '🏹', da: { arco: 1 },
    patron: [[null, P, '5'], [P, null, '5'], [null, P, '5']] },
];

function recorta(grid) {
  let r0 = 3, r1 = -1, c0 = 3, c1 = -1;
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    if (grid[r][c]) { r0 = Math.min(r0, r); r1 = Math.max(r1, r); c0 = Math.min(c0, c); c1 = Math.max(c1, c); }
  }
  if (r1 < 0) return { cells: [], rows: 0, cols: 0 };
  const cells = [];
  for (let r = r0; r <= r1; r++) cells.push(grid[r].slice(c0, c1 + 1));
  return { cells, rows: r1 - r0 + 1, cols: c1 - c0 + 1 };
}

// ¿el tablero coincide con la forma? devuelve la receta o null
export function formaEnTablero(board) {
  const b = recorta(board);
  if (!b.rows) return null;
  for (const f of FORMAS) {
    const p = recorta(f.patron);
    if (p.rows !== b.rows || p.cols !== b.cols) continue;
    let ok = true;
    for (let r = 0; r < p.rows && ok; r++)
      for (let c = 0; c < p.cols && ok; c++) {
        const a = b.cells[r][c] || null, e = p.cells[r][c] || null;
        if (a !== e) ok = false;
      }
    if (ok) return f;
  }
  return null;
}

// cuántas unidades de cada cosa pide una forma (para descontar del inventario)
export function costoForma(f) {
  const cost = {};
  for (const row of f.patron) for (const cell of row) if (cell) cost[cell] = (cost[cell] || 0) + 1;
  return cost;
}

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
    if (TOOLS[c] || ARMADURA.includes(c)) continue; // herramientas/armas/armadura no van al inventario
    inv[c] = (inv[c] || 0) + n;
  }
  return true;
}
