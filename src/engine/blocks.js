// Catálogo de bloques. Cada bloque tiene un id, nombre, color por cara y dureza.
// Texturas: generamos un atlas procedural sencillo (sin imágenes externas).

export const AIR = 0;

export const BLOCKS = {
  1: { name: 'Pasto',   top: '#5fa842', side: '#7a5a3c', bottom: '#6b4a2f', hard: 1 },
  2: { name: 'Tierra',  all: '#7a5a3c', hard: 1 },
  3: { name: 'Piedra',  all: '#8a8f98', hard: 3 },
  4: { name: 'Madera',  top: '#b8894b', side: '#8a6234', hard: 2 },
  5: { name: 'Hojas',   all: '#3f8f3a', hard: 1, alpha: true },
  6: { name: 'Arena',   all: '#e3d29a', hard: 1 },
  7: { name: 'Tablas',  all: '#c69a5b', hard: 2 },
  8: { name: 'Ladrillo',all: '#a6483a', hard: 3 },
  9: { name: 'Vidrio',  all: '#bfe6f0', hard: 1, alpha: true },
  10:{ name: 'Agua',    all: '#3b6fd0', hard: 99, alpha: true, liquid: true },
  11:{ name: 'Nieve',   all: '#eef4fb', hard: 1 },
  12:{ name: 'Cactus',  all: '#2f7d32', hard: 1 },
  13:{ name: 'Roca oscura', all: '#4a4f57', hard: 4 },
};

export const HOTBAR = [1, 3, 7, 4, 5, 6, 8, 9];

// bloques que el jugador puede colocar (para el modo creador: barra completa)
export const PLACEABLES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13];

// qué bloque sueltas al romper `id` (casi todos se sueltan a sí mismos)
export function dropFor(id) {
  if (id === AIR) return 0;
  if (id === 10) return 0;      // agua: no se recoge
  if (id === 1) return 2;       // pasto → tierra (como en Minecraft)
  return id;
}

export function blockName(id) {
  return BLOCKS[id]?.name ?? 'Aire';
}
export function blockEmoji(id) {
  return ({
    1: '🌱', 2: '🟫', 3: '🪨', 4: '🪵', 5: '🍃', 6: '🟨',
    7: '🟧', 8: '🧱', 9: '🔷', 11: '⬜', 12: '🌵', 13: '⬛',
  })[id] || '⬛';
}
export function isSolid(id) {
  return id !== AIR && !BLOCKS[id]?.liquid;
}
export function isOpaque(id) {
  return id !== AIR && !BLOCKS[id]?.alpha;
}

// --- Atlas de texturas procedural ---
const CELL = 16;
const COLS = 16;

export function buildAtlas() {
  const canvas = document.createElement('canvas');
  canvas.width = COLS * CELL;
  canvas.height = CELL * 3;
  const ctx = canvas.getContext('2d');

  for (const [idStr, def] of Object.entries(BLOCKS)) {
    const id = +idStr;
    const top = def.top || def.all || '#fff';
    const side = def.side || def.all || '#fff';
    const bottom = def.bottom || def.all || side;
    paintCell(ctx, id, 0, top);
    paintCell(ctx, id, 1, side);
    paintCell(ctx, id, 2, bottom);
  }

  return { canvas, COLS, CELL, ROWS: 3 };
}

function paintCell(ctx, col, row, color) {
  const x = col * CELL;
  const y = row * CELL;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, CELL, CELL);
  ctx.globalAlpha = 0.10;
  for (let i = 0; i < 26; i++) {
    ctx.fillStyle = i % 2 ? '#000' : '#fff';
    ctx.fillRect(x + ((Math.random() * CELL) | 0), y + ((Math.random() * CELL) | 0), 1, 1);
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#00000022';
  ctx.strokeRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1);
}

export function faceUV(id, face) {
  const u0 = (id / COLS);
  const u1 = (id + 1) / COLS;
  const v0 = face / 3;
  const v1 = (face + 1) / 3;
  return { u0, u1, v0, v1 };
}
