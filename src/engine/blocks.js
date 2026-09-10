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
  26:{ name: 'Cofre',         top: '#b0854c', side: '#8a6234', bottom: '#6b4a2f', hard: 2, cofre: true },
};

export const HOTBAR = [1, 3, 7, 4, 5, 6, 8, 9];

// bloques que el jugador puede colocar (para el modo creador: barra completa)
export const PLACEABLES = [1, 2, 3, 4, 6, 7, 8, 9, 11, 13, 15, 20, 22, 23, 24, 25, 26];

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
    20: '🚪', 21: '🚪', 22: '🪟', 23: '🕯️', 24: '🚧', 25: '🪜', 26: '📦',
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

// --- Atlas de texturas procedural (más detalle: 32 px por cara) ---
const CELL = 32;
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
    paintCell(ctx, id, 0, top, def, 'top');
    paintCell(ctx, id, 1, side, def, 'side');
    paintCell(ctx, id, 2, bottom, def, 'bottom');
  }

  return { canvas, COLS, CELL, ROWS: 3 };
}

// ---- utilidades de color ----
function toRgb(h) {
  if (h[0] !== '#') return [200, 200, 200];
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const cl = (v) => Math.max(0, Math.min(255, v | 0));
const css = (r, g, b) => `rgb(${cl(r)},${cl(g)},${cl(b)})`;
function mul(c, f) { return [c[0] * f, c[1] * f, c[2] * f]; }
function jit(c, d) { const k = (Math.random() * 2 - 1) * d; return [c[0] + k, c[1] + k, c[2] + k]; }
function rnd(n) { return (Math.random() * n) | 0; }

// ruido base: rellena la celda con motas suaves alrededor del color
function base(ctx, x, y, color, amp = 14, dens = 0.55) {
  ctx.fillStyle = css(...color);
  ctx.fillRect(x, y, CELL, CELL);
  const px = 2;
  for (let j = 0; j < CELL; j += px)
    for (let i = 0; i < CELL; i += px) {
      if (Math.random() > dens) continue;
      ctx.fillStyle = css(...jit(color, amp));
      ctx.fillRect(x + i, y + j, px, px);
    }
}

function borde(ctx, x, y, a = 0.16) {
  ctx.strokeStyle = `rgba(0,0,0,${a})`;
  ctx.strokeRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1);
}

function paintCell(ctx, id, row, color, def, cara) {
  const x = id * CELL; // columna = id del bloque
  const y = row * CELL; // fila 0 = arriba, 1 = lado, 2 = abajo
  const c = toRgb(color);

  // minerales: piedra con vetas del color, agrupadas
  if (def?.mineral) {
    base(ctx, x, y, [138, 143, 152], 16, 0.5);
    const oc = toRgb(color);
    const blobs = 3 + rnd(3);
    for (let b = 0; b < blobs; b++) {
      const bx = x + 4 + rnd(CELL - 12), by = y + 4 + rnd(CELL - 12);
      for (let k = 0; k < 5; k++) {
        ctx.fillStyle = css(...jit(oc, 22));
        ctx.fillRect(bx + rnd(6), by + rnd(6), 3, 3);
      }
    }
    if (def.glow) { ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fillRect(x, y, CELL, CELL); }
    borde(ctx, x, y);
    return;
  }

  switch (id) {
    case 1: // Pasto
      if (cara === 'top') {
        base(ctx, x, y, c, 18, 0.7);
        for (let k = 0; k < 40; k++) {
          ctx.fillStyle = css(...jit(mul(c, 0.8 + Math.random() * 0.5), 10));
          ctx.fillRect(x + rnd(CELL), y + rnd(CELL), 2, 3);
        }
      } else if (cara === 'side') {
        base(ctx, x, y, [122, 90, 60], 12, 0.5);          // tierra
        ctx.fillStyle = css(...c);
        ctx.fillRect(x, y, CELL, 6);                        // franja de pasto arriba
        for (let k = 0; k < CELL; k += 2) {
          ctx.fillStyle = css(...jit(c, 14));
          ctx.fillRect(x + k, y + 5 + rnd(4), 2, 3);        // hierba colgando
        }
      } else {
        base(ctx, x, y, [122, 90, 60], 12, 0.5);
      }
      borde(ctx, x, y); return;

    case 2: // Tierra
      base(ctx, x, y, c, 13, 0.55);
      for (let k = 0; k < 10; k++) { ctx.fillStyle = css(...mul(c, 0.7)); ctx.fillRect(x + rnd(CELL - 3), y + rnd(CELL - 3), 3, 2); }
      borde(ctx, x, y); return;

    case 3: case 13: case 15: { // Piedra / roca oscura / roca volcánica
      base(ctx, x, y, c, 12, 0.5);
      // manchas
      for (let k = 0; k < 6; k++) {
        ctx.fillStyle = css(...mul(c, 0.82 + Math.random() * 0.3));
        ctx.fillRect(x + rnd(CELL - 8), y + rnd(CELL - 8), 4 + rnd(6), 3 + rnd(5));
      }
      // grieta
      ctx.strokeStyle = css(...mul(c, 0.55)); ctx.lineWidth = 1;
      ctx.beginPath();
      let gx = x + 6 + rnd(CELL - 12), gy = y + 2;
      ctx.moveTo(gx, gy);
      for (let s = 0; s < 4; s++) { gx += rnd(7) - 3; gy += 6 + rnd(4); ctx.lineTo(gx, gy); }
      ctx.stroke();
      borde(ctx, x, y); return;
    }

    case 4: // Madera (tronco)
      if (cara === 'top') {
        base(ctx, x, y, c, 10, 0.4);
        const cx = x + CELL / 2, cy = y + CELL / 2;
        ctx.strokeStyle = css(...mul(c, 0.7));
        for (let r = 3; r < CELL / 2; r += 3) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke(); }
      } else {
        base(ctx, x, y, c, 10, 0.4);
        ctx.strokeStyle = css(...mul(c, 0.68));
        for (let k = 4; k < CELL; k += 6) {
          ctx.beginPath(); ctx.moveTo(x + k, y);
          ctx.bezierCurveTo(x + k + 2, y + 10, x + k - 2, y + 22, x + k + 1, y + CELL);
          ctx.stroke();
        }
      }
      borde(ctx, x, y); return;

    case 5: // Hojas
      base(ctx, x, y, c, 22, 0.8);
      for (let k = 0; k < 26; k++) {
        ctx.fillStyle = css(...jit(mul(c, 0.7 + Math.random() * 0.6), 18));
        ctx.fillRect(x + rnd(CELL - 3), y + rnd(CELL - 3), 3, 3);
      }
      borde(ctx, x, y, 0.1); return;

    case 6: case 11: { // Arena / Nieve
      base(ctx, x, y, c, id === 11 ? 8 : 16, 0.6);
      // leve gradiente diagonal (duna)
      for (let k = 0; k < CELL; k++) {
        ctx.fillStyle = `rgba(255,255,255,${0.03 + (k / CELL) * 0.05})`;
        ctx.fillRect(x + k, y, 1, CELL);
      }
      if (id === 11) for (let k = 0; k < 8; k++) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x + rnd(CELL), y + rnd(CELL), 1, 1); }
      borde(ctx, x, y, 0.08); return;
    }

    case 7: case 24: case 25: { // Tablas / valla / escalera
      base(ctx, x, y, c, 10, 0.4);
      ctx.strokeStyle = css(...mul(c, 0.6));
      for (let k = 0; k <= CELL; k += 8) { ctx.beginPath(); ctx.moveTo(x, y + k); ctx.lineTo(x + CELL, y + k); ctx.stroke(); }
      for (let k = 4; k < CELL; k += 8) { ctx.fillStyle = css(...mul(c, 0.5)); ctx.fillRect(x + 2, y + k, 2, 2); ctx.fillRect(x + CELL - 4, y + k, 2, 2); }
      borde(ctx, x, y); return;
    }

    case 8: { // Ladrillo
      base(ctx, x, y, [170, 168, 165], 6, 0.3);     // mortero
      const bw = CELL / 2, bh = CELL / 4;
      for (let r = 0; r < 4; r++) {
        const off = (r % 2) ? bw / 2 : 0;
        for (let cc2 = -1; cc2 < 3; cc2++) {
          ctx.fillStyle = css(...jit(c, 10));
          ctx.fillRect(x + cc2 * bw + off + 1, y + r * bh + 1, bw - 2, bh - 2);
        }
      }
      borde(ctx, x, y); return;
    }

    case 9: case 22: { // Vidrio / ventana (el material aplica la transparencia)
      base(ctx, x, y, c, 6, 0.25);
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.strokeRect(x + 1.5, y + 1.5, CELL - 3, CELL - 3);
      ctx.beginPath(); ctx.moveTo(x + 4, y + CELL - 5); ctx.lineTo(x + CELL - 6, y + 5); ctx.stroke();
      borde(ctx, x, y, 0.25); return;
    }

    case 10: // Agua
      base(ctx, x, y, c, 10, 0.5);
      ctx.strokeStyle = 'rgba(255,255,255,0.16)';
      for (let k = 3; k < CELL; k += 7) { ctx.beginPath(); ctx.moveTo(x, y + k); ctx.quadraticCurveTo(x + CELL / 2, y + k + 3, x + CELL, y + k); ctx.stroke(); }
      return;

    case 12: // Cactus
      base(ctx, x, y, c, 12, 0.5);
      ctx.fillStyle = css(...mul(c, 0.7));
      ctx.fillRect(x, y, 3, CELL); ctx.fillRect(x + CELL - 3, y, 3, CELL);
      for (let k = 2; k < CELL; k += 5) { ctx.fillStyle = '#dfe8c0'; ctx.fillRect(x + 4 + rnd(CELL - 8), y + k, 1, 2); }
      borde(ctx, x, y); return;

    case 14: // Lava
      base(ctx, x, y, c, 24, 0.7);
      for (let k = 0; k < 6; k++) { ctx.fillStyle = 'rgba(255,240,180,0.8)'; ctx.fillRect(x + rnd(CELL - 6), y + rnd(CELL - 6), 4 + rnd(5), 3 + rnd(4)); }
      for (let k = 0; k < 5; k++) { ctx.fillStyle = 'rgba(60,20,0,0.5)'; ctx.fillRect(x + rnd(CELL - 4), y + rnd(CELL - 4), 3, 3); }
      return;

    case 23: // Antorcha
      ctx.clearRect(x, y, CELL, CELL);
      ctx.fillStyle = '#6b4a2f'; ctx.fillRect(x + CELL / 2 - 2, y + CELL / 2, 4, CELL / 2);
      ctx.fillStyle = '#ffcf6a'; ctx.beginPath(); ctx.arc(x + CELL / 2, y + CELL / 2 - 1, 5, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff2b0'; ctx.beginPath(); ctx.arc(x + CELL / 2, y + CELL / 2 - 2, 2.5, 0, 7); ctx.fill();
      return;

    case 20: case 21: { // Puerta
      base(ctx, x, y, c, 8, 0.35);
      ctx.strokeStyle = css(...mul(c, 0.55));
      ctx.strokeRect(x + 3, y + 3, CELL - 6, CELL - 6);
      ctx.strokeRect(x + 3, y + 3, CELL - 6, (CELL - 6) / 2);
      ctx.fillStyle = '#e8c24a'; ctx.fillRect(x + CELL - 8, y + CELL / 2 - 1, 3, 3); // pomo
      if (id === 21) { ctx.globalAlpha = 0.4; ctx.clearRect(x + 4, y + 4, CELL - 8, CELL - 8); ctx.globalAlpha = 1; }
      borde(ctx, x, y); return;
    }

    case 26: { // Cofre
      base(ctx, x, y, c, 8, 0.4);
      ctx.strokeStyle = css(...mul(c, 0.5)); ctx.lineWidth = 2;
      ctx.strokeRect(x + 3, y + 3, CELL - 6, CELL - 6);
      ctx.beginPath(); ctx.moveTo(x + 3, y + CELL / 2 - 3); ctx.lineTo(x + CELL - 3, y + CELL / 2 - 3); ctx.stroke(); // tapa
      ctx.fillStyle = '#c9b070'; ctx.fillRect(x + CELL / 2 - 2, y + CELL / 2 - 5, 4, 6); // cerrojo
      ctx.lineWidth = 1;
      borde(ctx, x, y); return;
    }
  }

  // por defecto
  base(ctx, x, y, c, 12, 0.5);
  borde(ctx, x, y);
}

export function faceUV(id, face) {
  const u0 = (id / COLS);
  const u1 = (id + 1) / COLS;
  const v0 = face / 3;
  const v1 = (face + 1) / 3;
  return { u0, u1, v0, v1 };
}
