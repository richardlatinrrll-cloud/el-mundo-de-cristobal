import { AIR, isOpaque } from './blocks.js';

// El mundo tiene tamaño VARIABLE. SX/SY/SZ son bindings vivos: otros módulos que
// hacen `import { SX }` ven el valor nuevo después de aplicarWorldSize().
export let SX = 96, SY = 64, SZ = 96;
export let CHUNK = 16;

export const TAMANOS = {
  pequeno: { SX: 192, SY: 80,  SZ: 192, label: 'Pequeño' },
  mediano: { SX: 384, SY: 96,  SZ: 384, label: 'Mediano' },
  grande:  { SX: 576, SY: 112, SZ: 576, label: 'Grande' },
  gigante: { SX: 768, SY: 120, SZ: 768, label: 'Gigante' },
};

export const TIPOS = {
  llanuras:  { label: 'Llanuras',        emoji: '🌳', cielo: 0x8fc7ff },
  bosque:    { label: 'Bosque',          emoji: '🌲', cielo: 0x8fc7ff },
  montanas:  { label: 'Montañas',        emoji: '⛰️', cielo: 0xa9c7e0 },
  desierto:  { label: 'Desierto',        emoji: '🏜️', cielo: 0xffe6b0 },
  islas:     { label: 'Islas',           emoji: '🏝️', cielo: 0x8fd7ff },
  flotante:  { label: 'Islas flotantes', emoji: '☁️', cielo: 0xbfe3ff },
  plano:     { label: 'Plano (construir)', emoji: '🟩', cielo: 0x9fd4ff },
};

export function aplicarWorldSize(nombre) {
  const t = TAMANOS[nombre] || TAMANOS.pequeno;
  SX = t.SX; SY = t.SY; SZ = t.SZ;
}

// RNG determinista por semilla (mulberry32)
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class World {
  // config: { tipo, semilla, tamano, edits: {"x,y,z": id} }
  constructor(config = {}) {
    this.tipo = config.tipo || 'llanuras';
    this.semilla = (config.semilla | 0) || 12345;
    this.tamano = config.tamano || 'pequeno';
    aplicarWorldSize(this.tamano);

    this.SX = SX; this.SY = SY; this.SZ = SZ;
    this.data = new Uint8Array(SX * SY * SZ);
    this.dirtyChunks = new Set();   // "cx,cz"
    this.rnd = mulberry32(this.semilla);

    const gen = GENERADORES[this.tipo] || GENERADORES.llanuras;
    gen(this);

    // superponer lo que el jugador ya había construido
    if (config.edits) {
      for (const [k, id] of Object.entries(config.edits)) {
        const [x, y, z] = k.split(',').map(Number);
        if (this.inside(x, y, z)) this.data[this.idx(x, y, z)] = id;
      }
    }
    this.markAllDirty();
  }

  idx(x, y, z) { return (y * SZ + z) * SX + x; }
  inside(x, y, z) { return x >= 0 && y >= 0 && z >= 0 && x < SX && y < SY && z < SZ; }

  get(x, y, z) {
    if (!this.inside(x, y, z)) return y < 0 ? 13 : AIR;
    return this.data[this.idx(x, y, z)];
  }
  set(x, y, z, id) {
    if (!this.inside(x, y, z)) return false;
    this.data[this.idx(x, y, z)] = id;
    this.markDirtyAround(x, z);
    return true;
  }
  isOpaqueAt(x, y, z) { return isOpaque(this.get(x, y, z)); }

  chunkKey(cx, cz) { return cx + ',' + cz; }
  markDirtyAround(x, z) {
    const cx = (x / CHUNK) | 0, cz = (z / CHUNK) | 0;
    this.dirtyChunks.add(this.chunkKey(cx, cz));
    // si el bloque toca el borde, el chunk vecino también cambia de caras
    if (x % CHUNK === 0) this.dirtyChunks.add(this.chunkKey(cx - 1, cz));
    if (x % CHUNK === CHUNK - 1) this.dirtyChunks.add(this.chunkKey(cx + 1, cz));
    if (z % CHUNK === 0) this.dirtyChunks.add(this.chunkKey(cx, cz - 1));
    if (z % CHUNK === CHUNK - 1) this.dirtyChunks.add(this.chunkKey(cx, cz + 1));
  }
  markAllDirty() {
    this.dirtyChunks.clear();
    for (let cx = 0; cx < Math.ceil(SX / CHUNK); cx++)
      for (let cz = 0; cz < Math.ceil(SZ / CHUNK); cz++)
        this.dirtyChunks.add(this.chunkKey(cx, cz));
  }

  // primer bloque de aire sobre la superficie en (x,z)
  surfaceY(x, z) {
    for (let y = SY - 1; y >= 0; y--) {
      const b = this.get(x, y, z);
      if (b !== AIR && b !== 10) return y + 1;
    }
    return 1;
  }

  // aplana suavemente una zona de aparición que se funde con el terreno vecino
  plataformaCentral(topId = 1) {
    const cx = (SX / 2) | 0, cz = (SZ / 2) | 0;
    const R = 6;
    const baseY = this.surfaceY(cx, cz) - 1; // bloque de superficie
    for (let x = cx - R; x <= cx + R; x++)
      for (let z = cz - R; z <= cz + R; z++) {
        const d = Math.max(Math.abs(x - cx), Math.abs(z - cz));
        // altura objetivo: plano en el centro, transición hacia el terreno real en el borde
        const real = this.surfaceY(x, z) - 1;
        const t = Math.min(1, Math.max(0, (d - 2) / (R - 2)));
        const objetivo = Math.round(baseY * (1 - t) + real * t);
        for (let y = 0; y <= objetivo; y++)
          this.data[this.idx(x, y, z)] = y < objetivo - 3 ? 3 : y < objetivo ? 2 : topId;
        for (let y = objetivo + 1; y < SY; y++) {
          const cur = this.data[this.idx(x, y, z)];
          if (cur !== 10) this.data[this.idx(x, y, z)] = AIR; // deja el agua
        }
      }
    return baseY + 1;
  }
}

// ---------- ruido ----------
function hash2(x, y, s) {
  let h = (x | 0) * 374761393 + (y | 0) * 668265263 + (s | 0) * 2147483647;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function noise2(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const tl = hash2(xi, yi, s), tr = hash2(xi + 1, yi, s);
  const bl = hash2(xi, yi + 1, s), br = hash2(xi + 1, yi + 1, s);
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  return (tl + (tr - tl) * u) + ((bl + (br - bl) * u) - (tl + (tr - tl) * u)) * v;
}
function fbm(x, z, s, oct = 3) {
  let amp = 1, freq = 1, sum = 0, norm = 0;
  for (let o = 0; o < oct; o++) {
    sum += amp * (noise2(x * freq, z * freq, s + o) * 2 - 1);
    norm += amp; amp *= 0.5; freq *= 2;
  }
  return sum / norm; // ~[-1,1]
}

// ---------- árboles / cactus ----------
function ponerArbol(w, x, y, z) {
  const d = w.data;
  const trunk = 4 + ((w.rnd() * 3) | 0);
  for (let i = 1; i <= trunk; i++) if (w.inside(x, y + i, z)) d[w.idx(x, y + i, z)] = 4;
  const cy = y + trunk;
  for (let dx = -2; dx <= 2; dx++)
    for (let dz = -2; dz <= 2; dz++)
      for (let dy = 0; dy <= 2; dy++) {
        if (Math.abs(dx) + Math.abs(dz) + dy > 4) continue;
        const nx = x + dx, ny = cy + dy, nz = z + dz;
        if (w.inside(nx, ny, nz) && w.get(nx, ny, nz) === AIR) d[w.idx(nx, ny, nz)] = 5;
      }
}
function ponerCactus(w, x, y, z) {
  const h = 2 + ((w.rnd() * 3) | 0);
  for (let i = 1; i <= h; i++) if (w.inside(x, y + i, z)) w.data[w.idx(x, y + i, z)] = 12;
}
function dispersar(w, n, fn) {
  for (let t = 0; t < n; t++) {
    const x = 3 + ((w.rnd() * (SX - 6)) | 0);
    const z = 3 + ((w.rnd() * (SZ - 6)) | 0);
    if (Math.abs(x - SX / 2) < 7 && Math.abs(z - SZ / 2) < 7) continue;
    let y = SY - 1;
    while (y > 0 && w.get(x, y, z) === AIR) y--;
    fn(w, x, y, z, w.get(x, y, z));
  }
}

// ---------- generadores ----------
const GENERADORES = {
  llanuras(w) {
    const G = Math.round(SY * 0.32);
    for (let x = 0; x < SX; x++)
      for (let z = 0; z < SZ; z++) {
        const h = G + Math.round(4 * fbm(x * 0.05, z * 0.05, w.semilla, 3));
        columna(w, x, z, h, { top: 1, dirt: 3 });
        if (h < G - 1) w.data[w.idx(x, Math.max(0, h - 1), z)] = 6;
      }
    w.plataformaCentral(1);
    dispersar(w, Math.round(SX * SZ / 340), (w, x, y, z, b) => { if (b === 1) ponerArbol(w, x, y, z); });
  },

  bosque(w) {
    const G = Math.round(SY * 0.30);
    for (let x = 0; x < SX; x++)
      for (let z = 0; z < SZ; z++) {
        const h = G + Math.round(3 * fbm(x * 0.04, z * 0.04, w.semilla, 2));
        columna(w, x, z, h, { top: 1, dirt: 3 });
      }
    w.plataformaCentral(1);
    dispersar(w, Math.round(SX * SZ / 90), (w, x, y, z, b) => { if (b === 1) ponerArbol(w, x, y, z); });
  },

  montanas(w) {
    const G = Math.round(SY * 0.26);
    const nieve = Math.round(SY * 0.62);
    for (let x = 0; x < SX; x++)
      for (let z = 0; z < SZ; z++) {
        const ridge = 1 - Math.abs(fbm(x * 0.028, z * 0.028, w.semilla, 4));   // crestas
        const detalle = 0.5 + 0.5 * fbm(x * 0.08, z * 0.08, w.semilla + 3, 3);
        let h = G + Math.round((SY * 0.6) * Math.pow(ridge, 1.6) * detalle);
        h = Math.min(SY - 2, Math.max(G - 3, h));
        for (let y = 0; y < SY; y++) {
          let id = AIR;
          if (y < h - 3) id = 3;
          else if (y < h) id = h > nieve ? 3 : 2;
          if (y === h - 1 && h <= nieve) id = 1;
          if (y === h - 1 && h > nieve) id = 11;
          if (id) w.data[w.idx(x, y, z)] = id;
        }
      }
    w.plataformaCentral(1);
    dispersar(w, Math.round(SX * SZ / 500), (w, x, y, z, b) => { if (b === 1) ponerArbol(w, x, y, z); });
  },

  desierto(w) {
    const G = Math.round(SY * 0.33);
    for (let x = 0; x < SX; x++)
      for (let z = 0; z < SZ; z++) {
        const h = G + Math.round(5 * fbm(x * 0.03, z * 0.03, w.semilla, 3));
        for (let y = 0; y < SY; y++) {
          let id = AIR;
          if (y < h - 4) id = 3;
          else if (y < h) id = 6;
          if (id) w.data[w.idx(x, y, z)] = id;
        }
      }
    w.plataformaCentral(6);
    dispersar(w, Math.round(SX * SZ / 260), (w, x, y, z, b) => { if (b === 6) ponerCactus(w, x, y, z); });
  },

  islas(w) {
    const mar = Math.round(SY * 0.34);
    for (let x = 0; x < SX; x++)
      for (let z = 0; z < SZ; z++) {
        const n = fbm(x * 0.045, z * 0.045, w.semilla, 4);
        const h = mar + Math.round(n * 12);
        for (let y = 0; y < SY; y++) {
          let id = AIR;
          if (y < h - 3) id = 3;
          else if (y < h - 1) id = 2;
          else if (y < h) id = h > mar + 1 ? 1 : 6;
          else if (y < mar) id = 10;         // agua hasta el nivel del mar
          if (id) w.data[w.idx(x, y, z)] = id;
        }
      }
    const platY = w.plataformaCentral(1);
    // rodear la plataforma de agua si quedó bajo el mar
    dispersar(w, Math.round(SX * SZ / 400), (w, x, y, z, b) => { if (b === 1) ponerArbol(w, x, y, z); });
  },

  flotante(w) {
    const base = Math.round(SY * 0.5);
    for (let x = 0; x < SX; x++)
      for (let z = 0; z < SZ; z++) {
        const n = fbm(x * 0.055, z * 0.055, w.semilla, 3);
        const n2 = fbm(x * 0.11 + 5, z * 0.11 - 3, w.semilla + 7, 2);
        if (n > 0.30) {
          const cy = base + Math.round(n2 * 14);
          const grosor = 2 + Math.round((n - 0.30) * 8);
          for (let y = cy - grosor; y <= cy; y++) {
            if (!w.inside(x, y, z)) continue;
            w.data[w.idx(x, y, z)] = y === cy ? 1 : (y > cy - 2 ? 2 : 3);
          }
        }
      }
    // isla flotante garantizada en el centro (con vacío alrededor)
    const cx = (SX / 2) | 0, cz = (SZ / 2) | 0, py = base + 2;
    for (let x = cx - 7; x <= cx + 7; x++)
      for (let z = cz - 7; z <= cz + 7; z++) {
        const d = Math.max(Math.abs(x - cx), Math.abs(z - cz));
        for (let y = 0; y < SY; y++) if (w.inside(x, y, z)) w.data[w.idx(x, y, z)] = AIR;
        if (d <= 5) {
          const prof = 3 - Math.max(0, d - 3);
          for (let y = py - prof; y <= py; y++)
            if (w.inside(x, y, z)) w.data[w.idx(x, y, z)] = y === py ? 1 : (y > py - 2 ? 2 : 3);
        }
      }
    dispersar(w, Math.round(SX * SZ / 300), (w, x, y, z, b) => { if (b === 1) ponerArbol(w, x, y, z); });
  },

  plano(w) {
    const G = Math.round(SY * 0.28);
    for (let x = 0; x < SX; x++)
      for (let z = 0; z < SZ; z++) {
        for (let y = 0; y < G; y++)
          w.data[w.idx(x, y, z)] = y < G - 3 ? 3 : y < G - 1 ? 2 : 1;
      }
  },
};

function columna(w, x, z, h, { top, dirt }) {
  h = Math.max(2, Math.min(SY - 2, h));
  for (let y = 0; y < SY; y++) {
    let id = AIR;
    if (y < h - 4) id = 3;
    else if (y < h - 1) id = 2;
    else if (y < h) id = top;
    if (id) w.data[w.idx(x, y, z)] = id;
  }
}
