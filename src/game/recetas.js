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

// armaduras que se GANAN al derrotar a cada jefe (no se fabrican). Reducen más.
export const ARMADURA_JEFE = {
  trol:   { nombre: 'Coraza del Trol',       emoji: '🪨', red: 0.17 },
  dragon: { nombre: 'Escamas del Dragón',    emoji: '🐲', red: 0.17 },
  titan:  { nombre: 'Placa del Titán',       emoji: '☄️', red: 0.17 },
  elfo:   { nombre: 'Manto del Elfo Oscuro', emoji: '🌑', red: 0.17 },
};
// qué armadura suelta cada jefe (por id de jefe)
export const JEFE_ARMADURA = { golem: 'trol', rayo: 'dragon', ojo: 'titan', coloso: 'elfo' };

// reducción total de daño según las piezas puestas
export function reduccionArmadura(armadura = []) {
  let r = 0;
  for (const p of armadura) {
    if (typeof p === 'string' && p.startsWith('jefe_')) r += ARMADURA_JEFE[p.slice(5)]?.red || 0.15;
    else r += 0.13;
  }
  return Math.min(0.78, r);
}

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

export const CATEGORIAS = ['Básico', 'Construir', 'Herramientas', 'Armas', 'Comida y ropa'];

// --- Tablero de armado (3×3): hay que COLOCAR los materiales EN SU FORMA ---
// Cada receta es una FORMA. Cada celda: id de bloque (número como string),
// material (palo, hierro…) o null (vacía). Se compara recortando bordes vacíos,
// así la figura puede armarse en cualquier parte del tablero.
const P = 'palo';
export const FORMAS = [
  // --- Básico ---
  { id: 'tablas',   nombre: 'Tablas (x4)',   emoji: '🟧', cat: 'Básico', da: { 7: 4 },
    patron: [[null, null, null], [null, '4', null], [null, null, null]] },
  { id: 'palos',    nombre: 'Palos (x4)',    emoji: '🥢', cat: 'Básico', da: { palo: 4 },
    patron: [[null, '7', null], [null, '7', null], [null, null, null]] },
  { id: 'vidrio',   nombre: 'Vidrio (x2)',   emoji: '🔷', cat: 'Básico', da: { 9: 2 }, pista: 'Como si fundieras arena',
    patron: [[null, null, null], ['6', '6', '6'], [null, null, null]] },
  { id: 'ladrillo', nombre: 'Ladrillo (x4)', emoji: '🧱', cat: 'Básico', da: { 8: 4 },
    patron: [[null, null, null], ['3', '3', null], ['3', '3', null]] },
  { id: 'antorcha', nombre: 'Antorcha (x4)', emoji: '🕯️', cat: 'Básico', da: { 23: 4 }, pista: 'Para poner en las paredes',
    patron: [[null, 'carbon', null], [null, P, null], [null, null, null]] },
  { id: 'antorcha_mano', nombre: 'Antorcha de mano', emoji: '🔥', cat: 'Herramientas', da: { antorcha: 1 },
    pista: 'Llévala en la mano: ilumina de noche (pero los monstruos te buscan)',
    patron: [[null, 'carbon', null], [null, 'carbon', null], [null, P, null]] },

  // --- Construir ---
  { id: 'puerta',   nombre: 'Puerta',        emoji: '🚪', cat: 'Construir', da: { 20: 1 }, pista: 'Se abre y cierra al tocarla',
    patron: [['7', '7', null], ['7', '7', null], ['7', '7', null]] },
  { id: 'ventana',  nombre: 'Ventana (x2)',  emoji: '🪟', cat: 'Construir', da: { 22: 2 },
    patron: [['9', P, '9'], ['9', P, '9'], [null, null, null]] },
  { id: 'valla',    nombre: 'Valla (x3)',    emoji: '🚧', cat: 'Construir', da: { 24: 3 },
    patron: [[P, '7', P], [P, '7', P], [null, null, null]] },
  { id: 'escalera', nombre: 'Escalera (x3)', emoji: '🪜', cat: 'Construir', da: { 25: 3 }, pista: 'Se trepa',
    patron: [[P, null, P], [P, P, P], [P, null, P]] },
  { id: 'cofre',    nombre: 'Cofre',         emoji: '📦', cat: 'Construir', da: { 26: 1 },
    pista: 'Guarda todas tus cosas. Tócalo con 🧱 para abrirlo.',
    patron: [['7', '7', '7'], ['7', null, '7'], ['7', '7', '7']] },

  // --- Herramientas ---
  { id: 'pico_piedra',  nombre: 'Pico de piedra',  emoji: '⛏️', cat: 'Herramientas', da: { pico_piedra: 1 },
    patron: [['3', '3', '3'], [null, P, null], [null, P, null]] },
  { id: 'pico_hierro',  nombre: 'Pico de hierro',  emoji: '🔨', cat: 'Herramientas', da: { pico_hierro: 1 },
    patron: [['hierro', 'hierro', 'hierro'], [null, P, null], [null, P, null]] },
  { id: 'pico_cristal', nombre: 'Pico de cristal', emoji: '💎', cat: 'Herramientas', da: { pico_cristal: 1 }, pista: 'Rompe 3×3',
    patron: [['cristal', 'cristal', 'cristal'], [null, P, null], [null, P, null]] },
  { id: 'hacha_hierro', nombre: 'Hacha de hierro', emoji: '🪓', cat: 'Herramientas', da: { hacha_hierro: 1 }, pista: 'Corta madera rápido',
    patron: [['hierro', 'hierro', null], ['hierro', P, null], [null, P, null]] },
  { id: 'pala_hierro',  nombre: 'Pala de hierro',  emoji: '🥄', cat: 'Herramientas', da: { pala_hierro: 1 }, pista: 'Cava tierra y arena rápido',
    patron: [[null, 'hierro', null], [null, P, null], [null, P, null]] },

  // --- Armas ---
  { id: 'espada_piedra',  nombre: 'Espada de piedra',  emoji: '🗡️', cat: 'Armas', da: { espada_piedra: 1 },
    patron: [[null, '3', null], [null, '3', null], [null, P, null]] },
  { id: 'espada_hierro',  nombre: 'Espada de hierro',  emoji: '⚔️', cat: 'Armas', da: { espada_hierro: 1 },
    patron: [[null, 'hierro', null], [null, 'hierro', null], [null, P, null]] },
  { id: 'espada_cristal', nombre: 'Espada de cristal', emoji: '🔱', cat: 'Armas', da: { espada_cristal: 1 }, pista: 'Golpe muy fuerte',
    patron: [[null, 'cristal', null], [null, 'cristal', null], [null, P, null]] },
  { id: 'arco',           nombre: 'Arco',              emoji: '🏹', cat: 'Armas', da: { arco: 1 }, pista: 'Dispara a distancia (botón de poner)',
    patron: [[null, P, '5'], [P, null, '5'], [null, P, '5']] },
  { id: 'flechas',        nombre: 'Flechas (x6)',      emoji: '➤',  cat: 'Armas', da: { flecha: 6 },
    patron: [[null, '5', null], [null, P, null], [null, '3', null]] },
  { id: 'flechas_pluma',  nombre: 'Flechas con pluma (x8)', emoji: '🪶', cat: 'Armas', da: { flecha: 8 }, pista: 'Vuelan más rápido',
    patron: [[null, 'pluma', null], [null, P, null], [null, '3', null]] },

  // --- Comida y ropa (de la caza) ---
  { id: 'carne_cocida',   nombre: 'Carne cocida (x2)', emoji: '🍖', cat: 'Comida y ropa', da: { carne_cocida: 2 }, pista: 'Cura mucho más que la cruda',
    patron: [[null, 'carne', null], [null, 'carbon', null], [null, null, null]] },
  { id: 'casco_cuero',    nombre: 'Casco de cuero',    emoji: '🪖', cat: 'Comida y ropa', da: { casco_cuero: 1 }, pista: 'Menos daño de los enemigos',
    patron: [['cuero', 'cuero', 'cuero'], ['cuero', null, 'cuero'], [null, null, null]] },
  { id: 'peto_cuero',     nombre: 'Peto de cuero',     emoji: '🦺', cat: 'Comida y ropa', da: { peto_cuero: 1 },
    patron: [['cuero', null, 'cuero'], ['cuero', 'cuero', 'cuero'], ['cuero', 'cuero', 'cuero']] },
  { id: 'pantalon_cuero', nombre: 'Pantalón de cuero', emoji: '👖', cat: 'Comida y ropa', da: { pantalon_cuero: 1 },
    patron: [['cuero', 'cuero', 'cuero'], ['cuero', null, 'cuero'], ['cuero', null, 'cuero']] },
  { id: 'botas_cuero',    nombre: 'Botas de cuero',    emoji: '🥾', cat: 'Comida y ropa', da: { botas_cuero: 1 },
    patron: [['cuero', null, 'cuero'], ['cuero', null, 'cuero'], [null, null, null]] },
];

// alias: el "libro de recetas" recorre las mismas FORMAS
export const RECETAS = FORMAS;

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

// patrón recortado y CENTRADO en una grilla 3×3 (para dibujar la guía fantasma)
export function centrarPatron(f) {
  const b = recorta(f.patron);
  const g = [[null, null, null], [null, null, null], [null, null, null]];
  const r0 = Math.floor((3 - b.rows) / 2), c0 = Math.floor((3 - b.cols) / 2);
  for (let r = 0; r < b.rows; r++) for (let c = 0; c < b.cols; c++) g[r0 + r][c0 + c] = b.cells[r][c] || null;
  return g;
}

export function tengo(inv, cosa) { return inv[cosa] || 0; }

// ¿el jugador tiene los materiales para armar esta forma?
export function puedeArmar(f, inv) {
  return Object.entries(costoForma(f)).every(([c, n]) => (inv[c] || 0) >= n);
}
export const puedeCraftear = puedeArmar;   // alias para el libro de recetas
