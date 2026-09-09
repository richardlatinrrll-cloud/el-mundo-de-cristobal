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
  14:{ name: 'Lava',    top: '#ff7a2e', side: '#d24713', hard: 99, liquid: true, glow: true },
  15:{ name: 'Roca volcánica', top: '#41414a', side: '#33333a', bottom: '#2a2a30', hard: 4 },
  // --- minerales (aparecen dentro de la piedra) ---
  16:{ name: 'Carbón',  all: '#2c2c30', hard: 3, mineral: 'carbon' },
  17:{ name: 'Hierro',  all: '#b7a08a', hard: 4, mineral: 'hierro' },
  18:{ name: 'Oro',     all: '#e8c24a', hard: 4, mineral: 'oro' },
  19:{ name: 'Cristal', all: '#7ad8e8', hard: 5, mineral: 'cristal', glow: true },
  // --- bloques que se fabrican ---
  20:{ name: 'Puerta',        top: '#8a6234', side: '#6b4a2f', hard: 2 },
  21:{ name: 'Puerta abierta',all: '#6b4a2f', hard: 2, alpha: true, paso: true },
  22:{ name: 'Ventana',       all: '#cfeef5', hard: 1, alpha: true },
  23:{ name: 'Antorcha',      all: '#ffcf6a', hard: 1, glow: true, alpha: true, paso: true },
  24:{ name: 'Valla',         all: '#9a6f3f', hard: 2 },
  25:{ name: 'Escalera',      all: '#a8813f', hard: 1, alpha: true, paso: true, escalera: true },
};

export const HOTBAR = [1, 3, 7, 4, 5, 6, 8, 9];

// bloques que el jugador puede colocar (para el modo creador: barra completa)
export const PLACEABLES = [1, 2, 3, 4, 6, 7, 8, 9, 11, 13, 15, 20, 22, 23, 24, 25];

// qué se suelta al romper `id`
export function dropFor(id) {
  if (id === AIR) return 0;
  if (id === 10) return 0;             // agua: no se recoge
  if (id === 1) return 2;              // pasto → tierra
  if (id === 21) return 20;            // puerta abierta → puerta
  const def = BLOCKS[id];
  if (def?.mineral) return def.mineral; // mineral → item ('carbon', 'hierro'...)
  return id;
}

export function blockName(id) {
  return BLOCKS[id]?.name ?? 'Aire';
}
export function blockEmoji(id) {
  return ({
    1: '🌱', 2: '🟫', 3: '🪨', 4: '🪵', 5: '🍃', 6: '🟨',
    7: '🟧', 8: '🧱', 9: '🔷', 11: '⬜', 12: '🌵', 13: '⬛',
    14: '🔥', 15: '🌑', 16: '⚫', 17: '⚙️', 18: '🟡', 19: '💠',
    20: '🚪', 21: '🚪', 22: '🪟', 23: '🕯️', 24: '🚧', 25: '🪜',
  })[id] || '⬛';
}
export function isSolid(id) {
  const def = BLOCKS[id];
  return id !== AIR && !def?.liquid && !def?.paso;
}
export function isOpaque(id) {
  return id !== AIR && !BLOCKS[id]?.alpha;
}
export function esEscalera(id) { return !!BLOCKS[id]?.escalera; }

// --- Atlas de texturas procedural ---
const CELL = 16;
const COLS = 32;

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
    paintCell(ctx, id, 0, top, def);
    paintCell(ctx, id, 1, side, def);
    paintCell(ctx, id, 2, bottom, def);
  }

  return { canvas, COLS, CELL, ROWS: 3 };
}

function paintCell(ctx, col, row, color, def) {
  const x = col * CELL;
  const y = row * CELL;
  // los minerales: base de piedra con motas del color
  if (def?.mineral) {
    ctx.fillStyle = '#8a8f98';
    ctx.fillRect(x, y, CELL, CELL);
    ctx.fillStyle = color;
    for (let i = 0; i < 10; i++) {
      const bx = x + 2 + ((Math.random() * (CELL - 4)) | 0);
      const by = y + 2 + ((Math.random() * (CELL - 4)) | 0);
      ctx.fillRect(bx, by, 2, 2);
    }
  } else {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, CELL, CELL);
  }
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
